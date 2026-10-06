import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { suggestCampaigns, fetchSavedSuggestions, fetchSuggestionStatus } from '../lib/api'

const fmtStamp = (ts) => new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
const pct = (v) => v == null ? '–' : `${v}%`

function monthOptions() {
  const now = new Date()
  return [0, 1, 2].map(i => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    return { value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }
  })
}

export default function SuggestionsView({ dark, clients }) {
  const months = monthOptions()
  const [locationId, setLocationId] = useState('')
  const [month, setMonth]           = useState(months[0].value)
  const [loading, setLoading]       = useState(false)
  const [loadingSaved, setLoadingSaved] = useState(false)
  const [error, setError]           = useState('')
  const [sets, setSets]             = useState([])
  const [shown, setShown]           = useState(0)
  const [generated, setGenerated]   = useState({})

  const c = {
    text:   dark ? 'rgba(255,255,255,0.88)' : '#111827',
    sub:    dark ? 'rgba(255,255,255,0.5)'  : '#6b7280',
    faint:  dark ? 'rgba(255,255,255,0.32)' : '#9ca3af',
    border: dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb',
    card:   dark ? '#111111' : '#ffffff',
    soft:   dark ? 'rgba(255,255,255,0.03)' : '#fafafa',
    accent: dark ? '#f59e0b' : '#111827',
  }
  const active = clients.filter(cl => cl.isActive && cl.ghl?.locationId).sort((a, b) => a.name.localeCompare(b.name))
  const doneCount = active.filter(cl => generated[cl.ghl.locationId]).length
  const result = sets[shown] || null

  useEffect(() => {
    let live = true
    fetchSuggestionStatus({ month }).then(d => { if (live) setGenerated(d.generated || {}) }).catch(() => { if (live) setGenerated({}) })
    return () => { live = false }
  }, [month])

  useEffect(() => {
    setSets([]); setShown(0); setError('')
    if (!locationId) return
    let live = true
    setLoadingSaved(true)
    fetchSavedSuggestions({ locationId, month })
      .then(d => { if (live) setSets(d.sets || []) })
      .catch(err => { if (live) setError(`Could not load saved suggestions: ${err.message}`) })
      .finally(() => { if (live) setLoadingSaved(false) })
    return () => { live = false }
  }, [locationId, month])

  async function generate() {
    if (!locationId) return
    setLoading(true); setError('')
    try {
      const data = await suggestCampaigns({ locationId, month })
      setSets(prev => [data, ...prev]); setShown(0)
      if (data.generatedAt) setGenerated(g => ({ ...g, [locationId]: data.generatedAt }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const select = { padding: '10px 14px', borderRadius: 10, border: `1px solid ${c.border}`, background: c.card, color: c.text, fontSize: 14, fontFamily: 'Inter, sans-serif', outline: 'none', cursor: 'pointer' }
  const busy = loading || loadingSaved

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <select aria-label="Client" value={locationId} onChange={e => setLocationId(e.target.value)} style={{ ...select, minWidth: 260 }}>
          <option value="">Choose a client ({doneCount} of {active.length} done)</option>
          {active.map(cl => (
            <option key={cl.ghl.locationId} value={cl.ghl.locationId}>
              {generated[cl.ghl.locationId] ? '\u2713 ' : '\u2003 '}{cl.name}
            </option>
          ))}
        </select>
        <select aria-label="Month" value={month} onChange={e => setMonth(e.target.value)} style={select}>
          {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <button onClick={generate} disabled={!locationId || busy}
          style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: c.accent, color: dark ? '#111827' : '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'Inter, sans-serif',
            cursor: !locationId || busy ? 'not-allowed' : 'pointer', opacity: !locationId || busy ? 0.5 : 1 }}>
          {loading ? 'Analysing\u2026' : sets.length ? 'Regenerate' : 'Generate Suggestions'}
        </button>
        {sets.length > 1 && (
          <select aria-label="Version" value={shown} onChange={e => setShown(Number(e.target.value))} style={select}>
            {sets.map((st, i) => (
              <option key={st.id ?? i} value={i}>{i === 0 ? 'Latest' : `Version ${sets.length - i}`} \u00b7 {st.generatedAt ? fmtStamp(st.generatedAt) : 'unsaved'}</option>
            ))}
          </select>
        )}
      </div>

      {result && !loading && (
        <div style={{ fontSize: 12, color: c.faint, marginBottom: 24 }}>
          {result.generatedAt
            ? <>Saved {fmtStamp(result.generatedAt)}{result.generatedBy ? ` by ${result.generatedBy}` : ''}{sets.length > 1 ? ` \u00b7 ${sets.length} versions this month` : ''}</>
            : <span style={{ color: '#d97706' }}>Not saved: {result.saveError || 'unknown error'}. Regenerating will try again.</span>}
        </div>
      )}
      {!result && <div style={{ marginBottom: 16 }} />}

      {loading && (
        <div role="status" style={{ padding: '48px 0', textAlign: 'center', color: c.sub, fontSize: 14 }}>
          Reading every send for this client and working out what to send next. This takes a minute or two.
        </div>
      )}
      {loadingSaved && !loading && (
        <div role="status" style={{ padding: '48px 0', textAlign: 'center', color: c.faint, fontSize: 14 }}>Loading saved suggestions\u2026</div>
      )}
      {error && !loading && (
        <div role="alert" style={{ padding: '14px 18px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.06)', color: dark ? '#fca5a5' : '#b91c1c', fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}
      {!busy && !result && !error && (
        <div style={{ padding: '72px 0', textAlign: 'center', color: c.faint, fontSize: 14 }}>
          {locationId
            ? 'Nothing generated for this client and month yet.'
            : "Pick an active client and a month. Clients with a \u2713 already have suggestions saved for that month."}
        </div>
      )}

      {!busy && result && <Result r={result} c={c} />}
    </div>
  )
}

function Result({ r, c }) {
  const a = r.analysis
  const slots = [
    { key: 'first',  label: `Send 1 · ${r.monthLabel.split(' ')[0]} 1–15` },
    { key: 'second', label: `Send 2 · ${r.monthLabel.split(' ')[0]} 16–end` },
  ]
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 24 }}>
        <Stat c={c} label="Sends analysed" value={r.stats.totalSends} hint={r.stats.firstSend ? `${fmtDate(r.stats.firstSend)} – ${fmtDate(r.stats.lastSend)}` : 'No sends found'} />
        <Stat c={c} label="Median CTR" value={pct(r.stats.medianCtr)} hint={r.stats.window} />
        <Stat c={c} label="Median CTOR" value={pct(r.stats.medianCtor)} hint={r.stats.window} />
        <Stat c={c} label="Audience type" value={a.audienceType} small hint={r.briefFound ? 'From the copy brief' : 'No copy brief found'} />
      </div>

      {r.pms && <PmsPanel c={c} p={r.pms} />}

      <Section c={c} title={`Analysis · ${r.client}`}>
        <p style={{ fontSize: 14, lineHeight: 1.65, color: c.text, margin: '0 0 18px' }}>{a.summary}</p>
        <Grid>
          <Block c={c} title="What's working">{a.whatsWorking.map((f, i) => <Finding key={i} c={c} f={f} />)}</Block>
          <Block c={c} title="What's not">{a.whatsNotWorking.map((f, i) => <Finding key={i} c={c} f={f} />)}</Block>
        </Grid>
        <Block c={c} title={`This time last year`}><Finding c={c} f={a.seasonalHistory} /></Block>
        <Grid>
          <Block c={c} title="Who books">{a.audienceReason}</Block>
          <Block c={c} title="Direct vs indirect">{a.directVsIndirect}</Block>
        </Grid>
        <Block c={c} title="Recent sends and rhythm">
          <p style={{ margin: '0 0 10px' }}>{a.rhythmNote}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {a.recentSends.map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '92px 74px 1fr auto', gap: 10, fontSize: 12, alignItems: 'baseline' }}>
                <span style={{ color: c.faint }}>{fmtDate(s.date)}</span>
                <span style={{ fontWeight: 700, color: c.sub }}>{s.type}</span>
                <span style={{ color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.subject}>{s.category} · {s.name}</span>
                <span style={{ color: c.sub, whiteSpace: 'nowrap' }}>CTR {pct(s.ctr)} · CTOR {pct(s.ctor)}</span>
              </div>
            ))}
          </div>
        </Block>
        <Block c={c} title="Yardstick">{a.yardstick}</Block>
        {a.dataGaps.length > 0 && (
          <Block c={c} title="Not used / missing">
            <ul style={{ margin: 0, paddingLeft: 18 }}>{a.dataGaps.map((g, i) => <li key={i}>{g}</li>)}</ul>
          </Block>
        )}
      </Section>

      {slots.map(slot => (
        <div key={slot.key} style={{ marginTop: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.faint, marginBottom: 12 }}>{slot.label}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>
            {r.suggestions.filter(s => s.slot === slot.key).map((s, i) => <SuggestionCard key={i} c={c} s={s} />)}
          </div>
        </div>
      ))}

      <div style={{ marginTop: 20, fontSize: 11, color: c.faint }}>Data pulled {new Date(r.dataPulled).toLocaleString()}</div>
    </motion.div>
  )
}

