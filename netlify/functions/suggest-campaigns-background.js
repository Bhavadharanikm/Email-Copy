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
import { fetchGoogleDocText } from './_wfSources.js'
import { bearerOf, saveSuggestionSet, listSuggestionSets, feedbackForClient } from './_suggestionsStore.js'
import { loadPms, pmsInsights, bookingsAfterSends } from './_pmsInsights.js'

const MODEL = 'claude-opus-5-5'
/* The doc's ten INDIRECT categories, plus three for DIRECT sends, which the doc does not name. */
/* The doc's INDIRECT categories less Amenity Spotlight, plus two for DIRECT
   sends, which the doc does not name. No offer category: HiddenGem does not
   want discounts suggested at all. */
const CATEGORIES = ['Social Proof', 'Experience / Lifestyle', 'Seasonal Atmosphere', 'Local Guide',
  'Audience-Specific', 'Educational', 'Visual-First', 'Host / Brand Voice', 'Planning & Imagination',
  'Holiday / Date Promotion', 'Availability / Booking Window']

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
    .map(([name, d, where]) => ({ name, date: iso(d), where, line: `${iso(d)} (${d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })}) ${name} [${where}]` }))
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
  /* Under 50 delivered is a one-off (an inquiry reply, a test), not a newsletter,
     and its 0% would drag the client's medians down. */
  return rows.filter(r => r.date_sent && (r.delivered || 0) >= 50).map((r, i) => ({
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

/* The brain is Pooja's Google Doc, read fresh on every run so an edit to the
   doc is the next run's instructions. Nothing here restates its rules; these
   notes only say what data this run has and what shape the answer takes. */
const BRAIN_DOC_ID = '1JAaahw5qDvZ-Rmgz19Pe38lSVxA_J8g05XTYfPMi-is'

const RUN_NOTES = `<this_run>
The document above is your brain: follow it. These notes do not change its rules. They say what data this run has, and the shape of the answer.

Data in this run, for ONE client:
- Email send history from GoHighLevel: date, campaign name, subject line, audience size, CTR, CTOR. Each send has an id (S1 is the most recent).
- Server-computed figures: the client's baseline (median CTR and CTOR) and a month-by-month table.
- What is already on HiddenGem's content calendar for this client.
- Upcoming holidays with exact dates, marked [US], [CA] or [US/CA].
- PMS figures computed from the client's bookings (<pms>), when the client has a PMS connected: occupancy on the books and same time last year (STLY) for 0-30, 31-60, 61-90 and 91-180 days, the final occupancy those windows reached last year, median booking lead time (last 12 months and by stay month), monthly occupancy with the client's own Peak / Shoulder / Low months (seasons: each calendar month averaged over up to 24 months, ranked into thirds as Section 5 says), how full each upcoming holiday was last year against the same weekdays around it (holidayHistory), the booking window already worked out as Step 1 says (bookingWindow), how much of the business is open each weekend in the next 60 days, how much is open on each upcoming holiday, party size, and where the properties are. Owner blocks count as unsellable, not booked. All of it is for the client as a whole business. If <pms> says unavailable, the client has no usable PMS data.

HiddenGem's standing rules. They override the document wherever the two differ:
- One business, never one property. Read the client as a whole, and never name, single out or compare individual properties in any field (this replaces the document's multi-property rule).
- No discounts or offers of any kind: no codes, no percent or dollar off, no free nights, no giveaways, no "deal" or "sale" angle, even when the brief approves an offer and even when past offer emails did well. Never build a theme, hook, subject line or preview text around one.
- No Meta data. HiddenGem does not use it for suggestions: ignore every mention of Meta in the document, never list it as missing, and never lower confidence because of it.
- No client brief. It is not used for suggestions: ignore the document's brief references, never list it as missing, classify the audience type from PMS party size, and never lower confidence because of it.
- No amenity-led emails. Never build a theme, hook, subject line or preview text around a particular amenity or facility (hot tub, fire pit, pool, sauna, a named lodge or cabin feature). The theme is the season, the occasion, the trip, the people or the place, not a feature of the property.

Not in this run: the HiddenGem Promotional Marketing Calendar, and PMS data when <pms> says unavailable. Apply the document's Missing Data rule for PMS and email data only and set confidence as the document says. Use the PMS figures exactly as given: any scarcity or availability claim must match them, and when there is no PMS data never claim scarcity or pace and never use the Book Your Stay CTA.

Timing is the point of these suggestions. Lead time decides when a theme should go out: a theme selling stays that start on a date should reach the list about one lead time before it. For every suggestion give targetStayStart, the first night of the stays or season it sells (for INDIRECT, the start of the season it builds desire for), and holiday: the exact name from <upcoming_holidays> when the email is about that holiday, otherwise "none". Holiday stays have their own lead times in <pms> holidayLeadTimes, often longer than the year's average; the server uses them for holiday emails. The server works out from it whether this send is on time, too late (should go out earlier) or too early (should wait), so choose themes whose timing fits each send, and never one whose stays have already started.

Look ahead. The month an email is sent is not the month it sells. Set the booking window as Step 1 says. When <pms> has bookingWindow, it is Step 1 already done: use its leadTimeDays and promoteThrough exactly, and quote its basis and reason in bookingWindow; do not recompute it. Only with no PMS data, apply Step 1 yourself with the audience benchmark. For example, with benchmark lead times a couples property sent in October is promoting November and December stays; a large group property sent in October may be promoting the holidays and spring or summer next year. Stay dates promoted, calendar anchors and seasonal imagery belong to the stays inside that window, not to the send month: do not lead an October send with fall foliage unless fall stays are still inside the window. INDIRECT emails also build desire for the season the client is selling next. Say the window in bookingWindow.

Reading this client's history (on top of the document's own thresholds):
- Rank angles on CTR and CTOR. Open rate is inflated by Apple Mail Privacy, so never treat it as a true read rate; but between subject lines sent to the same segment around the same time, a clearly higher open rate is still a fair signal of which subject-line style earns the open. Use it that way when you write subjectLine, and name the subject lines it came from.
- Bookings after a send: each send carries the bookings the client took in the 14 days from the send date (one bi-weekly cycle), and the client's usual bookings per 14 days (from the 28 days before). This is timing, not proof the email caused them: sends within two weeks of each other share the same bookings, and a holiday or an ad can lift bookings too. Use it as a second signal beside CTR and CTOR, especially to see which themes and holidays were followed by bookings last year, and say "followed by" rather than "drove". Blank means no PMS data or too recent.
- Theme from the same season last year. <same_season_last_year> lists what this client sent in the target month and the two months after it, one and two years ago, with how each did. The theme of each suggestion comes from there, checked against the PMS figures: what was sent at this time of year, which of those themes earned clicks and bookings, and what the bookings say the business needs now. Sends from other months may only inform style (subject-line form, length, question or statement, emoji), never the theme; when you cite one, its role is style. If <same_season_last_year> is empty because the client's history is too short, say so in dataGaps and take the theme from the PMS figures and the document's seasonal guidance.
- Campaign names ending (RE) went to Recent Engagers and (AC) to All Contacts, per the document's Audience rule. The lists differ a lot in size, so compare CTOR across them and CTR only within one.
- Many clients sit under the document's 1.5% CTR / 3% CTOR bar on most sends, so also judge each send against this client's own median and say which yardstick you used.
- Classify each past send you use as DIRECT or INDIRECT and give it a category, from its campaign name and subject line. The name often says Direct or Indirect outright; trust that.
- Look for patterns rather than single sends: which categories, angles, subject-line styles and holidays beat this client's median and which fell under it, and how the client's sends did in the months now inside the booking window in previous years.
- Before leaning on a holiday, check holidayHistory: a holiday that ran clearly above the weekdays around it last year is one guests book around; one that ran level or below is not, whatever the calendar says. Say which.
- Use where the properties are (<pms> locations) for which holidays and which seasonal imagery apply. With no PMS data, keep seasonal claims to what the client's own sends show.
- Don't duplicate anything already on the content calendar for this client.
- <team_feedback> is HiddenGem's own ratings (1 to 5) and notes on earlier suggestions for this client, newest first, with feedback on the target month first. It is the team's judgement of whether the suggestions were the right call, so it outranks your own reading of the data wherever the two disagree, short of inventing numbers or breaking the document's accuracy rules. Do what the notes ask. Keep what was rated 4 or 5 working for you and steer away from what was rated 1 or 2. Never repeat a suggestion the team rated low or criticised. In analysis.feedbackActedOn, say in one or two lines what feedback you acted on and how, or that there was none.
- <planned_sends> lists the Primaries already planned for the months between now and the target month, oldest first. They will go out before this month's sends, so count them as this client's most recent sends in the rhythm checks (DIRECT in a row, categories in the last 3 sends), after the real send history, and don't repeat their themes.

Shape of the answer: one suggestion per send, so exactly two: slot first (the send between the 1st and the 15th) and slot second (the 16th to the end of the month), both with rank 1. No backups. Each is the single best call for that send, and the two together pass the rhythm checks with the client's recent sends.
- reasoning: the one thing the account manager reads, so it carries the whole case: two or three plain sentences on why this theme, why at this time, and which of the client's numbers decided it (pace, lead time, what this send did last year). No jargon, no ids, no restating the title.
- targetStayStart: YYYY-MM-DD. holiday: a name from <upcoming_holidays>, or "none".
- bookingWindow: never empty. The lead time used, where it came from, and the last stay date being promoted.
- evidence: ids of 1-4 past sends behind the suggestion, from the send list only, same-season sends first. The figures are filled in from the data, so never type a figure you were not given.
- whatsWorking names those sends by what they were, not by id.
- previewText: up to 90 characters, adding to the subject line rather than repeating it.
- expires: YYYY-MM-DD.
analysis is what an account manager reads first, so keep it short: summary in at most three sentences, at most three points each in whatsWorking and whatsNotWorking, recentSends only the last three sends, dataGaps only real gaps that change the call (at most three), and every other field one or two sentences. Plain language they can check in 30 seconds, with the ids of the sends behind each point in its evidence.
</this_run>`

const strArr = { type: 'array', items: { type: 'string' } }
const finding = { type: 'object', additionalProperties: false, required: ['insight', 'evidence'], properties: { insight: { type: 'string' }, evidence: strArr } }
const SUGGESTION = {
  type: 'object', additionalProperties: false,
  required: ['slot', 'rank', 'title', 'type', 'category', 'priority', 'reasoning', 'hook', 'calendarAnchor', 'targetStayStart', 'holiday', 'bookingWindow', 'stayDatesPromoted', 'whyNow', 'whatsWorking', 'evidence', 'subjectLine', 'previewText', 'cta', 'confidence', 'confidenceNote', 'expires'],
  properties: {
    slot: { type: 'string', enum: ['first', 'second'] },
    rank: { type: 'integer', enum: [1] },
    title: { type: 'string' }, reasoning: { type: 'string' }, type: { type: 'string', enum: ['DIRECT', 'INDIRECT'] },
    category: { type: 'string', enum: CATEGORIES }, priority: { type: 'string', enum: ['High', 'Medium', 'Low'] },
    hook: { type: 'string' }, calendarAnchor: { type: 'string' }, targetStayStart: { type: 'string' }, holiday: { type: 'string' }, bookingWindow: { type: 'string' }, stayDatesPromoted: { type: 'string' },
    whyNow: { type: 'string' }, whatsWorking: { type: 'string' }, evidence: strArr,
    subjectLine: { type: 'string' }, previewText: { type: 'string' },
    cta: { type: 'string', enum: ['Check Availability', 'Book Your Stay', 'Plan Your Getaway'] },
    confidence: { type: 'string', enum: ['High', 'Medium', 'Low'] }, confidenceNote: { type: 'string' },
    expires: { type: 'string' },
  },
}

const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['analysis', 'suggestions'],
  properties: {
    analysis: {
      type: 'object', additionalProperties: false,
      required: ['summary', 'audienceType', 'audienceReason', 'yardstick', 'whatsWorking', 'whatsNotWorking', 'seasonalHistory', 'recentSends', 'rhythmNote', 'directVsIndirect', 'dataGaps', 'feedbackActedOn'],
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
        feedbackActedOn: { type: 'string' },
      },
    },
    suggestions: { type: 'array', items: SUGGESTION },
  },
}

const clean = (v) => typeof v === 'string' ? v.replace(/\s*[—]\s*/g, ', ').replace(/–/g, '-')
  : Array.isArray(v) ? v.map(clean) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x)])) : v

