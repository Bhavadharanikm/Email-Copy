/**
 * Repeat Booking — email brief (step 1).
 *
 * The client and the email are fixed by the route. The prompt box is seeded
 * with the email prompt's PER-RUN INPUT fields; whatever is typed goes to
 * Claude as written, alongside the client's copy brief doc and brand row.
 *
 * Claude runs in its own request (rb-claude-copy-background) and writes its
 * result to copy_jobs; this page polls copy-callback for it, as the welcome
 * flow does. If that request itself fails, the error shows straight away.
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconArrowLeft } from '@tabler/icons-react'
import { useRepeatBookingStore } from '../store/repeatBookingStore'
import { useWfTheme, WfCard, WfButton, WfInput, WfStepNav } from '../../welcome-flow/components/wfUi'
import { rbEmail, rbEmailDetail, rbBriefTemplate } from '../rbEmails'
import { authFetch } from '../../lib/session'
import { useRbEmail, rbPath, RBMissing } from '../components/rbShared'

const POLL_INTERVAL_MS = 2_000
const POLL_LIMIT_MS    = 5 * 60_000     // the write plus the review usually take 1 to 3 minutes

function folderIdFrom(url = '') {
  const m = url.match(/[?&]folderId=([^&\s]+)/)
  return m ? m[1] : ''
}

/** Polls copy_jobs until the row lands, until failed() reports the request
    died, or until five minutes after the run started. */
async function pollForResult(jobId, startedAt, failed, cancelled) {
  while (Date.now() - startedAt < POLL_LIMIT_MS) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
    if (cancelled()) return null
    if (failed()) throw new Error(failed())
    const res  = await authFetch(`/.netlify/functions/copy-callback?jobId=${encodeURIComponent(jobId)}`)
    const data = await res.json()
    if (data.status === 'done')  return data
    if (data.status === 'error') throw new Error(data.error || 'Copy generation failed')
  }
  throw new Error('No copy after 5 minutes. The run may have been interrupted. Generate again.')
}

