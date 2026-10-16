/**
 * POST /.netlify/functions/wf-submit-feedback
 * Body: { feedback, clientName, wfClientId, week }
 * Returns: { id }
 *
 * Welcome-flow feedback, saved to public.email_wf_feedback on the shared
 * project (see _wfFeedback.js). week is the email the note was left on, 1-9,
 * or empty when it was left on the client's page: that note is for every
 * email. Claude reads these first the next time it writes that client's
 * emails.
 */
import { withAuth } from './_auth.js'
import { saveFeedback, feedbackConfigured } from './_wfFeedback.js'

const json = (statusCode, body) => ({
  statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})

const bearer = (event) => {
  const h = event.headers || {}
  const v = h.authorization || h.Authorization || ''
  return v.startsWith('Bearer ') ? v.slice(7) : ''
}

const rawHandler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' })
  if (!feedbackConfigured()) return json(503, { error: 'Welcome-flow feedback is not configured (AUTH_SUPABASE_URL / AUTH_SUPABASE_ANON_KEY)' })

  const token = bearer(event)
  if (!token) return json(401, { error: 'Sign in with Google to leave feedback' })

  let body
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf-8') : event.body
    body = JSON.parse(raw || '{}')
  } catch { return json(400, { error: 'Invalid JSON' }) }

  const feedback   = String(body.feedback || '').trim()
  const clientName = String(body.clientName || '').trim()
  const week       = body.week == null || body.week === '' ? null : Number(body.week)
  if (!feedback)   return json(400, { error: 'feedback is required' })
  if (!clientName) return json(400, { error: 'Open a client first, so the note is filed under them' })
  if (week !== null && !(Number.isInteger(week) && week >= 1 && week <= 9)) {
    return json(400, { error: `Invalid email number "${body.week}", expected 1-9` })
  }

  try {
    const row = await saveFeedback(token, {
      clientName, wfClientId: body.wfClientId, emailNumber: week, feedback,
      writtenBy: event.session?.email || null,
    })
    console.log(`[wf-submit-feedback] ${week ? `Email ${week}` : 'every email'} for ${clientName}`)
    return json(200, { id: row.id })
  } catch (err) {
    console.error('[wf-submit-feedback]', err.message)
    return json(500, { error: err.message })
  }
}

export const handler = withAuth(rawHandler)