const sendLine = (s) => [s.id, s.date, s.segment || '-', s.audience ?? '', s.openRate ?? '', s.ctr ?? '', s.ctor ?? '', s.bookings14d ?? '', s.usual14d ?? '', s.name, s.subject].join('\t')

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
    const suggestions = await generate(locationId, body.month, bearerOf(event))
    /* Saved before the page hears it is done, so a set that shows up is a set
       that exists. A failed save still hands the set back, with the reason. */
    try {
      const saved = await saveSuggestionSet(bearerOf(event), {
        locationId, clientName: suggestions.client, month: suggestions.month,
        generatedBy: event.session?.email || event.session?.name, result: suggestions,
      })
      Object.assign(suggestions, { id: saved.id, generatedAt: saved.generatedAt, generatedBy: event.session?.email || event.session?.name || null })
    } catch (err) {
      console.error('[suggest-campaigns] save failed:', err.message)
      suggestions.saveError = err.message
    }
    await storeJob(jobId, { status: 'done', suggestions })
    return json(200, { ok: true })
  } catch (err) {
    console.error('[suggest-campaigns]', err)
    await storeJob(jobId, { status: 'error', error: err.message })
    return json(500, { error: err.message })
  }
}

/* Lead times for the timing check, as [median, early planners] in days: the
   holiday's own (from the last one or two years' stays over it) for a holiday
   email, else the Step 1 window, else the brain doc's audience benchmark. */