function PmsPanel({ c, p }) {
  if (p.unavailable) return (
    <div style={{ fontSize: 12, color: c.faint, margin: '-8px 0 20px' }}>Bookings: {p.unavailable}</div>
  )
  const cell = { padding: '8px 10px', borderTop: `1px solid ${c.border}`, fontSize: 13, color: c.text, fontVariantNumeric: 'tabular-nums' }
  const head = { ...cell, borderTop: 'none', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: c.faint }
  return (
    <div style={{ marginBottom: 24 }}>
      <Section c={c} title="Bookings">
        <div style={{ fontSize: 12, color: c.sub, marginBottom: 10 }}>
          {p.properties} {p.properties === 1 ? 'property' : 'properties'} · {p.provider} · {p.historyMonths} months of history · median lead time {p.leadTimeDays ?? '–'} days · median party {p.medianGuests ?? '–'} guests
          {p.lastSync && <> · synced {fmtStamp(p.lastSync)}</>}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 520 }}>
            <thead><tr>{['Window', 'On the books', 'Same time last year', 'Pace', 'Last year ended at', 'Open nights'].map(h => <th key={h} style={{ ...head, textAlign: h === 'Window' ? 'left' : 'right' }}>{h}</th>)}</tr></thead>
            <tbody>
              {p.pace.map(w => (
                <tr key={w.window}>
                  <td style={cell} title={w.dates}>{w.window}</td>
                  <td style={{ ...cell, textAlign: 'right' }}>{pct(w.onBooksPct)}</td>
                  <td style={{ ...cell, textAlign: 'right' }}>{pct(w.stlyPct)}</td>
                  <td style={{ ...cell, textAlign: 'right', fontWeight: 700, color: w.paceVsStlyPts == null ? c.faint : w.paceVsStlyPts <= -10 ? '#dc2626' : w.paceVsStlyPts < 0 ? '#d97706' : '#059669' }}>
                    {w.paceVsStlyPts == null ? '–' : `${w.paceVsStlyPts > 0 ? '+' : ''}${w.paceVsStlyPts} pts`}
                  </td>
                  <td style={{ ...cell, textAlign: 'right', color: c.sub }}>{pct(w.lastYearFinalPct)}</td>
                  <td style={{ ...cell, textAlign: 'right', color: c.sub }}>{w.openNights}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}

function SuggestionCard({ c, s }) {
  const rows = [
    ['Hook', s.hook], ['Booking window', s.bookingWindow], ['Stay dates promoted', s.stayDatesPromoted], ['Calendar anchor', s.calendarAnchor],
    ['Why now', s.whyNow], ["What's working", s.whatsWorking],
  ]
  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <Tag c={c} strong>{s.rank === 1 ? 'Primary' : 'Backup'}</Tag>
          <Tag c={c}>{s.type}</Tag><Tag c={c}>{s.category}</Tag><Tag c={c}>{s.priority} priority</Tag>
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: c.text, letterSpacing: '-0.01em' }}>{s.title}</div>
      </div>
      <div style={{ background: c.soft, border: `1px solid ${c.border}`, borderRadius: 10, padding: '12px 14px' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{s.subjectLine}</div>
        <div style={{ fontSize: 13, color: c.sub, marginTop: 4 }}>{s.previewText}</div>
        <div style={{ fontSize: 11, color: s.subjectLength < 28 || s.subjectLength > 40 ? '#d97706' : c.faint, marginTop: 6 }}>
          {s.subjectLength} characters · CTA: {s.cta}
        </div>
      </div>
      {rows.map(([label, text]) => (
        <div key={label}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: c.faint, marginBottom: 3 }}>{label}</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: c.text }}>{text}</div>
        </div>
      ))}
      {s.evidence.length > 0 && <Evidence c={c} items={s.evidence} />}
      <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 12, fontSize: 12, color: c.sub, lineHeight: 1.55 }}>
        <strong style={{ color: c.text }}>{s.confidence} confidence.</strong> {s.confidenceNote}
        <div style={{ color: c.faint, marginTop: 4 }}>Expires {fmtDate(s.expires)}</div>
      </div>
    </div>
  )
}

