/**
 * POST /.netlify/functions/suggest-campaigns-background   { jobId, locationId, month?: 'YYYY-MM' }
 *
 * Takes a minute or two, so the result goes to copy_jobs under jobId and the
 * page polls copy-callback?jobId=… for it. The -background name is what lets
 * netlify dev run it past its 30s limit; on Vercel the router allows 300s.
 *
 * Four bi-weekly newsletter suggestions for one active client, with the
 * analysis behind them. Email history comes from the agency data platform
 * (PLATFORM_SUPABASE_*), which this app only ever reads. PMS and Meta are
 * deliberately left out of this version.
 *
 * Every figure shown to the user is computed here from the client's own sends.
 * Claude cites sends by id and the numbers are filled back in server-side, so
 * a statistic in the output can never be one the model made up.
 */
import Anthropic from '@anthropic-ai/sdk'
import { withAuth } from './_auth.js'
import { fetchCopyBrief } from './_wfSources.js'

const MODEL = 'claude-opus-5-5'
const CATEGORIES = ['Social Proof', 'Experience / Lifestyle', 'Seasonal Atmosphere', 'Local Guide', 'Amenity Spotlight',
  'Audience-Specific', 'Educational', 'Visual-First', 'Host / Brand Voice', 'Planning & Imagination',
  'Holiday / Date Promotion', 'Availability / Booking Window', 'Approved Offer']

const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

async function rest(base, key, path) {
  const res = await fetch(`${base}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
  if (!res.ok) throw new Error(`Data read failed (${res.status}): ${(await res.text()).slice(0, 200)}`)
  return res.json()
}
const app      = (path) => rest(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, path)
const platform = (path) => rest(process.env.PLATFORM_SUPABASE_URL, process.env.PLATFORM_SUPABASE_SERVICE_KEY, path)

/* ── dates ─────────────────────────────────────────────────────────────── */

const iso = (d) => d.toISOString().slice(0, 10)
const utc = (y, m, d) => new Date(Date.UTC(y, m, d))
function nthWeekday(y, m, dow, n) {
  if (n > 0) { const first = utc(y, m, 1); return utc(y, m, 1 + ((dow - first.getUTCDay() + 7) % 7) + (n - 1) * 7) }
  const last = utc(y, m + 1, 0); return utc(y, m, last.getUTCDate() - ((last.getUTCDay() - dow + 7) % 7))
}
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1
  return utc(y, month - 1, day)
}
function holidaysBetween(from, to) {
  const out = []
  for (let y = from.getUTCFullYear(); y <= to.getUTCFullYear(); y++) {
    out.push(
      ['New Year’s Day', utc(y, 0, 1), 'US/CA'], ['MLK Day long weekend', nthWeekday(y, 0, 1, 3), 'US'],
      ['Valentine’s Day', utc(y, 1, 14), 'US/CA'], ['Presidents’ Day long weekend', nthWeekday(y, 1, 1, 3), 'US'],
      ['Family Day long weekend', nthWeekday(y, 1, 1, 3), 'CA'], ['St. Patrick’s Day', utc(y, 2, 17), 'US/CA'],
      ['Easter Sunday', easter(y), 'US/CA'], ['Mother’s Day', nthWeekday(y, 4, 0, 2), 'US/CA'],
      // The Monday before May 25; May's last Monday always falls on the 25th-31st.
      ['Victoria Day long weekend', utc(y, 4, nthWeekday(y, 4, 1, -1).getUTCDate() - 7), 'CA'],
      ['Memorial Day long weekend', nthWeekday(y, 4, 1, -1), 'US'], ['Father’s Day', nthWeekday(y, 5, 0, 3), 'US/CA'],
      ['Canada Day', utc(y, 6, 1), 'CA'], ['Independence Day', utc(y, 6, 4), 'US'],
      ['Labor Day long weekend', nthWeekday(y, 8, 1, 1), 'US/CA'], ['Canadian Thanksgiving', nthWeekday(y, 9, 1, 2), 'CA'],
      ['Columbus / Indigenous Peoples’ Day long weekend', nthWeekday(y, 9, 1, 2), 'US'], ['Halloween', utc(y, 9, 31), 'US/CA'],
      ['Veterans Day', utc(y, 10, 11), 'US'], ['US Thanksgiving', nthWeekday(y, 10, 4, 4), 'US'],
      ['Christmas', utc(y, 11, 25), 'US/CA'], ['New Year’s Eve', utc(y, 11, 31), 'US/CA'],
    )
  }
  return out.filter(([, d]) => d >= from && d <= to).sort((a, b) => a[1] - b[1])
    .map(([name, d, where]) => `${iso(d)} (${d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })}) ${name} [${where}]`)
}

/* ── send history ──────────────────────────────────────────────────────── */

const median = (xs) => {
  const s = xs.filter(Number.isFinite).sort((a, b) => a - b)
  if (!s.length) return null
  const m = Math.floor(s.length / 2)
  return +(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2).toFixed(2)
}
const mean = (xs) => { const s = xs.filter(Number.isFinite); return s.length ? +(s.reduce((a, b) => a + b, 0) / s.length).toFixed(2) : null }
const segmentOf = (name) => (name || '').match(/\((RE|AC)\b|[\s-](RE|AC)\s*$/i)?.slice(1).find(Boolean)?.toUpperCase() || ''

async function loadSends(locationId, since) {
  const rows = await platform(
    `ghl_email_campaigns?select=date_sent,campaign_name,subject_line,audience_size,delivered,opened,clicked,open_rate,ctr,ctor,unsubscribe_rate`
    + `&location_id=eq.${encodeURIComponent(locationId)}&date_sent=gte.${since}&order=date_sent.desc&limit=1000`)
  return rows.filter(r => r.date_sent && (r.delivered || 0) > 0).map((r, i) => ({
    id: `S${i + 1}`, date: r.date_sent, name: r.campaign_name || '', subject: r.subject_line || '',
    segment: segmentOf(r.campaign_name), audience: r.audience_size, delivered: r.delivered, clicked: r.clicked,
    openRate: r.open_rate, ctr: r.ctr, ctor: r.ctor, unsub: r.unsubscribe_rate,
  }))
}

function summarise(sends, today) {
  const yearAgo = iso(utc(today.getUTCFullYear() - 1, today.getUTCMonth(), today.getUTCDate()))
  const recent  = sends.filter(s => s.date >= yearAgo)
  const base    = recent.length >= 6 ? recent : sends
  const baseline = { window: base === recent ? 'last 12 months' : 'all history', sends: base.length,
    medianCtr: median(base.map(s => s.ctr)), medianCtor: median(base.map(s => s.ctor)), medianOpenRate: median(base.map(s => s.openRate)) }
  const months = {}
  for (const s of sends) (months[s.date.slice(0, 7)] ||= []).push(s)
  const byMonth = Object.entries(months).sort(([a], [b]) => b.localeCompare(a)).map(([month, xs]) => ({
    month, sends: xs.length, avgCtr: mean(xs.map(s => s.ctr)), avgCtor: mean(xs.map(s => s.ctor)),
  }))
  return { baseline, byMonth, firstSend: sends.at(-1)?.date || null, lastSend: sends[0]?.date || null, total: sends.length }
}

/* ── prompt ────────────────────────────────────────────────────────────── */

const SYSTEM = `You are HiddenGem Media's email campaign strategist. HiddenGem sends each vacation rental client a newsletter every two weeks. You suggest themes for ONE client, based on that client's own data. Never fall back to a theme every client would get; a theme is right only if this client's data points to it.

