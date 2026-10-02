/**
 * Repeat Booking Flow — one client's emails.
 * Summary tiles, then the flow's three emails as fixed rows, the way the
 * welcome flow lists its nine. Opening an unstarted row creates that email,
 * so Email 1 can only ever be Email 1. A row whose template is not built yet
 * does not open.
 */

import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft } from '@tabler/icons-react'
import { useRepeatBookingStore } from '../store/repeatBookingStore'
import { useWfTheme, WfCard, WfButton, WfStatusPill } from '../../welcome-flow/components/wfUi'
import { RB_EMAILS, rbEmailDetail } from '../rbEmails'
import { rbPath } from '../components/rbShared'

const DONE = new Set(['approved', 'pushed'])
const NO_EMAILS = []

function relative(iso) {
  if (!iso) return 'Not yet'
  const diff = Date.now() - new Date(iso).getTime()
  const day = 86400000
  if (diff < 60000)    return 'just now'
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`
  if (diff < day)      return `${Math.floor(diff / 3600000)}h ago`
  if (diff < day * 30) return `${Math.floor(diff / day)}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function Tile({ label, value, tone }) {
  const t = useWfTheme()
  return (
    <WfCard style={{ padding: '16px 18px', flex: '1 1 180px' }}>
      <div style={{ fontSize: 12, color: t.muted }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: tone || t.text, marginTop: 6, lineHeight: 1 }}>{value}</div>
    </WfCard>
  )
}

export default function RBClientDetail() {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const t = useWfTheme()
  const client = useRepeatBookingStore(s => s.clients.find(c => c.id === clientId) || null)
  const emails = useRepeatBookingStore(s => s.emails[clientId] || NO_EMAILS)
  const { addEmail, counts } = useRepeatBookingStore()
  const [filter, setFilter] = useState('all')

  const rows = useMemo(() => {
    const all = RB_EMAILS.map(def => ({ def, email: emails.find(e => e.email === def.email) || null }))
    if (filter === 'done')        return all.filter(r => r.email && DONE.has(r.email.status))
    if (filter === 'in_progress') return all.filter(r => r.email && !DONE.has(r.email.status))
    return all
  }, [emails, filter])

  if (!client) {
    return (
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 24px' }}>
        <WfCard style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Client not found</div>
          <WfButton variant="ghost" style={{ marginTop: 14 }} onClick={() => navigate('/repeat-booking')}>
            <IconArrowLeft size={15} /> All clients
          </WfButton>
        </WfCard>
      </div>
    )
  }

  const c = counts(clientId)
  const initials = client.name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()

  /* A started email opens at its copy when it has some, otherwise at the brief. */
  const openRow = ({ def, email }) => {
    if (!def.templateId) return
    const id = email?.id || addEmail(clientId, def.email)
    navigate(rbPath(clientId, id, email?.variations?.length ? 'copy' : ''))
  }

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 24px 64px' }}>
      <button
        onClick={() => navigate('/repeat-booking')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
                 color: t.accent, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 20 }}
      >
        <IconArrowLeft size={15} stroke={2.2} /> All clients
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 999, flexShrink: 0,
          background: t.dark ? 'rgba(255,255,255,0.06)' : '#eef2f7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: t.muted, letterSpacing: '0.02em',
        }}>{initials}</div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: t.text, letterSpacing: '-0.02em', margin: 0 }}>{client.name}</h1>
          <div style={{ fontSize: 12.5, color: t.muted, marginTop: 3 }}>Repeat Booking Flow</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
        <Tile label="Done"          value={c.done} />
        <Tile label="In progress"   value={c.inProgress} tone={c.inProgress ? '#b45309' : undefined} />
        <Tile label="Last activity" value={relative(c.lastActive)} />
      </div>

      <WfCard style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '16px 18px', borderBottom: `1px solid ${t.border}`, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>Emails</div>
            <div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>{emails.length} of {RB_EMAILS.length} started</div>
          </div>
          <div style={{ display: 'flex', background: t.dark ? 'rgba(255,255,255,0.05)' : '#f3f4f6', borderRadius: 9, padding: 3 }}>
            {[['all', 'All'], ['done', 'Done'], ['in_progress', 'In progress']].map(([k, label]) => (
              <button key={k} onClick={() => setFilter(k)}
                style={{ padding: '6px 13px', borderRadius: 7, border: 'none', cursor: 'pointer',
                         fontSize: 12.5, fontWeight: 600, fontFamily: 'Inter, sans-serif',
                         background: filter === k ? (t.dark ? 'rgba(255,255,255,0.10)' : '#fff') : 'transparent',
                         color: filter === k ? t.text : t.muted,
                         boxShadow: filter === k && !t.dark ? '0 1px 2px rgba(0,0,0,0.06)' : 'none' }}
              >{label}</button>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: '52px 24px', textAlign: 'center', fontSize: 14, fontWeight: 600, color: t.text }}>Nothing in this view</div>
        ) : rows.map((row, i) => {
          const { def, email: e } = row
          const opens = !!def.templateId
          return (
            <div
              key={def.email}
              onClick={() => openRow(row)}
              title={`${def.what} Design: ${def.designFrom}.`}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                       cursor: opens ? 'pointer' : 'default', borderTop: i === 0 ? 'none' : `1px solid ${t.border}` }}
              onMouseEnter={ev => { if (opens) ev.currentTarget.style.background = t.dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)' }}
              onMouseLeave={ev => { ev.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 12, color: t.faint, fontVariantNumeric: 'tabular-nums', width: 22, flexShrink: 0 }}>
                {String(def.email).padStart(2, '0')}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e?.subject
                    ? e.subject
                    : <span style={{ color: t.faint, fontStyle: 'italic' }}>{e ? 'Untitled email' : opens ? 'Not started' : 'Template not built yet'}</span>}
                </div>
                <div style={{ fontSize: 12.5, color: t.muted, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <strong style={{ fontWeight: 700, color: t.text }}>Email {def.email}</strong> · {rbEmailDetail(def.email)}
                </div>
              </div>
              {e ? <WfStatusPill status={e.status} /> : <span style={{ fontSize: 12, color: t.faint }}>{opens ? 'Not started' : 'Coming soon'}</span>}
              <span style={{ fontSize: 12, color: t.faint, width: 74, textAlign: 'right', flexShrink: 0 }}>{e ? relative(e.updatedAt) : ''}</span>
            </div>
          )
        })}
      </WfCard>
    </div>
  )
}
