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
  if (!location.pathname.startsWith('/login')) location.assign('/login')
}