<data_you_have>
- The client's email send history from GoHighLevel: send date, campaign name, subject line, audience size, CTR, CTOR. Each send has an id (S1, S2, ...). S1 is the most recent.
- Server-computed figures: this client's baseline (median CTR and CTOR) and a month-by-month table.
- The client's copy brief (property type, sleeps, guest profile, amenities, location, approved offers), when one exists.
- What is already on HiddenGem's content calendar for this client.
- Upcoming holidays with exact dates, marked [US], [CA] or [US/CA].
</data_you_have>

<data_you_do_not_have>
This version has no PMS (occupancy, availability, lead time) and no Meta data. So:
- Never claim availability, scarcity or pace: no "dates are going fast", "only a few weekends left", "filling up". You cannot know it.
- DIRECT emails may name a holiday, a stay period or an approved offer, and invite the reader to check availability. They never say what is or isn't booked.
- Booking window: use the audience-type benchmark (below) to decide how far ahead to promote, and say so.
- Confidence is Medium at most. Low when the client has fewer than 6 sends or no brief.
</data_you_do_not_have>

<reading_the_numbers>
- Rank on CTR and CTOR. Ignore open rate for ranking: Apple Mail Privacy inflates it.
- Campaign names ending (RE) or (AC) appear to be different audience segments: they come with very different audience sizes. CTR is not comparable across a large and a small audience, so compare CTOR across segments, and CTR only within one segment.
- HiddenGem's absolute bar is CTR under 1.5% or CTOR under 3% = underperforming. Many clients sit under that bar on most sends, so also judge each send against this client's own median: a send well above the client's median is a winner for this client even if it is under the absolute bar. Say which yardstick you used.
- Classify every past send you use: DIRECT (promotes specific dates, a holiday, availability or an offer) or INDIRECT (builds desire or trust without dates), and a category, from its campaign name and subject line. The campaign name often says Direct or Indirect outright; trust that.
- Look for patterns, not single sends: which categories, angles, subject-line styles (question, curiosity, benefit, emoji) and holidays beat this client's median, and which fell under it. Look specifically at what this client sent in the target month and the month after in previous years and how it did.
</reading_the_numbers>

