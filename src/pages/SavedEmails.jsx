/**
 * SavedEmails — find a saved weekly email and open it again.
 * Search by its code (e.g. W7K3Q), the client, the subject line or the
 * template. Opening one loads the whole draft back into the weekly wizard:
 * copy, images, baked images, template and Adjust Design values.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconSearch, IconArrowLeft } from '@tabler/icons-react'
import { useCampaignStore } from '../store/campaignStore'
import { weeklyEmails, weeklyEmail, fetchClients } from '../lib/api'
import { useTheme } from '../context/ThemeContext'

const when = (iso) => iso ? new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''
const who  = (email) => (email || '').split('@')[0]

export default function SavedEmails() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const dark = theme === 'dark'

  const [query, setQuery]     = useState('')
  const [emails, setEmails]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [opening, setOpening] = useState(null)

  /* Searched as you type, a moment after the last key. */
  useEffect(() => {
    let live = true
    setLoading(true)
    const t = setTimeout(() => {
      weeklyEmails(query.trim())
        .then(d => { if (live) { setEmails(d.emails || []); setError('') } })
        .catch(e => { if (live) setError(e.message) })
        .finally(() => { if (live) setLoading(false) })
    }, 250)
    return () => { live = false; clearTimeout(t) }
  }, [query])

  async function open(row) {
    const s = useCampaignStore.getState()
    const unsaved = s.selectedClient?.name && !s.weeklyEmailId
    if (unsaved && !window.confirm(`The email you're working on for ${s.selectedClient.name} isn't saved. Open ${row.code} anyway? The unsaved one will be lost.`)) return
    setOpening(row.id); setError('')
    try {
      const [{ email }, clients] = await Promise.all([weeklyEmail({ id: row.id }), fetchClients().catch(() => [])])
      /* The saved copy has no GHL key; take the client fresh from the list. */
      const saved  = email.state?.selectedClient || null
      const client = clients.find(c => c.id === saved?.id) || clients.find(c => c.ghl?.locationId && c.ghl.locationId === email.locationId) || saved
      useCampaignStore.getState().loadSavedEmail({ ...email, client })
      navigate('/campaign/new')
    } catch (e) {
      setError(e.message)
      setOpening(null)
    }
  }

  const text   = dark ? 'rgba(255,255,255,0.88)' : '#111827'
  const muted  = dark ? 'rgba(255,255,255,0.45)' : '#6b7280'
  const border = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'
  const accent = dark ? '#f59e0b' : '#1d4ed8'

  return (
    <div style={{ maxWidth: 1480, margin: '0 auto', padding: '28px 32px 64px' }}>
      <button onClick={() => navigate('/campaign/new')} className="btn-secondary"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20,
          ...(dark ? { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' } : {}) }}>
        <IconArrowLeft size={15} stroke={2} /> Weekly Email Campaign
      </button>

      <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', color: text, margin: '0 0 6px' }}>Saved weekly emails</h1>
      <p style={{ fontSize: 15, color: muted, margin: '0 0 22px' }}>
        Search by code, client, subject line or template, then open an email to keep editing it.
      </p>

      <div style={{ position: 'relative', marginBottom: 18 }}>
        <IconSearch size={17} stroke={2} color={muted} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
        <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. W7K3Q, Home Base, Black Friday"
          style={{ width: '100%', padding: '12px 14px 12px 40px', borderRadius: 12, fontSize: 15, outline: 'none', color: text,
            background: dark ? 'rgba(255,255,255,0.05)' : '#fff', border: `1px solid ${border}` }} />
      </div>

      {error && <div style={{ color: '#dc2626', fontSize: 14, marginBottom: 14 }}>{error}</div>}

      <div style={{ border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, color: text }}>
            <thead>
              <tr style={{ textAlign: 'left', color: muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                {['Code', 'Client', 'Template', 'Subject line', 'Status', 'Last saved', ''].map(h => (
                  <th key={h} style={{ padding: '14px 18px', fontWeight: 600, borderBottom: `1px solid ${border}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {emails.map(e => (
                <tr key={e.id} style={{ borderBottom: `1px solid ${border}` }}>
                  <td style={{ padding: '18px 18px', fontWeight: 700, color: accent, letterSpacing: '.04em', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{e.code}</td>
                  <td style={{ padding: '18px 18px', whiteSpace: 'nowrap' }}>{e.clientName}</td>
                  <td style={{ padding: '18px 18px', whiteSpace: 'nowrap', color: muted }}>{e.templateLabel || '—'}</td>
                  <td style={{ padding: '18px 18px', minWidth: 360, lineHeight: 1.5 }}>{e.subjectLine || <span style={{ color: muted }}>No subject yet</span>}</td>
                  <td style={{ padding: '18px 18px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 11px', borderRadius: 999, whiteSpace: 'nowrap',
                      background: e.status === 'pushed' ? (dark ? 'rgba(52,211,153,0.15)' : '#dcfce7') : (dark ? 'rgba(255,255,255,0.07)' : '#f3f4f6'),
                      color: e.status === 'pushed' ? (dark ? '#34d399' : '#15803d') : muted }}>
                      {e.status === 'pushed' ? 'Pushed to GHL' : 'Draft'}
                    </span>
                  </td>
                  <td style={{ padding: '18px 18px', whiteSpace: 'nowrap', color: muted }}>{when(e.updatedAt)}{e.updatedBy ? ` · ${who(e.updatedBy)}` : ''}</td>
                  <td style={{ padding: '18px 18px', textAlign: 'right' }}>
                    <button onClick={() => open(e)} disabled={!!opening}
                      style={{ padding: '7px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: opening ? 'default' : 'pointer', border: 'none',
                        background: dark ? '#f59e0b' : '#3b82f6', color: dark ? '#111827' : '#fff', opacity: opening && opening !== e.id ? 0.5 : 1 }}>
                      {opening === e.id ? 'Opening…' : 'Open'}
                    </button>
                  </td>
                </tr>
              ))}
              {!emails.length && (
                <tr><td colSpan={7} style={{ padding: '28px 14px', textAlign: 'center', color: muted }}>
                  {loading ? 'Loading…' : query.trim() ? `Nothing saved matches "${query.trim()}".` : 'No weekly emails saved yet. Use Save email in the wizard, or push one to GHL.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