function leadForTiming(pms, audienceType, holiday) {
  const h = holiday && holiday !== 'none' ? pms?.holidayLeadTimes?.find(x => x.holiday === holiday) : null
  if (h?.medianDays != null) return { days: h.medianDays, early: h.earlyPlannersDays, basis: `${holiday} stays, ${h.stays} bookings over ${h.years} year${h.years === 1 ? '' : 's'}` }
  if (pms?.bookingWindow) return { days: pms.bookingWindow.leadTimeDays, early: pms.bookingWindow.earlyPlannersDays, basis: pms.bookingWindow.basis }
  const [days, early] = { 'Families / Mid-Size Groups': [60, 90], 'Large Groups': [180, 270] }[audienceType] || [35, 56]
  return { days, early, basis: 'benchmark' }
}

/* Is this send the right time for the theme? The best moment runs from when
   the early planners (the first quarter of guests) book to when the median
   guest books: stay start minus each lead time. A week's grace either side of
   the send's own dates still counts as on time. */
function timingFor(s, lead, ty, tm, today) {
  const start = /^\d{4}-\d{2}-\d{2}$/.test(s.targetStayStart || '') ? s.targetStayStart : null
  const from = iso(utc(ty, tm - 1, s.slot === 'first' ? 1 : 16))
  const to = s.slot === 'first' ? iso(utc(ty, tm - 1, 15)) : iso(utc(ty, tm, 0))
  const base = { sendWindow: `${from} to ${to}`, leadTimeDays: lead.days, earlyPlannersDays: lead.early, leadBasis: lead.basis }
  if (!start) return { verdict: 'unknown', ...base }
  const shift = (d, n) => iso(new Date(Date.parse(d) + n * 86400000))
  const latest = shift(start, -lead.days)
  const earliest = lead.early != null && lead.early > lead.days ? shift(start, -lead.early) : latest
  const verdict = start <= iso(today) ? 'too-late'
    : latest < shift(from, -7) ? 'earlier'
    : earliest > shift(to, 7) ? 'later'
    : 'on-time'
  return { verdict, bestFrom: earliest, bestBy: latest, idealSendDate: latest, targetStayStart: start, ...base }
}