<choosing>
1. Calendar first: which holidays and seasonal moments fall inside the booking window for this audience type, for this client's location. Only holidays that matter where the client's guests are: a US property gets US Thanksgiving, a Canadian one gets Canadian Thanksgiving.
2. Season by place. Use the client's location from the brief. Only use seasonal imagery that region actually has: no fall foliage or snow for a Gulf coast beach property, no beach-weather angle for a mountain cabin in November. If the brief gives no location, say so and keep seasonal claims generic.
3. Angle from what works for this client: lean on the categories and hooks above their median, avoid the ones below it.
4. Rhythm: no more than 2 DIRECT in a row (count the client's last sends), no category repeated from their last 3 sends, about a 50/50 DIRECT/INDIRECT mix unless this client's INDIRECT or DIRECT sends clearly earn more clicks.
5. A newsletter theme, not a revenue strategy: no rate, minimum-stay or discount recommendations. Mention an offer only if the brief says it is approved. One core message per email. Only themes the team can build from photos, the brief and reviews. Same email to the full list.
6. Don't duplicate anything already on the content calendar for this client in the target month.
</choosing>

<audience_benchmarks>
Classify the client by who books, from the brief (sleeps, guest profile).
- Couples / Small Stays (sleeps 2-4): book 2-8 weeks out. Romance, rest and reset, midweek, hot tub / fireplace / view, date night, local food. Holidays: Valentine's, long weekends, fall colour, NYE.
- Families / Mid-Size (sleeps 5-10): book 1-3 months out. School breaks, summer, traditions, space, kid-friendly, multi-generational. Holidays: Spring Break, summer, long weekends, Thanksgiving, Christmas.
- Large Groups (sleeps 11+): book 3-9 months out. Reunions, retreats, holiday hosting, everyone under one roof. Holidays: Thanksgiving, Christmas, NYE, summer weeks, Labor Day / Canada Day.
These are fallbacks. Where this client's own sends show a different angle works, follow the sends.
</audience_benchmarks>

<output>
Four suggestions for the target month: two for the first send (1st-15th) and two for the second send (16th-end). In each slot, rank 1 is the Primary and rank 2 the Backup; they take genuinely different angles or categories. The two Primaries together must pass the rhythm rules with the client's recent sends.
- title: a short internal campaign name.
- hook: one sentence, the email's single idea.
- calendarAnchor: the date or moment the email hangs on.
- priority: High only for a DIRECT email tied to a holiday or peak date inside the booking window; Medium for a DIRECT seasonal planning email; Low for INDIRECT.
- stayDatesPromoted: for DIRECT, the stay period or holiday dates being promoted; for INDIRECT, "None (inspiration)".
- whyNow: 2-3 sentences. The timing logic: the holiday or season, the booking-window benchmark, and the rhythm reason.
- whatsWorking: 1-2 sentences naming the past sends behind the angle, by what they were (not by id) and how they did against the client's median.
- evidence: the ids of 1-4 past sends that support this suggestion. Use only ids from the send list.
- subjectLine: 28-40 characters, at most one emoji and only at the end. previewText: up to 90 characters, adds to the subject rather than repeating it.
- cta: "Check Availability" (default), "Book Your Stay" (never in this version: it needs real scarcity) or "Plan Your Getaway" (inspiration).
- confidenceNote: one sentence on what limits confidence.
- expires: the last date (YYYY-MM-DD) the idea still makes sense to send.

analysis is the thinking an account manager reads before the suggestions: what this client's history says, in plain language they can check in 30 seconds. Refer to sends by what they were and give their CTR/CTOR from the data; put the ids in the evidence arrays.

Brand defaults: warm, low-pressure, host-to-guest. No em dashes or en dashes anywhere. Never invent a number: every figure you write must be in the data you were given.
</output>`

const strArr = { type: 'array', items: { type: 'string' } }
const finding = { type: 'object', additionalProperties: false, required: ['insight', 'evidence'], properties: { insight: { type: 'string' }, evidence: strArr } }
const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['analysis', 'suggestions'],
  properties: {
    analysis: {
      type: 'object', additionalProperties: false,
      required: ['summary', 'audienceType', 'audienceReason', 'yardstick', 'whatsWorking', 'whatsNotWorking', 'seasonalHistory', 'recentSends', 'rhythmNote', 'directVsIndirect', 'dataGaps'],
      properties: {
        summary: { type: 'string' },
        audienceType: { type: 'string', enum: ['Couples / Small Stays', 'Families / Mid-Size Groups', 'Large Groups', 'Mixed / Unclear'] },
        audienceReason: { type: 'string' },
        yardstick: { type: 'string' },
        whatsWorking: { type: 'array', items: finding },
        whatsNotWorking: { type: 'array', items: finding },
        seasonalHistory: finding,
        recentSends: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'type', 'category'],
          properties: { id: { type: 'string' }, type: { type: 'string', enum: ['DIRECT', 'INDIRECT'] }, category: { type: 'string' } } } },
        rhythmNote: { type: 'string' },
        directVsIndirect: { type: 'string' },
        dataGaps: strArr,
      },
    },
    suggestions: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['slot', 'rank', 'title', 'type', 'category', 'priority', 'hook', 'calendarAnchor', 'stayDatesPromoted', 'whyNow', 'whatsWorking', 'evidence', 'subjectLine', 'previewText', 'cta', 'confidence', 'confidenceNote', 'expires'],
        properties: {
          slot: { type: 'string', enum: ['first', 'second'] },
          rank: { type: 'integer', enum: [1, 2] },
          title: { type: 'string' }, type: { type: 'string', enum: ['DIRECT', 'INDIRECT'] },
          category: { type: 'string', enum: CATEGORIES }, priority: { type: 'string', enum: ['High', 'Medium', 'Low'] },
          hook: { type: 'string' }, calendarAnchor: { type: 'string' }, stayDatesPromoted: { type: 'string' },
          whyNow: { type: 'string' }, whatsWorking: { type: 'string' }, evidence: strArr,
          subjectLine: { type: 'string' }, previewText: { type: 'string' },
          cta: { type: 'string', enum: ['Check Availability', 'Book Your Stay', 'Plan Your Getaway'] },
          confidence: { type: 'string', enum: ['High', 'Medium', 'Low'] }, confidenceNote: { type: 'string' },
          expires: { type: 'string' },
        },
      },
    },
  },
}

const clean = (v) => typeof v === 'string' ? v.replace(/\s*[—]\s*/g, ', ').replace(/–/g, '-')
  : Array.isArray(v) ? v.map(clean) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x)])) : v

const sendLine = (s) => [s.id, s.date, s.segment || '-', s.audience ?? '', s.ctr ?? '', s.ctor ?? '', s.name, s.subject].join('\t')

/* ── handler ───────────────────────────────────────────────────────────── */

async function storeJob(jobId, result) {
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/copy_jobs`, {
    method: 'POST',
    headers: { apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ job_id: jobId, result }),
  })
  if (!res.ok) console.error('[suggest-campaigns] copy_jobs write failed', res.status, await res.text())
}