function Finding({ c, f }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div>{f.insight}</div>
      {f.evidence.length > 0 && <Evidence c={c} items={f.evidence} />}
    </div>
  )
}

function Evidence({ c, items }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
      {items.map((e, i) => (
        <div key={i} title={e.subject} style={{ fontSize: 12, color: c.sub, display: 'flex', gap: 8, alignItems: 'baseline' }}>
          <span style={{ color: c.faint, whiteSpace: 'nowrap' }}>{fmtDate(e.date)}</span>
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
          <span style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>CTR {pct(e.ctr)} · CTOR {pct(e.ctor)}</span>
          {e.bookings7d != null && (
            <span title="Bookings taken in the 7 days after this send, against the usual 7 days before it. Timing, not proof the email caused them."
              style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: e.usual7d && e.bookings7d >= e.usual7d * 1.25 ? '#059669' : c.sub }}>
              · {e.bookings7d} {e.bookings7d === 1 ? 'booking' : 'bookings'} in the next 7 days (usual {e.usual7d})
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

const Grid = ({ children }) => <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>{children}</div>

function Section({ c, title, children }) {
  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, padding: 22 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: c.text, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}

function Block({ c, title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: c.faint, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, lineHeight: 1.6, color: c.text }}>{children}</div>
    </div>
  )
}

function Stat({ c, label, value, hint, small }) {
  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: c.faint }}>{label}</div>
      <div style={{ fontSize: small ? 15 : 22, fontWeight: 700, color: c.text, marginTop: 6 }}>{value}</div>
      {hint && <div style={{ fontSize: 11, color: c.faint, marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

function Tag({ c, children, strong }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, border: `1px solid ${c.border}`,
      background: strong ? c.accent : 'transparent', color: strong ? (c.accent === '#111827' ? '#fff' : '#111827') : c.sub }}>
      {children}
    </span>
  )
}