/* The team's ratings and notes on this client's earlier suggestions, the
   target month's first, each with what it was about. */
function feedbackLines(rows, month) {
  const sorted = [...rows].sort((a, b) => (b.month === month) - (a.month === month))
  return sorted.map(f => {
    const a = f.about || {}
    const what = a.part === 'analysis' ? 'the analysis' : `${a.part}: "${a.title || ''}" (${a.type || ''}, ${a.category || ''}), subject "${a.subjectLine || ''}"`
    return `${f.month} | ${what} | ${f.rating ? `${f.rating}/5` : 'no rating'}${f.comment ? ` | "${f.comment}"` : ''} | ${f.created_by || 'team'}, ${String(f.created_at).slice(0, 10)}`
  }).join('\n')
}

/* The Primaries already saved for the months between now and the target month,
   latest set per month, so a later month's rhythm checks see what is planned. */
async function plannedBefore(token, locationId, ty, tm, today) {
  const months = []
  for (let d = utc(today.getUTCFullYear(), today.getUTCMonth(), 1); d < utc(ty, tm - 1, 1); d = utc(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)) months.push(iso(d).slice(0, 7))
  const sets = await Promise.all(months.map(m => listSuggestionSets(token, locationId, m).then(r => r[0] || null).catch(() => null)))
  return sets.filter(Boolean).flatMap(row => (row.result.suggestions || [])
    .filter(x => x.rank === 1)
    .map(x => `${row.result.monthLabel}, ${x.slot === 'first' ? '1st-15th' : '16th-end'}\t${x.type}\t${x.category}\t${x.title}\t${x.subjectLine}`))
}

