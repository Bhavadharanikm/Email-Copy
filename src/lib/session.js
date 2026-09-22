/**
 * session.js — the signed session the browser holds.
 *
 * Stored as { token, user } where user is { id, name, role, isAdmin }. The
 * token is what the server trusts; user is a convenience copy for the UI and
 * is re-derived from the server on every login. Editing it changes nothing
 * the server will honour, because every request is checked against the token.
 */
const KEY = 'hgm_email_session'

export function readSession() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null')
    return s && typeof s.token === 'string' && s.user ? s : null
  } catch { return null }
}

export function writeSession(session) {
  localStorage.setItem(KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(KEY)
  localStorage.removeItem('hgm_email_user')   // the pre-token shape, so old sessions cannot linger
}

/** Headers to attach to every API call. Empty when signed out. */
export function authHeaders() {
  const s = readSession()
  return s ? { Authorization: `Bearer ${s.token}` } : {}
}

/** A 401 means the token is missing, forged or expired: sign out and start over. */
export function handleUnauthorized() {
  clearSession()
  /* A Google session lives in its own storage. Without dropping that too, the
     auth listener would put the rejected token straight back and the app would
     bounce between here and the login screen. */
  import('./authGoogle').then(m => m.googleSignOut()).catch(() => {})
  if (!location.pathname.startsWith('/login')) location.assign('/login')
}

/* fetch() with the session attached. For the handful of places that call a
   function directly instead of through lib/api.js — a raw fetch sends no
   token and gets a 401 back.

   A 401 is handled here the way lib/api.js handles it, because the whole
   welcome flow goes through this one. Without it a token the server will not
   take leaves the app reading "that email no longer exists" for good, with no
   way back to the sign-in screen. A Google session can be ended on the server
   while the token in this browser still looks unexpired, so this is not only
   about tokens running out. */
export async function authFetch(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { ...(init.headers || {}), ...authHeaders() } })
  if (res.status === 401) handleUnauthorized()
  return res
}
