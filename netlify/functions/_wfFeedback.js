/**
 * Welcome-flow feedback, stored in public.email_wf_feedback on the shared
 * project (foiykssauiqmzawwmdrm, the one Google sign-in runs on).
 *
 * One row per note: the client, the email it was left on (null = every email
 * for that client), the note, who wrote it. Read and written as the signed-in
 * person, with their own Google session token and the project's anon key, so
 * the table's own rule (signed-in @hiddengem.media accounts only) decides.
 */

const AUTH_URL = (process.env.AUTH_SUPABASE_URL || '').replace(/\/+$/, '')
const ANON_KEY = process.env.AUTH_SUPABASE_ANON_KEY || ''
const TABLE    = `${AUTH_URL}/rest/v1/email_wf_feedback`

export const feedbackConfigured = () => Boolean(AUTH_URL && ANON_KEY)

const headers = (token) => ({
  apikey: ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json',
})

export async function saveFeedback(token, { clientName, wfClientId, emailNumber, feedback, writtenBy }) {
  const res = await fetch(TABLE, {
    method: 'POST',
    headers: { ...headers(token), Prefer: 'return=representation' },
    body: JSON.stringify({
      client_name:  clientName,
      wf_client_id: wfClientId || null,
      email_number: emailNumber || null,
      feedback,
      written_by:   writtenBy || null,
    }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Feedback save failed (${res.status}): ${text.slice(0, 200)}`)
  const row = JSON.parse(text)?.[0]
  if (!row?.id) throw new Error('The database did not confirm the save. Check that you are signed in with your @hiddengem.media account.')
  return row
}

/* A note left on one email that says it is for every email still counts for
   the others. */
const ALL_EMAILS_RE = /\b(all|every|each)\s+(of\s+)?(the\s+)?(welcome\s+)?(flow\s+)?emails?\b/i

/**
 * This client's notes that apply to this email, oldest first: notes left on
 * this email, notes left for every email, and notes left on another email
 * whose words say they are for every email. Returns [] when there is no token
 * or the table can't be read, so a missing note never stops the copy.
 */
export async function fetchFeedbackFor(token, clientName, week) {
  if (!token || !feedbackConfigured() || !clientName) return []
  const q = `client_name=ilike.${encodeURIComponent(clientName.replace(/[%_]/g, '\\$&'))}`
    + '&select=email_number,feedback,written_by,created_at&order=created_at.asc'
  const res = await fetch(`${TABLE}?${q}`, { headers: headers(token) })
  if (!res.ok) {
    console.error('[wf-feedback] read failed', res.status, (await res.text()).slice(0, 200))
    return []
  }
  const rows = await res.json()
  return rows.filter(r => r.email_number == null || r.email_number === Number(week) || ALL_EMAILS_RE.test(r.feedback))
}

/** The notes as the text Claude reads, each tagged with where it was left. */
export function feedbackText(rows) {
  return rows.map(r => {
    const where = r.email_number == null ? 'left for every email' : `left on Email ${r.email_number}`
    const date  = (r.created_at || '').slice(0, 10)
    return `- (${where}${date ? `, ${date}` : ''}) ${r.feedback.trim()}`
  }).join('\n')
}
