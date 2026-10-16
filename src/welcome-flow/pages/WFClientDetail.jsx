/**
 * Welcome Flow — one client's emails.
 * Summary tiles, then the nine emails of the flow as fixed rows: each row IS
 * that email. A row that has not been started yet is created for its week the
 * moment it is opened, so Email 7 can only ever be Email 7. No Export button
 * (deliberately, per spec).
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft, IconMail, IconMessageCircle, IconX } from '@tabler/icons-react'
import { useWelcomeFlowStore } from '../store/welcomeFlowStore'
import { useWfTheme, WfCard, WfButton, WfStatusPill } from '../components/wfUi'
import { WF_WEEKS, wfWeekLabel } from '../wfWeeks'

const DONE = new Set(['approved', 'pushed'])

/** The nine fixed rows, each paired with the email that holds its week (or
    null when not started), then any email with no week at all, so nothing
    stored is ever hidden. Exported for tests. */
export function buildRows(emails) {
  const list = emails || []
  const fixed = WF_WEEKS.map(w => ({ week: w.week, templateId: w.templateId, email: list.find(e => e.week === w.week) || null }))
  const weekless = list.filter(e => !e.week).map(e => ({ week: null, templateId: null, email: e }))
  return [...fixed, ...weekless]
}

/** The client's feedback on one email as a list of notes. The client's
    platform writes the column: a JSON list is one note per item (a string, or
    an object with its text under feedback/text/comment/message), anything
    else is one note. Exported for tests. */
export function clientFeedbackItems(raw) {
  const text = typeof raw === 'string' ? raw.trim() : ''
  if (!text) return []
  try {
    const parsed = JSON.parse(text)
    const list = Array.isArray(parsed) ? parsed : [parsed]
    const items = list.map(x => {
      if (typeof x === 'string') return { text: x.trim() }
      if (x && typeof x === 'object') {
        return {
          text: String(x.feedback ?? x.text ?? x.comment ?? x.message ?? '').trim(),
          by:   x.author || x.by || x.name || '',
          at:   x.created_at || x.createdAt || x.date || '',
        }
      }
      return { text: String(x ?? '').trim() }
    }).filter(i => i.text)
    if (items.length) return items
  } catch { /* plain text */ }
  return [{ text }]
}

/* A bare date ("2026-10-03") is read as UTC midnight, so show it in UTC or
   it lands a day early west of Greenwich. */
function feedbackDate(at) {
  if (!at) return ''
  const d = new Date(at)
  if (isNaN(d)) return String(at)
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(String(at).trim())
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', ...(dateOnly ? { timeZone: 'UTC' } : {}) })
}