async function generate(locationId, month, token) {
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
    const [sends, pmsRaw, calendar, brain, planned, feedback] = await Promise.all([
      loadSends(locationId, since),
      loadPms(platform, locationId, name).catch(err => ({ available: false, reason: `PMS data could not be read: ${err.message}` })),
      app(`${encodeURIComponent('Email Content Calendar')}?select=subject,theme,campaign_type,send_month,calendar_date,idea_status,entry_status&client_name=eq.${encodeURIComponent(name)}&order=id.desc&limit=60`).catch(() => []),
      fetchGoogleDocText(BRAIN_DOC_ID).catch(err => { throw new Error(`Could not read the suggestions brain doc: ${err.message}`) }),
      plannedBefore(token, locationId, ty, tm, today),
      feedbackForClient(token, locationId).catch(err => { console.error('[suggest-campaigns] feedback read', err.message); return [] }),
    ])
    const stats = summarise(sends, today)
    const holidays = holidaysBetween(monthStart, utc(ty, tm + 8, 0))
    /* The target month and the two after it, one and two years back. */
    const seasonMonths = [1, 2].flatMap(back => [0, 1, 2].map(k => iso(utc(ty - back, tm - 1 + k, 1)).slice(0, 7)))
    const holidaysLastYear = holidaysBetween(utc(ty - 1, tm - 1, 1), utc(ty - 1, tm + 8, 0))
    const holidaysTwoYearsAgo = holidaysBetween(utc(ty - 2, tm - 1, 1), utc(ty - 2, tm + 8, 0))
    const pms = pmsRaw.available ? pmsInsights(pmsRaw, iso(today), holidays, holidaysLastYear, holidaysTwoYearsAgo) : { unavailable: pmsRaw.reason }
    const after = pmsRaw.available ? bookingsAfterSends(pmsRaw, sends) : {}
    for (const s of sends) Object.assign(s, after[s.id] || {})

    const content = [
      `Today: ${iso(today)}. Target month: ${monthLabel}. First send covers ${iso(monthStart)} to ${iso(utc(ty, tm - 1, 15))}; second send ${iso(utc(ty, tm - 1, 16))} to ${iso(monthEnd)}.`,
      `Client: ${name}`,
      `<baseline>${JSON.stringify(stats.baseline)}</baseline>`,
      `<month_by_month>\n${stats.byMonth.map(m => `${m.month}\t${m.sends} sends\tavg CTR ${m.avgCtr}%\tavg CTOR ${m.avgCtor}%`).join('\n')}\n</month_by_month>`,
      `<same_season_last_year months="${seasonMonths.join(', ')}">\nid\tdate\tsegment\taudience\topen%\tCTR%\tCTOR%\tbookings in 14 days after\tusual bookings per 14 days\tcampaign name\tsubject line\n${sends.filter(x => seasonMonths.includes(x.date.slice(0, 7))).map(sendLine).join('\n') || 'None: no sends in these months.'}\n</same_season_last_year>`,
      `<sends count="${sends.length}">\nid\tdate\tsegment\taudience\topen%\tCTR%\tCTOR%\tbookings in 14 days after\tusual bookings per 14 days\tcampaign name\tsubject line\n${sends.slice(0, 200).map(sendLine).join('\n')}\n</sends>`,
      `<team_feedback>\n${feedbackLines(feedback, `${ty}-${String(tm).padStart(2, '0')}`) || 'No feedback on this client yet.'}\n</team_feedback>`,
      `<planned_sends>\n${planned.join('\n') || 'None saved for the months before this one.'}\n</planned_sends>`,
      `<content_calendar>\n${calendar.map(c => [c.calendar_date || c.send_month || '', c.idea_status || c.entry_status || '', c.campaign_type || '', c.subject || c.theme || ''].join('\t')).join('\n') || 'Nothing on the calendar.'}\n</content_calendar>`,
      `<upcoming_holidays>\n${holidays.map(h => h.line).join('\n')}\n</upcoming_holidays>`,
      `<pms>\n${JSON.stringify(pms)}\n</pms>`,
    ].join('\n\n')

    const anthropic = new Anthropic()
    const ask = async (messages) => {
      const msg = await anthropic.beta.messages.stream({
        model: MODEL, max_tokens: 32000,
        betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
        thinking: { type: 'adaptive' },
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
        system: [{ type: 'text', text: `${brain.text}\n\n${RUN_NOTES}`, cache_control: { type: 'ephemeral' } }],
        messages,
      }).finalMessage()
      if (msg.stop_reason === 'max_tokens') throw new Error('Claude ran out of room before finishing the suggestions.')
      const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('')
      return { text, out: clean(JSON.parse(text)) }
    }
    /* The schema cannot require exactly four (strict output caps minItems at 1),
       so a short answer gets one retry that says exactly what is missing. */
    const missing = (o) => [['first', 1], ['second', 1]]
      .filter(([slot, rank]) => !o.suggestions.some(x => x.slot === slot && x.rank === rank))
      .map(([slot, rank]) => `${slot === 'first' ? 'first' : 'second'} send ${rank === 1 ? 'Primary' : 'Backup'}`)
    const first = await ask([{ role: 'user', content }])
    let out = first.out
    if (missing(out).length) {
      const retry = await ask([
        { role: 'user', content },
        { role: 'assistant', content: first.text },
        { role: 'user', content: `Your answer is missing: ${missing(out).join(', ')}. Give the full answer again with both suggestions: one for the first send and one for the second.` },
      ])
      out = retry.out
      if (missing(out).length) throw new Error(`Claude did not return both suggestions (missing ${missing(out).join(', ')}). Try again.`)
    }

    const byId = Object.fromEntries(sends.map(s => [s.id, s]))
    const cite = (ids) => (ids || []).map(id => byId[id]).filter(Boolean)
      .map(({ date, name, subject, segment, audience, ctr, ctor, bookings14d, usual14d }) => ({ date, name, subject, segment, audience, ctr, ctor, bookings14d, usual14d }))
    const a = out.analysis
    const analysis = {
      ...a,
      whatsWorking:    a.whatsWorking.map(f => ({ insight: f.insight, evidence: cite(f.evidence) })),
      whatsNotWorking: a.whatsNotWorking.map(f => ({ insight: f.insight, evidence: cite(f.evidence) })),
      seasonalHistory: { insight: a.seasonalHistory.insight, evidence: cite(a.seasonalHistory.evidence) },
      recentSends: a.recentSends.filter(r => byId[r.id]).map(r => ({ ...cite([r.id])[0], type: r.type, category: r.category })),
    }
    const suggestions = [['first', 1], ['second', 1]]
      .map(([slot, rank]) => out.suggestions.find(x => x.slot === slot && x.rank === rank))
      .map(s => ({ ...s, evidence: cite(s.evidence), subjectLength: [...s.subjectLine].length,
        audience: s.type === 'DIRECT' ? 'Recent Engagers' : 'All Contacts',
        timing: timingFor(s, leadForTiming(pms, a.audienceType, s.holiday), ty, tm, today) }))

    return {
      client: name, month: `${ty}-${String(tm).padStart(2, '0')}`, monthLabel, dataPulled: new Date().toISOString(),
      stats: { ...stats.baseline, totalSends: stats.total, firstSend: stats.firstSend, lastSend: stats.lastSend, byMonth: stats.byMonth.slice(0, 24) },
      analysis, suggestions,
      pms: pms.unavailable ? { unavailable: pms.unavailable } : { provider: pms.pmsProvider, lastSync: pms.lastSync, properties: pms.propertyCount, historyMonths: pms.historyMonths, pace: pms.pace, leadTimeDays: pms.leadTime.medianDaysLast12Months, bookingWindow: pms.bookingWindow, holidayLeadTimes: pms.holidayLeadTimes, seasons: pms.seasons, holidayHistory: pms.holidayHistory, medianGuests: pms.partySize.medianGuests },
    }
  }
}

export const handler = withAuth(rawHandler)