const rawHandler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' })
  let body
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Invalid JSON' }) }
  const { jobId, locationId } = body
  if (!jobId || !/^[\w-]{8,64}$/.test(jobId)) return json(400, { error: 'jobId is required' })
  if (!locationId) return json(400, { error: 'locationId is required' })

  try {
    const suggestions = await generate(locationId, body.month)
    await storeJob(jobId, { status: 'done', suggestions })
    return json(200, { ok: true })
  } catch (err) {
    console.error('[suggest-campaigns]', err)
    await storeJob(jobId, { status: 'error', error: err.message })
    return json(500, { error: err.message })
  }
}

async function generate(locationId, month) {
  if (!process.env.PLATFORM_SUPABASE_URL || !process.env.PLATFORM_SUPABASE_SERVICE_KEY) throw new Error('PLATFORM_SUPABASE_URL / PLATFORM_SUPABASE_SERVICE_KEY are not set')
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set')

  const today = new Date()
  const [ty, tm] = (/^\d{4}-\d{2}$/.test(month || '') ? month : iso(today).slice(0, 7)).split('-').map(Number)
  const monthStart = utc(ty, tm - 1, 1), monthEnd = utc(ty, tm, 0)
  const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })

  {
    const [client] = await app(`Email_Client_API?select=client_name,location_id,is_active&location_id=eq.${encodeURIComponent(locationId)}`)
    if (!client) throw new Error('Client not found')
    if (!client.is_active) throw new Error(`${client.client_name} is not marked active`)
    const name = client.client_name

    const since = iso(utc(today.getUTCFullYear() - 2, today.getUTCMonth(), 1))
    const [sends, calendar, brief] = await Promise.all([
      loadSends(locationId, since),
      app(`${encodeURIComponent('Email Content Calendar')}?select=subject,theme,campaign_type,send_month,calendar_date,idea_status,entry_status&client_name=eq.${encodeURIComponent(name)}&order=id.desc&limit=60`).catch(() => []),
      fetchCopyBrief(name).catch(err => ({ error: err.message })),
    ])
    const stats = summarise(sends, today)
    const holidays = holidaysBetween(monthStart, utc(ty, tm + 8, 0))

    const content = [
      `Today: ${iso(today)}. Target month: ${monthLabel}. First send covers ${iso(monthStart)} to ${iso(utc(ty, tm - 1, 15))}; second send ${iso(utc(ty, tm - 1, 16))} to ${iso(monthEnd)}.`,
      `Client: ${name}`,
      brief.text ? `<copy_brief>\n${brief.text.slice(0, 14000)}\n</copy_brief>` : `<copy_brief>None available (${brief.error}).</copy_brief>`,
      `<baseline>${JSON.stringify(stats.baseline)}</baseline>`,
      `<month_by_month>\n${stats.byMonth.map(m => `${m.month}\t${m.sends} sends\tavg CTR ${m.avgCtr}%\tavg CTOR ${m.avgCtor}%`).join('\n')}\n</month_by_month>`,
      `<sends count="${sends.length}">\nid\tdate\tsegment\taudience\tCTR%\tCTOR%\tcampaign name\tsubject line\n${sends.slice(0, 200).map(sendLine).join('\n')}\n</sends>`,
      `<content_calendar>\n${calendar.map(c => [c.calendar_date || c.send_month || '', c.idea_status || c.entry_status || '', c.campaign_type || '', c.subject || c.theme || ''].join('\t')).join('\n') || 'Nothing on the calendar.'}\n</content_calendar>`,
      `<upcoming_holidays>\n${holidays.join('\n')}\n</upcoming_holidays>`,
    ].join('\n\n')

    const anthropic = new Anthropic()
    const stream = anthropic.beta.messages.stream({
      model: MODEL, max_tokens: 32000,
      betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content }],
    })
    const msg = await stream.finalMessage()
    if (msg.stop_reason === 'max_tokens') throw new Error('Claude ran out of room before finishing the suggestions.')
    const out = clean(JSON.parse(msg.content.filter(b => b.type === 'text').map(b => b.text).join('')))

    const byId = Object.fromEntries(sends.map(s => [s.id, s]))
    const cite = (ids) => (ids || []).map(id => byId[id]).filter(Boolean)
      .map(({ date, name, subject, segment, audience, ctr, ctor }) => ({ date, name, subject, segment, audience, ctr, ctor }))
    const a = out.analysis
    const analysis = {
      ...a,
      whatsWorking:    a.whatsWorking.map(f => ({ insight: f.insight, evidence: cite(f.evidence) })),
      whatsNotWorking: a.whatsNotWorking.map(f => ({ insight: f.insight, evidence: cite(f.evidence) })),
      seasonalHistory: { insight: a.seasonalHistory.insight, evidence: cite(a.seasonalHistory.evidence) },
      recentSends: a.recentSends.filter(r => byId[r.id]).map(r => ({ ...cite([r.id])[0], type: r.type, category: r.category })),
    }
    const suggestions = out.suggestions
      .sort((x, y) => (x.slot === y.slot ? x.rank - y.rank : x.slot === 'first' ? -1 : 1))
      .map(s => ({ ...s, evidence: cite(s.evidence), subjectLength: [...s.subjectLine].length }))

    return {
      client: name, month: `${ty}-${String(tm).padStart(2, '0')}`, monthLabel, dataPulled: new Date().toISOString(),
      stats: { ...stats.baseline, totalSends: stats.total, firstSend: stats.firstSend, lastSend: stats.lastSend, byMonth: stats.byMonth.slice(0, 24) },
      briefFound: Boolean(brief.text), analysis, suggestions,
    }
  }
}

export const handler = withAuth(rawHandler)