export default function RBBrief() {
  const navigate = useNavigate()
  const t = useWfTheme()
  const { clientId, emailId, client, email, navEmail } = useRbEmail()
  const { updateClient, updateEmail } = useRepeatBookingStore()
  /* The earlier emails' briefs, latest first, so a later email starts with the
     same client facts, code and terms, and stay types. */
  const earlierBriefs = useRepeatBookingStore(s => (s.emails[clientId] || [])
    .filter(e => e.brief && e.email < (s.emails[clientId] || []).find(x => x.id === emailId)?.email)
    .sort((a, b) => b.email - a.email).map(e => e.brief).join('\n'))

  const [folderUrl, setFolderUrl]   = useState('')
  const [prompt, setPrompt]         = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError]     = useState('')
  const [elapsed, setElapsed]       = useState(0)

  useEffect(() => {
    if (!client || !email) return
    setFolderUrl(client.folderUrl || '')
    setPrompt(email.brief || rbBriefTemplate(client.name, email.email, earlierBriefs))
  }, [client?.id, email?.id])   // eslint-disable-line react-hooks/exhaustive-deps

  /* A run in progress is saved with the email, so a page reload, or leaving
     and coming back, picks the wait up again instead of dropping it. */
  const leftPage = useRef(false)
  const waitingOn = useRef(null)   // the job being polled, so it is never polled twice
  useEffect(() => { leftPage.current = false; return () => { leftPage.current = true } }, [])
  useEffect(() => {
    const p = email?.pendingJob
    if (!p || generating || waitingOn.current === p.id) return
    if (Date.now() - p.startedAt >= POLL_LIMIT_MS) { updateEmail(clientId, emailId, { pendingJob: null }); return }
    waitForCopy(p.id, p.startedAt, () => '')
  }, [email?.id])   // eslint-disable-line react-hooks/exhaustive-deps

  async function waitForCopy(jobId, startedAt, failed) {
    waitingOn.current = jobId
    setGenerating(true); setGenError('')
    setElapsed(Math.round((Date.now() - startedAt) / 1000))
    const tick = setInterval(() => setElapsed(Math.round((Date.now() - startedAt) / 1000)), 1000)
    try {
      const reply = await pollForResult(jobId, startedAt, failed, () => leftPage.current)
      if (!reply) return   // left the page: the run carries on and is picked up on return
      const variations = reply.copy?.variations || []
      if (!variations.length) throw new Error('Claude returned no variations. Try again.')
      const current = useRepeatBookingStore.getState().getEmail(clientId, emailId)
      updateEmail(clientId, emailId, {
        pendingJob: null,
        variations,
        selectedVariation: 0,
        copy:    variations[0],
        subject: variations[0]?.subjectLine || '',
        notes:   reply.copy?.notes || null,
        ...(current?.status === 'draft' ? { status: 'ready' } : {}),
      })
      navigate(rbPath(clientId, emailId, 'copy'))
    } catch (e) {
      updateEmail(clientId, emailId, { pendingJob: null })
      setGenError(e.message)
    } finally {
      clearInterval(tick)
      if (waitingOn.current === jobId) waitingOn.current = null
      if (!leftPage.current) setGenerating(false)
    }
  }

  if (!client || !email) return <RBMissing />

  const info     = rbEmail(email.email)
  const folderId = folderIdFrom(folderUrl)
  const persist  = () => {
    updateClient(clientId, { folderUrl, folderId })
    updateEmail(clientId, emailId, { brief: prompt })
  }

  function handleGenerate() {
    persist()
    const jobId = crypto.randomUUID()
    const startedAt = Date.now()
    updateEmail(clientId, emailId, { pendingJob: { id: jobId, startedAt } })
    let requestError = ''
    /* Not awaited: on Vercel this request stays open while Claude writes. A
       reply of 400 or more means it failed before or while writing; any other
       end (202 from netlify dev, a dropped connection) leaves the poll to it. */
    authFetch('/.netlify/functions/rb-claude-copy-background', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, email: email.email, prompt, clientName: client.name }),
    }).then(async (r) => {
      if (r.status >= 400) {
        const d = await r.json().catch(() => ({}))
        requestError = d.error || `The copy request failed (${r.status})`
      }
    }).catch(() => {})
    waitForCopy(jobId, startedAt, () => requestError)
  }

  const label = { fontSize: 12, fontWeight: 700, color: t.text, display: 'block', marginBottom: 6 }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '28px 24px 64px' }}>
      <WfStepNav
        email={navEmail} step={1}
        backLabel={client.name}
        onBack={() => { persist(); navigate(`/repeat-booking/${encodeURIComponent(clientId)}`) }}
        nextLabel={email.variations?.length ? 'Next: Copy' : undefined}
        onNext={email.variations?.length ? () => { persist(); navigate(rbPath(clientId, emailId, 'copy')) } : undefined}
      />

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: t.text }}>Email Brief</h1>
        <p style={{ fontSize: 13, color: t.muted, margin: '7px 0 0' }}>
          Fill in this send's details. Claude writes three variations from them and the client's copy brief.
        </p>
      </div>

      <WfCard style={{ padding: 24 }}>
        <div style={{ marginBottom: 18 }}>
          <label style={label}>Client</label>
          <div style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${t.border}`,
                        background: t.dark ? 'rgba(255,255,255,0.02)' : '#f9fafb', fontSize: 13, color: t.text }}>
            {client.name}
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={label}>Repeat Booking Email</label>
          <div style={{ padding: '11px 12px', borderRadius: 10, border: `1px solid ${t.border}`, background: t.inputBg, color: t.text, fontSize: 13 }}>
            <strong style={{ fontWeight: 700 }}>Email {email.email}</strong> · {rbEmailDetail(email.email)}
          </div>
          {info?.what && <div style={{ fontSize: 12, color: t.muted, marginTop: 6 }}>{info.what}</div>}
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={label}>
            GHL Folder URL <span style={{ fontWeight: 400, color: t.muted }}>saved to this client, so you only enter it once</span>
          </label>
          <WfInput value={folderUrl} onChange={(e) => setFolderUrl(e.target.value)} onBlur={persist}
            placeholder="https://app.gohighlevel.com/v2/location/…/marketing/emails/all?folderId=…" />
          {folderId && <div style={{ fontSize: 11.5, color: '#16a34a', marginTop: 6 }}>✓ Folder ID: {folderId}</div>}
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={label}>
            This send's details <span style={{ fontWeight: 400, color: t.muted }}>sent to Claude as written</span>
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onBlur={persist}
            rows={14}
            style={{ width: '100%', padding: '11px 12px', borderRadius: 10, border: `1px solid ${t.border}`,
                     background: t.inputBg, color: t.text, fontSize: 13, fontFamily: 'ui-monospace, Menlo, monospace',
                     lineHeight: 1.6, outline: 'none', resize: 'vertical' }}
          />
          <div style={{ fontSize: 11.5, color: t.muted, marginTop: 6 }}>
            Anything left empty is read from the REPEAT BOOKING FLOW section of the client's copy brief. If the brief doesn't have it either, Claude lists it under Blockers with the question to ask the client.
          </div>
        </div>

        <WfButton disabled={!prompt.trim() || generating} onClick={handleGenerate}
          style={{ width: '100%', justifyContent: 'center', padding: '12px 16px' }}>
          {generating ? `Writing copy… ${elapsed}s` : 'Generate Copy with Claude →'}
        </WfButton>
        {genError && <div style={{ fontSize: 12.5, color: '#dc2626', marginTop: 10 }}>{genError}</div>}
        {generating && (
          <div style={{ fontSize: 11.5, color: t.muted, marginTop: 8, textAlign: 'center' }}>
            Claude writes, then checks its draft against the brief. Usually one to three minutes. Leaving this page cancels the wait.
          </div>
        )}

        <WfButton variant="ghost" style={{ marginTop: 14 }}
          onClick={() => { persist(); navigate(`/repeat-booking/${encodeURIComponent(clientId)}`) }}>
          <IconArrowLeft size={15} stroke={2.4} /> All emails
        </WfButton>
      </WfCard>
    </div>
  )
}
