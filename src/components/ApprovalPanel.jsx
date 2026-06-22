/**
 * ApprovalPanel
 * Step 5 — team reviews the preview and approves or rejects with optional notes.
 * On approval it triggers: GHL push + Google Chat notification.
 */
import { useState } from 'react'
import { useCampaignStore } from '../store/campaignStore'
import { pushHtmlToGHL, notifyChat, logToSheets } from '../lib/api'
import { useTheme } from '../context/ThemeContext'

export default function ApprovalPanel() {
  const { theme } = useTheme()
  const dark = theme === 'dark'

  const [notes, setNotes]     = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')

  const {
    selectedClient, generatedCopy, selectedImages, renderedHtml,
    templateId, locationId, templateUrl, folderUrl, folderId, templateLabel, approvalStatus, setApproval, setGhlPushResult, setError,
  } = useCampaignStore((s) => ({
    selectedClient:   s.selectedClient,
    generatedCopy:    s.generatedCopy,
    selectedImages:   s.selectedImages,
    renderedHtml:     s.renderedHtml,
    templateId:       s.templateId,
    locationId:       s.locationId,
    templateUrl:      s.templateUrl,
    folderUrl:        s.folderUrl,
    folderId:         s.folderId,
    templateLabel:    s.templateLabel,
    approvalStatus:   s.approvalStatus,
    setApproval:      s.setApproval,
    setGhlPushResult: s.setGhlPushResult,
    setError:         s.setError,
  }))

  async function handleApprove() {
    setLoading(true)
    setApproval('approved', notes)
    try {
      const ghlResult = await pushHtmlToGHL({ client: selectedClient, renderedHtml, generatedCopy, templateId, locationId, folderId, templateLabel })
      setGhlPushResult(ghlResult)
      setPreviewUrl(folderUrl || templateUrl || ghlResult.previewUrl || '')
      try {
        await notifyChat({ clientName: selectedClient.name, previewUrl: ghlResult.previewUrl, approvedBy: 'Team' })
      } catch (chatErr) {
        console.warn('[ApprovalPanel] Chat notification failed (non-fatal):', chatErr.message)
      }
      setDone(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleReject() { setApproval('rejected', notes) }

  const accent    = dark ? '#f59e0b' : '#3b82f6'
  const mutedText = dark ? 'rgba(255,255,255,0.35)' : '#9ca3af'
  const cardStyle = {
    background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.8)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
    borderRadius: 14,
    padding: '18px 20px',
  }

  if (done) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 48 }}>✅</div>
        <p style={{ fontSize: 20, fontWeight: 700, color: accent }}>Email pushed to GHL!</p>
        <p style={{ fontSize: 15, color: mutedText }}>Google Chat notification sent.</p>
        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              marginTop: 8,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', borderRadius: 10, fontSize: 15, fontWeight: 600,
              fontFamily: 'Inter, sans-serif', textDecoration: 'none',
              background: accent,
              color: dark ? '#111827' : '#fff',
              boxShadow: `0 2px 12px ${dark ? 'rgba(245,158,11,0.3)' : 'rgba(59,130,246,0.25)'}`,
            }}
          >
            Open in GHL →
          </a>
        )}
      </div>
    )
  }

  if (approvalStatus === 'rejected') {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 48 }}>🔄</div>
        <p style={{ fontSize: 20, fontWeight: 700, color: dark ? 'rgba(255,255,255,0.7)' : '#374151' }}>Sent back for revision</p>
        <p style={{ fontSize: 15, color: mutedText }}>Notes: {notes || '—'}</p>
        <button
          onClick={() => setApproval('pending', '')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '9px 20px', fontSize: 15, fontWeight: 500, fontFamily: 'Inter, sans-serif',
            borderRadius: 10, cursor: 'pointer', transition: 'all 0.18s',
            background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)',
            color: dark ? 'rgba(255,255,255,0.7)' : '#374151',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            backdropFilter: 'blur(8px)',
          }}
        >
          Re-open
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Review summary */}
      <div style={cardStyle}>
        <p style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: mutedText, marginBottom: 14 }}>
          Review Summary
        </p>
        <dl style={{ fontSize: 15, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Client',  value: selectedClient?.name },
            { label: 'Subject', value: generatedCopy.subjectLine },
            { label: 'CTA',     value: generatedCopy.ctaText },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', gap: 8 }}>
              <dt style={{ fontWeight: 600, color: dark ? 'rgba(255,255,255,0.45)' : '#6b7280', minWidth: 60 }}>{label}</dt>
              <dd style={{ color: dark ? 'rgba(255,255,255,0.8)' : '#111827' }}>{value || '—'}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Notes */}
      <div>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6, color: dark ? 'rgba(255,255,255,0.5)' : '#374151', letterSpacing: '0.02em' }}>
          Notes <span style={{ fontWeight: 400, color: mutedText }}>(optional)</span>
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any feedback for the record…"
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 12, fontSize: 15,
            fontFamily: 'Inter, sans-serif', resize: 'none', outline: 'none',
            background: dark ? 'rgba(255,255,255,0.06)' : '#fff',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
            color: dark ? 'rgba(255,255,255,0.85)' : '#111827',
            transition: 'border-color 0.18s',
          }}
        />
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={handleApprove}
          disabled={loading}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px', fontSize: 14, fontWeight: 600, fontFamily: 'Inter, sans-serif',
            borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1, transition: 'all 0.18s',
            background: accent,
            color: dark ? '#111827' : '#fff',
            boxShadow: `0 2px 16px ${dark ? 'rgba(245,158,11,0.3)' : 'rgba(59,130,246,0.25)'}`,
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = dark ? '#d97706' : '#2563eb' }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.background = accent }}
        >
          {loading ? 'Pushing to GHL…' : '✅ Approve & Push to GHL'}
        </button>

        <button
          onClick={handleReject}
          disabled={loading}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px', fontSize: 14, fontWeight: 500, fontFamily: 'Inter, sans-serif',
            borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1, transition: 'all 0.18s',
            background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)',
            color: dark ? 'rgba(255,255,255,0.7)' : '#374151',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            backdropFilter: 'blur(8px)',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.1)' : '#f9fafb' }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)' }}
        >
          🔄 Send Back for Revision
        </button>
      </div>

    </div>
  )
}
