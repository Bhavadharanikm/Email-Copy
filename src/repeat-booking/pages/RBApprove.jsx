/**
 * Repeat Booking — approve & push (step 5).
 *
 * push-html-to-ghl creates the GHL email template (or updates it on a second
 * push) and moves it into the client's folder; the key is resolved server side
 * from the location. Then a Google Chat note, which never fails the push.
 *
 * The email's HTML is saved to rb_emails (one row per client per email, on the
 * shared project) when it is approved, and with Save to Database at any time.
 * A failed save never fails the GHL push: the button stays for a retry.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconCheck, IconRotate, IconDatabase } from '@tabler/icons-react'
import { useRepeatBookingStore } from '../store/repeatBookingStore'
import { useWfTheme, WfCard, WfButton, WfStepNav } from '../../welcome-flow/components/wfUi'
import { pushHtmlToGHL, notifyChat, rbSaveEmail } from '../../lib/api'
import { rbEmail } from '../rbEmails'
import { useRbEmail, rbPath, RBMissing } from '../components/rbShared'

export default function RBApprove() {
  const navigate = useNavigate()
  const t = useWfTheme()
  const { clientId, emailId, client, email, navEmail } = useRbEmail()
  const { updateEmail } = useRepeatBookingStore()

  const [notes, setNotes]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [done, setDone]       = useState(null)   // { previewUrl, chatSent, dbSaved }
  const [dbSaving, setDbSaving] = useState(false)
  const [dbMsg, setDbMsg]       = useState('')
  const [dbErr, setDbErr]       = useState('')

  if (!client || !email) return <RBMissing />

  const copy = email.copy || {}
  const info = rbEmail(email.email)
  const templateLabel = `Repeat Booking Email ${email.email} - ${info?.name || ''}`.trim()
  const blockers = email.notes?.blockers || []

  const saveToDb = () => rbSaveEmail({
    clientName: client.name, locationId: client.locationId,
    emailNumber: email.email, renderedHtml: email.renderedHtml,
  })

  async function handleSaveDb() {
    setDbSaving(true); setDbErr(''); setDbMsg('')
    try {
      const res = await saveToDb()
      setDbMsg(`${res.action === 'updated' ? 'Updated' : 'Saved'}: Email ${email.email} for ${client.name}`)
    } catch (e) {
      setDbErr(e.message)
    } finally {
      setDbSaving(false)
    }
  }

  async function handleApprove() {
    setLoading(true); setError('')
    try {
      const result = await pushHtmlToGHL({
        client: { name: client.name, ghl: { locationId: client.locationId } },
        renderedHtml:  email.renderedHtml,
        generatedCopy: copy,
        templateId:    email.ghlTemplateId || null,
        locationId:    client.locationId,
        folderId:      client.folderId || null,
        templateLabel,
      })
      updateEmail(clientId, emailId, {
        status: 'pushed', ghlTemplateId: result.templateId || email.ghlTemplateId || null,
        pushedAt: new Date().toISOString(), approveNotes: notes, reviewNotes: '',
      })
      let dbSaved = false
      try { await saveToDb(); dbSaved = true } catch (dbe) {
        console.warn('[RBApprove] GHL push succeeded but the database save did not:', dbe.message)
      }
      let chatSent = false
      try {
        await notifyChat({ clientName: client.name, previewUrl: result.previewUrl, approvedBy: 'Repeat Booking Flow' })
        chatSent = true
      } catch { /* the push already succeeded */ }
      setDone({ previewUrl: client.folderUrl || result.previewUrl || '', chatSent, dbSaved })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ textAlign: 'center', padding: '56px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 44 }}>✅</div>
          <p style={{ fontSize: 19, fontWeight: 700, color: t.text }}>Email pushed to GHL</p>
          <p style={{ fontSize: 13.5, color: t.muted }}>
            Saved as "{client.name} - {templateLabel}".{' '}
            {done.chatSent ? 'Google Chat notification sent.' : 'The Google Chat notification did not go through.'}{' '}
            {done.dbSaved ? 'Saved to the database.' : 'Saving to the database did not go through: use Save to Database to retry.'}
          </p>
          {done.previewUrl && (
            <a href={done.previewUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', marginTop: 6 }}>
              <WfButton>Open in GHL →</WfButton>
            </a>
          )}
          <WfButton variant="ghost" style={{ marginTop: 4 }} onClick={() => navigate(`/repeat-booking/${encodeURIComponent(clientId)}`)}>
            Back to {client.name}
          </WfButton>
        </div>
      </div>
    )
  }

  if (email.status === 'needs_update' && email.reviewNotes) {
    return (
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ textAlign: 'center', padding: '56px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 44 }}>🔄</div>
          <p style={{ fontSize: 19, fontWeight: 700, color: t.text }}>Sent back for revision</p>
          <p style={{ fontSize: 13.5, color: t.muted }}>Notes: {email.reviewNotes}</p>
          <WfButton variant="ghost" style={{ marginTop: 6 }} onClick={() => updateEmail(clientId, emailId, { status: 'ready', reviewNotes: '' })}>
            Re-open
          </WfButton>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '28px 24px 64px' }}>
      <WfStepNav email={navEmail} step={5} backLabel="Preview" onBack={() => navigate(rbPath(clientId, emailId, 'preview'))} />

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: t.text }}>Approve &amp; Push</h1>
        <p style={{ fontSize: 13, color: t.muted, margin: '7px 0 0' }}>
          Pushes the rendered email into {client.name}'s GHL template folder.
        </p>
      </div>

      <WfCard style={{ padding: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.faint, marginBottom: 14 }}>Review Summary</div>
        <dl style={{ fontSize: 13.5, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Client',   value: client.name },
            { label: 'Template', value: `${client.name} - ${templateLabel}` },
            { label: 'Subject',  value: copy.subjectLine },
            { label: 'Preview',  value: copy.previewText },
            { label: 'Code',     value: copy.codeDisplay },
            { label: 'CTA',      value: copy.ctaText && `${copy.ctaText}${copy.ctaUrl ? ` → ${copy.ctaUrl}` : ''}` },
            { label: 'Folder',   value: client.folderId || 'None set: it lands in the location’s top level' },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', gap: 8 }}>
              <dt style={{ fontWeight: 600, color: t.muted, minWidth: 70 }}>{label}</dt>
              <dd style={{ color: t.text, wordBreak: 'break-word' }}>{value || 'Not set'}</dd>
            </div>
          ))}
        </dl>
      </WfCard>

      {blockers.length > 0 && (
        <WfCard style={{ padding: 16, marginTop: 14, borderColor: 'rgba(180,83,9,0.35)' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#b45309', marginBottom: 6 }}>
            Claude listed {blockers.length} blocker{blockers.length === 1 ? '' : 's'} for this email
          </div>
          {blockers.map((b, i) => <div key={i} style={{ fontSize: 12.5, color: t.text, lineHeight: 1.6 }}>• {b}</div>)}
        </WfCard>
      )}

      {!email.renderedHtml && (
        <WfCard style={{ padding: 16, marginTop: 14, borderColor: 'rgba(180,83,9,0.35)' }}>
          <div style={{ fontSize: 12.5, color: '#b45309' }}>
            No rendered email yet. Go back to Preview, generate the images, and let the Rendered view load before pushing.
          </div>
        </WfCard>
      )}

      <div style={{ marginTop: 18 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: t.text, display: 'block', marginBottom: 6 }}>
          Notes <span style={{ fontWeight: 400, color: t.muted }}>(optional)</span>
        </label>
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any feedback for the record…"
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${t.border}`, background: t.inputBg,
                   color: t.text, fontSize: 13, fontFamily: 'Inter, sans-serif', lineHeight: 1.6, outline: 'none', resize: 'vertical' }} />
      </div>

      {error && <div style={{ fontSize: 12.5, color: '#dc2626', marginTop: 12 }}>{error}</div>}

      {/* Save the finished HTML without publishing anything to GHL. */}
      <div style={{ marginTop: 16 }}>
        <WfButton variant="ghost" onClick={handleSaveDb} disabled={dbSaving || !email.renderedHtml}
          style={{ width: '100%', justifyContent: 'center', padding: '12px 16px' }}>
          <IconDatabase size={15} stroke={2} /> {dbSaving ? 'Saving to database…' : 'Save to Database'}
        </WfButton>
        {dbMsg && <div style={{ fontSize: 12, color: '#16a34a', marginTop: 8, textAlign: 'center' }}>✓ {dbMsg}</div>}
        {dbErr && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 8, textAlign: 'center' }}>⚠ {dbErr}</div>}
        <div style={{ fontSize: 11.5, color: t.muted, marginTop: 8, textAlign: 'center' }}>
          Stores the client, the email number and the finished HTML. Approving saves it too.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <WfButton onClick={handleApprove} disabled={loading || !email.renderedHtml}
          style={{ flex: 1, justifyContent: 'center', padding: '12px 16px' }}>
          <IconCheck size={15} stroke={2.4} /> {loading ? 'Pushing to GHL…' : email.ghlTemplateId ? 'Approve & Update in GHL' : 'Approve & Push to GHL'}
        </WfButton>
        <WfButton variant="ghost" disabled={loading || !notes.trim()}
          title={notes.trim() ? '' : 'Write what needs changing first'}
          onClick={() => updateEmail(clientId, emailId, { status: 'needs_update', reviewNotes: notes })}
          style={{ flex: 1, justifyContent: 'center', padding: '12px 16px' }}>
          <IconRotate size={15} stroke={2.2} /> Send Back for Revision
        </WfButton>
      </div>
    </div>
  )
}
