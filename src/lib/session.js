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

/**
 * The same, but asking Google's client for the token rather than trusting the
 * copy sitting in storage.
 *
 * A Google access token lasts an hour. The copy here is only refreshed when the
 * auth listener happens to fire, so a page that calls the server the moment it
 * opens could easily send one that has just lapsed — which came back as 401 and
 * threw the person out of a page that was working a second earlier. getSession
 * hands back a live token, renewing it first if it is due, so the request goes
 * out valid and a 401 once again means what it should: not signed in.
 */
export async function freshAuthHeaders() {
  try {
    const m = await import('./authGoogle')
    if (m.googleAuthReady) {
      const { data } = await m.authClient.auth.getSession()
      const token = data?.session?.access_token
      if (token) {
        const stored = readSession()
        if (stored && stored.token !== token) writeSession({ ...stored, token })
        return { Authorization: `Bearer ${token}` }
      }
    }
  } catch { /* fall back to whatever is stored */ }
  return authHeaders()
}

/* Only one recovery is worth attempting per page, and not again straight away
   after a reload, or a token the server keeps refusing would reload forever. */
const RECOVER_MARK = 'hgm_auth_recovered_at'
const RECOVER_GAP  = 30_000
let recovering = false

/**
 * A 401 means the server would not take the token. Usually it has simply gone
 * stale — a Google one lasts an hour — so the first move is to ask for a fresh
 * one and carry on where we were.
 *
 * What this must never do is sign out of Google. That ends the session for
 * every tab at once, and since a single stale request is enough to land here,
 * one forgotten tab would throw everybody out repeatedly. Signing out is what
 * the Log out button is for.
 */
export async function handleUnauthorized() {
  /* Only to keep a burst of failing calls from all recovering at once. It has
     to be released on every path, including the one that reloads: a flag left
     raised would make every later 401 do nothing at all. */
  if (recovering) return
  recovering = true
  try {
    clearSession()

    const lastTry = Number(sessionStorage.getItem(RECOVER_MARK) || 0)
    if (Date.now() - lastTry > RECOVER_GAP) {
      try {
        const m = await import('./authGoogle')
        if (m.googleAuthReady) {
          const { data } = await m.authClient.auth.refreshSession()
          const session = data?.session
          if (session?.access_token && m.isAllowedEmail(session.user?.email)) {
            writeSession({ token: session.access_token, user: m.userFromGoogle(session.user) })
            sessionStorage.setItem(RECOVER_MARK, String(Date.now()))
            location.reload()
            return
          }
        }
      } catch { /* no way back; the sign-in page it is */ }
    }

    if (!location.pathname.startsWith('/login')) location.assign('/login')
  } finally {
    recovering = false
  }
}

/* fetch() with the session attached. For the handful of places that call a
   function directly instead of through lib/api.js — a raw fetch sends no
   token and gets a 401 back.

   A 401 is handled here the way lib/api.js handles it, because the whole
   welcome flow goes through this one. Without it a token the server will not
   take leaves the app reading "that email no longer exists" for good, with no
   way back in. */
export async function authFetch(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { ...(init.headers || {}), ...(await freshAuthHeaders()) } })
  if (res.status === 401) handleUnauthorized()
  return res
}
