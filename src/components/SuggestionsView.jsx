import { useState } from 'react'
import { motion } from 'framer-motion'
import { suggestCampaigns } from '../lib/api'

/* Generation takes a minute or two, so a result outlives switching tabs. */
const resultCache = new Map()

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
  const [error, setError]           = useState('')
  const [result, setResult]         = useState(null)

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
  const key = `${locationId}|${month}`

  function pick(nextLoc, nextMonth) {
    setLocationId(nextLoc); setMonth(nextMonth); setError('')
    setResult(resultCache.get(`${nextLoc}|${nextMonth}`) || null)
  }

  async function generate() {
    if (!locationId) return
    setLoading(true); setError('')
    try {
      const data = await suggestCampaigns({ locationId, month })
      resultCache.set(key, data)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const select = { padding: '10px 14px', borderRadius: 10, border: `1px solid ${c.border}`, background: c.card, color: c.text, fontSize: 14, fontFamily: 'Inter, sans-serif', outline: 'none', cursor: 'pointer' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
        <select aria-label="Client" value={locationId} onChange={e => pick(e.target.value, month)} style={{ ...select, minWidth: 260 }}>
          <option value="">Choose a client ({active.length} active)</option>
          {active.map(cl => <option key={cl.ghl.locationId} value={cl.ghl.locationId}>{cl.name}</option>)}
        </select>
        <select aria-label="Month" value={month} onChange={e => pick(locationId, e.target.value)} style={select}>
          {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <button onClick={generate} disabled={!locationId || loading}
          style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: c.accent, color: dark ? '#111827' : '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'Inter, sans-serif',
            cursor: !locationId || loading ? 'not-allowed' : 'pointer', opacity: !locationId || loading ? 0.5 : 1 }}>
          {loading ? 'Analysing…' : result ? 'Regenerate' : 'Generate Suggestions'}
        </button>
      </div>

      {loading && (
        <div role="status" style={{ padding: '48px 0', textAlign: 'center', color: c.sub, fontSize: 14 }}>
          Reading every send for this client and working out what to send next. This takes a minute or two.
        </div>
      )}
      {error && !loading && (
        <div role="alert" style={{ padding: '14px 18px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.06)', color: dark ? '#fca5a5' : '#b91c1c', fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}
      {!loading && !result && !error && (
        <div style={{ padding: '72px 0', textAlign: 'center', color: c.faint, fontSize: 14 }}>
          Pick an active client and a month. You'll get two ideas for each of the month's two sends, with the reasoning behind them.
        </div>
      )}

      {!loading && result && <Result r={result} c={c} />}
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

function SuggestionCard({ c, s }) {
  const rows = [
    ['Hook', s.hook], ['Calendar anchor', s.calendarAnchor], ['Stay dates', s.stayDatesPromoted],
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