function FeedbackPopup({ title, items, onClose }) {
  const t = useWfTheme()
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,23,42,0.35)',
               display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        role="dialog" aria-label={title}
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(520px, 100%)', maxHeight: '80vh', overflowY: 'auto',
                 background: t.dark ? '#141414' : '#fff', border: `1px solid ${t.border}`, borderRadius: 14,
                 boxShadow: '0 20px 60px rgba(0,0,0,0.18)', padding: '18px 20px 20px', fontFamily: 'Inter, sans-serif' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>Client feedback</div>
            <div style={{ fontSize: 12.5, color: t.muted, marginTop: 3 }}>{title}</div>
          </div>
          <button onClick={onClose} aria-label="Close"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: t.muted, display: 'flex' }}>
            <IconX size={16} stroke={2} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((item, i) => (
            <div key={i} style={{ padding: '11px 13px', borderRadius: 10, border: `1px solid ${t.border}`,
                                   background: t.dark ? 'rgba(255,255,255,0.03)' : '#f9fafb' }}>
              <div style={{ fontSize: 13.5, color: t.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{item.text}</div>
              {(item.by || item.at) && (
                <div style={{ fontSize: 11.5, color: t.faint, marginTop: 6 }}>
                  {[item.by, feedbackDate(item.at)].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

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

export default function WFClientDetail() {
  const { clientId } = useParams()
  const navigate = useNavigate()

  /* An email that already has its three variations opens straight at the
     variations step, not back at the brief — the brief is still reachable from
     the step nav there. Anything without copy yet starts at the brief. */
  const openEmail = (e) => {
    const hasCopy = Array.isArray(e?.variations) && e.variations.length > 0
    navigate(`/welcome-flow/${clientId}/email/${e.id}${hasCopy ? '/copy' : ''}`)
  }
  const t = useWfTheme()
  const { getClient, getEmails, counts, addEmail, ensureClients, ensureEmails, loadingClients, clientsLoaded, loadedEmails } = useWelcomeFlowStore()
  const [filter, setFilter] = useState('all')
  const [creating, setCreating] = useState(null)   // the week being created on first open, so a double click cannot make two
  const [feedbackFor, setFeedbackFor] = useState(null)   // { title, items } shown in the client-feedback pop-up

  // clients are not persisted — refetch after a reload on this deep route
  useEffect(() => { ensureClients() }, [ensureClients])
  useEffect(() => { ensureEmails(clientId) }, [ensureEmails, clientId])

  const client = getClient(clientId)
  const emails = getEmails(clientId)
  const c = counts(clientId)

  const shown = useMemo(() => {
    const rows = buildRows(emails)
    if (filter === 'done')        return rows.filter(r => r.email && DONE.has(r.email.status))
    if (filter === 'in_progress') return rows.filter(r => r.email && !DONE.has(r.email.status))
    return rows
  }, [emails, filter])

  if (!clientsLoaded || loadingClients) {
    return (
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 24px' }}>
        <WfCard style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: t.muted }}>Loading…</div>
        </WfCard>
      </div>
    )
  }

  if (!client) {
    return (
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 24px' }}>
        <WfCard style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Client not found</div>
          <WfButton variant="ghost" style={{ marginTop: 14 }} onClick={() => navigate('/welcome-flow')}>
            <IconArrowLeft size={15} /> All clients
          </WfButton>
        </WfCard>
      </div>
    )
  }

  const initials = client.name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()

  /* Open a row. A started email opens where it left off; an unstarted one is
     created for exactly that week first, so the brief has no week to pick. */
  const openRow = async (row) => {
    if (row.email) return openEmail(row.email)
    if (creating) return
    setCreating(row.week)
    try {
      const id = await addEmail(clientId, { week: row.week, templateId: row.templateId })
      navigate(`/welcome-flow/${clientId}/email/${id}`)
    } finally { setCreating(null) }
  }

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 24px 64px' }}>
      <button
        onClick={() => navigate('/welcome-flow')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
                 color: t.accent, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 20 }}
      >
        <IconArrowLeft size={15} stroke={2.2} /> All clients
      </button>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 999, flexShrink: 0,
            background: t.dark ? 'rgba(255,255,255,0.06)' : '#eef2f7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: t.muted, letterSpacing: '0.02em',
          }}>{initials}</div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: t.text, letterSpacing: '-0.02em', margin: 0 }}>{client.name}</h1>
            {client.email && (
              <div style={{ fontSize: 12.5, color: t.muted, marginTop: 3 }}>{client.email}</div>
            )}
          </div>
        </div>

      </div>

      {/* summary */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
        <Tile label="Done"        value={c.done} />
        <Tile label="In progress" value={c.inProgress} tone={c.inProgress ? '#b45309' : undefined} />
        <Tile label="Last activity" value={relative(c.lastActive)} />
      </div>

      {/* emails */}
      <WfCard style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '16px 18px', borderBottom: `1px solid ${t.border}`, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>Emails</div>
            <div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>
              {emails.filter(e => e.week).length} of {WF_WEEKS.length} started
            </div>
          </div>
          <div style={{ display: 'flex', background: t.dark ? 'rgba(255,255,255,0.05)' : '#f3f4f6', borderRadius: 9, padding: 3 }}>
            {[['all', 'All'], ['done', 'Done'], ['in_progress', 'In progress']].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                style={{
                  padding: '6px 13px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  fontSize: 12.5, fontWeight: 600, fontFamily: 'Inter, sans-serif',
                  background: filter === k ? (t.dark ? 'rgba(255,255,255,0.10)' : '#fff') : 'transparent',
                  color: filter === k ? t.text : t.muted,
                  boxShadow: filter === k && !t.dark ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}
              >{label}</button>
            ))}
          </div>
        </div>

        {shown.length === 0 ? (
          <div style={{ padding: '52px 24px', textAlign: 'center' }}>
            <IconMail size={28} color={t.faint} stroke={1.5} />
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginTop: 12 }}>
              {!loadedEmails[clientId] ? 'Loading emails…' : 'Nothing in this view'}
            </div>
            <div style={{ fontSize: 12.5, color: t.muted, marginTop: 5 }}>
              {!loadedEmails[clientId] ? 'Reading this client’s emails from the database.' : 'Try a different filter.'}
            </div>
          </div>
        ) : (<>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 18px', borderBottom: `1px solid ${t.border}`,
                        fontSize: 11, fontWeight: 600, color: t.faint, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            <span style={{ width: 22, flexShrink: 0 }} />
            <span style={{ flex: 1 }}>Email</span>
            <span style={{ width: 64, textAlign: 'center', flexShrink: 0 }}>Feedback</span>
            <span style={{ width: 104, textAlign: 'center', flexShrink: 0 }}>Status</span>
            <span style={{ width: 74, textAlign: 'right', flexShrink: 0 }}>Updated</span>
          </div>
          {shown.map((row, i) => { const e = row.email; return (
            <div
              key={row.week ? `week-${row.week}` : e.id}
              onClick={() => openRow(row)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer',
                borderTop: i === 0 ? 'none' : `1px solid ${t.border}`,
              }}
              onMouseEnter={ev => ev.currentTarget.style.background = t.dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)'}
              onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
            >
              {/* the row's place in this list, now that the list runs in flow order */}
              <span style={{ fontSize: 12, color: t.faint, fontVariantNumeric: 'tabular-nums', width: 22, flexShrink: 0 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: t.text,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e
                    ? (e.subject || <span style={{ color: t.faint, fontStyle: 'italic' }}>Untitled email</span>)
                    : <span style={{ color: t.faint, fontStyle: 'italic' }}>{creating === row.week ? 'Starting…' : 'Not started'}</span>}
                </div>
                {/* which email of the flow this is — the row's number is only
                    the order it was created in, which is rarely the same thing */}
                <div style={{ fontSize: 12.5, color: t.muted, marginTop: 3,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.week
                    ? <><strong style={{ fontWeight: 700, color: t.text }}>Email {row.week}</strong>{wfWeekLabel(row.week).replace(/^Email \d+/, '')}</>
                    : <span style={{ fontStyle: 'italic', color: t.faint }}>No email picked yet</span>}
                </div>
              </div>
              {/* the client's own feedback on this email, from their platform */}
              {(() => {
                const items = clientFeedbackItems(e?.clientFeedback)
                if (!items.length) return <span style={{ width: 64, flexShrink: 0 }} />
                const title = row.week ? wfWeekLabel(row.week) : (e.subject || 'Email')
                return (
                  <button
                    onClick={ev => { ev.stopPropagation(); setFeedbackFor({ title: `${client.name} · ${title}`, items }) }}
                    title={`${items.length} client feedback note${items.length === 1 ? '' : 's'}`}
                    style={{ width: 64, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                             padding: '5px 0', borderRadius: 999, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                             border: `1px solid ${t.dark ? 'rgba(245,158,11,0.35)' : '#fcd34d'}`,
                             background: t.dark ? 'rgba(245,158,11,0.12)' : '#fffbeb',
                             color: t.dark ? '#fbbf24' : '#b45309', fontSize: 12.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                  >
                    <IconMessageCircle size={14} stroke={2} /> {items.length}
                  </button>
                )
              })()}
              <span style={{ width: 104, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                {e ? <WfStatusPill status={e.status} /> : <span style={{ fontSize: 12, color: t.faint }}>Not started</span>}
              </span>
              <span style={{ fontSize: 12, color: t.faint, width: 74, textAlign: 'right', flexShrink: 0 }}>
                {e ? relative(e.updatedAt) : ''}
              </span>
            </div>
          )})}
        </>)}
      </WfCard>
      {feedbackFor && <FeedbackPopup title={feedbackFor.title} items={feedbackFor.items} onClose={() => setFeedbackFor(null)} />}
    </div>
  )
}
