/**
 * Saved campaign suggestions: public.campaign_suggestions on the shared project
 * (foiykssauiqmzawwmdrm, where Google sign-in runs). Every generated set is a
 * new row, so regenerating keeps the earlier versions.
 *
 * Read and written as the signed-in person (their Google token + the anon
 * key), like rb-save-email, so the table's own policy decides access.
 */
const AUTH_URL = (process.env.AUTH_SUPABASE_URL || '').replace(/\/+$/, '')
const ANON_KEY = process.env.AUTH_SUPABASE_ANON_KEY || ''
const TABLE    = `${AUTH_URL}/rest/v1/campaign_suggestions`

export const bearerOf = (event) => {
  const v = event.headers?.authorization || event.headers?.Authorization || ''
  return v.startsWith('Bearer ') ? v.slice(7) : ''
}

async function call(token, url, init = {}) {
  if (!AUTH_URL || !ANON_KEY) throw new Error('The shared database is not configured (AUTH_SUPABASE_URL / AUTH_SUPABASE_ANON_KEY)')
  if (!token) throw new Error('Sign in with Google to save suggestions')
  const res = await fetch(url, { ...init, headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers } })
  const text = await res.text()
  if (!res.ok) throw new Error(`Suggestions database ${res.status}: ${text.slice(0, 200)}`)
  return text ? JSON.parse(text) : null
}

export async function saveSuggestionSet(token, { locationId, clientName, month, generatedBy, result }) {
  const rows = await call(token, TABLE, {
    method: 'POST', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ location_id: locationId, client_name: clientName, month, generated_by: generatedBy || null, result }),
  })
  if (!rows?.[0]?.id) throw new Error('The database did not confirm the save. Check you are signed in with your @hiddengem.media account.')
  return { id: rows[0].id, generatedAt: rows[0].generated_at }
}

/** Every saved version for one client and month, newest first. */
export const listSuggestionSets = (token, locationId, month) =>
  call(token, `${TABLE}?location_id=eq.${encodeURIComponent(locationId)}&month=eq.${encodeURIComponent(month)}`
    + `&select=id,generated_at,generated_by,result&order=generated_at.desc&limit=20`)

/** Which clients already have suggestions for a month. */
export const clientsWithSets = (token, month) =>
  call(token, `${TABLE}?month=eq.${encodeURIComponent(month)}&select=location_id,generated_at&order=generated_at.desc&limit=1000`)

/** The months a client already has suggestions saved for. */
export const monthsWithSets = (token, locationId) =>
  call(token, `${TABLE}?location_id=eq.${encodeURIComponent(locationId)}&select=month,generated_at&order=generated_at.desc&limit=1000`)

/* ── Ratings and feedback: public.campaign_suggestion_feedback ─────────────
   One row per rating or note, never edited, so the history of what the team
   thought stays intact. `about` is a snapshot of what was rated, taken from
   the saved set, so the next run knows what each note refers to. */
const FEEDBACK = `${AUTH_URL}/rest/v1/campaign_suggestion_feedback`

export const TARGETS = ['analysis', 'first-1', 'first-2', 'second-1', 'second-2']

export async function getSuggestionSet(token, id) {
  const rows = await call(token, `${TABLE}?id=eq.${Number(id)}&select=id,location_id,month,result`)
  return rows?.[0] || null
}

export async function saveFeedback(token, row) {
  const rows = await call(token, FEEDBACK, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) })
  if (!rows?.[0]?.id) throw new Error('The database did not confirm the feedback was saved.')
  return rows[0]
}

/** Feedback on these saved sets, oldest first. */
export const feedbackForSets = (token, ids) => ids.length
  ? call(token, `${FEEDBACK}?set_id=in.(${ids.map(Number).join(',')})&select=id,set_id,target,rating,comment,created_by,created_at&order=created_at.asc`)
  : Promise.resolve([])

/** Everything the team has said about this client's suggestions, newest first. */
export const feedbackForClient = (token, locationId) =>
  call(token, `${FEEDBACK}?location_id=eq.${encodeURIComponent(locationId)}&select=month,target,rating,comment,about,created_by,created_at&order=created_at.desc&limit=80`)
