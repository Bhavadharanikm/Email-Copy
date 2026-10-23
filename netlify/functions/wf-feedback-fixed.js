/**
 * GET  /.netlify/functions/wf-feedback-fixed?clientName=X
 *        → { fixed: [{ wfEmailId, noteText, fixedBy, fixedAt }] }
 *        Without clientName: every client's marks, for the clients page.
 * POST /.netlify/functions/wf-feedback-fixed
 *        Body: { wfEmailId, clientName, emailNumber, noteText, fixed }
 *        → { ok: true }
 *
 * Which of a client's feedback notes an account manager has marked fixed.
 * The notes themselves stay where the client's platform writes them
 * (email_wf_emails.feedback in the welcome-flow project), untouched; the marks
 * live in public.email_wf_feedback_fixed on the shared project
 * (foiykssauiqmzawwmdrm). A note is matched by its text, so one the client
 * changes or adds shows as open again. fixed: false deletes the mark.
 *
 * Read and written as the signed-in person, with their own Google session token
 * and the project's anon key, so the table's own rule (signed-in
 * @hiddengem.media accounts only) decides.
 */
import { withAuth } from './_auth.js'

const AUTH_URL = (process.env.AUTH_SUPABASE_URL || '').replace(/\/+$/, '')
const ANON_KEY = process.env.AUTH_SUPABASE_ANON_KEY || ''
const TABLE    = `${AUTH_URL}/rest/v1/email_wf_feedback_fixed`

const json = (statusCode, body) => ({
  statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})

const bearer = (event) => {
  const h = event.headers || {}
  const v = h.authorization || h.Authorization || ''
  return v.startsWith('Bearer ') ? v.slice(7) : ''
}

const rawHandler = async (event) => {
  if (!AUTH_URL || !ANON_KEY) return json(503, { error: 'The shared database is not configured (AUTH_SUPABASE_URL / AUTH_SUPABASE_ANON_KEY)' })
  const token = bearer(event)
  if (!token) return json(401, { error: 'Sign in with Google to see which feedback is fixed' })
  const headers = { apikey: ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  try {
    if (event.httpMethod === 'GET') {
      const clientName = String(event.queryStringParameters?.clientName || '').trim()
      const q = (clientName ? `client_name=ilike.${encodeURIComponent(clientName.replace(/[%_*]/g, '\\$&'))}&` : '')
        + 'select=wf_email_id,note_text,fixed_by,fixed_at&limit=5000'
      const res = await fetch(`${TABLE}?${q}`, { headers })
      if (!res.ok) throw new Error(`Read failed (${res.status}): ${(await res.text()).slice(0, 200)}`)
      const rows = await res.json()
      return json(200, { fixed: rows.map(r => ({ wfEmailId: r.wf_email_id, noteText: r.note_text, fixedBy: r.fixed_by, fixedAt: r.fixed_at })) })
    }

    if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' })
    let body
    try {
      const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf-8') : event.body
      body = JSON.parse(raw || '{}')
    } catch { return json(400, { error: 'Invalid JSON' }) }

    const wfEmailId  = String(body.wfEmailId || '').trim()
    const clientName = String(body.clientName || '').trim()
    const noteText   = String(body.noteText || '').trim()
    if (!wfEmailId || !clientName || !noteText) return json(400, { error: 'wfEmailId, clientName and noteText are required' })

    if (body.fixed) {
      const week = Number(body.emailNumber)
      const res = await fetch(TABLE, {
        method: 'POST',
        /* Marking a note already marked is not an error: the unique index on the
           note says no, and the mark stands. */
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({
          wf_email_id: wfEmailId, client_name: clientName, note_text: noteText,
          email_number: Number.isInteger(week) && week >= 1 && week <= 9 ? week : null,
          fixed_by: event.session?.email || null,
        }),
      })
      if (!res.ok && res.status !== 409) throw new Error(`Save failed (${res.status}): ${(await res.text()).slice(0, 200)}`)
    } else {
      /* PostgREST cannot filter on md5(), so find the row by email, then match
         the text here. */
      const res = await fetch(`${TABLE}?wf_email_id=eq.${encodeURIComponent(wfEmailId)}&select=id,note_text`, { headers })
      if (!res.ok) throw new Error(`Read failed (${res.status}): ${(await res.text()).slice(0, 200)}`)
      const ids = (await res.json()).filter(r => r.note_text.trim() === noteText).map(r => r.id)
      for (const id of ids) {
        const del = await fetch(`${TABLE}?id=eq.${id}`, { method: 'DELETE', headers })
        if (!del.ok) throw new Error(`Undo failed (${del.status}): ${(await del.text()).slice(0, 200)}`)
      }
    }
    return json(200, { ok: true })
  } catch (err) {
    console.error('[wf-feedback-fixed]', err.message)
    return json(500, { error: err.message })
  }
}

export const handler = withAuth(rawHandler)
