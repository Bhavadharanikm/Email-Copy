/**
 * _authGoogle.js — the second way a request can prove who it is.
 *
 * The video analyser signs people in with Google through Supabase Auth on the
 * shared project (foiykssauiqmzawwmdrm). This app accepts the very same token,
 * so one Google account opens both tools and there is one place to grant and
 * revoke: that project's users and its feature_access table.
 *
 * A token arrives as a normal Bearer header, so nothing else in the app has to
 * know which of the two kinds it is holding. _auth.js tries its own HMAC
 * session first and falls through to here.
 *
 * Env:
 *   AUTH_SUPABASE_URL          the shared project's URL. Unset = Google is off.
 *   AUTH_SUPABASE_ANON_KEY     its anon key (public; safe in a browser).
 *   AUTH_SUPABASE_SERVICE_KEY  optional, only to read feature_access past RLS.
 *   AUTH_EMAIL_DOMAIN          defaults to hiddengem.media.
 *   AUTH_FEATURE               e.g. email_generator. Unset = the domain is the
 *                              only gate, which is how this starts.
 */

const AUTH_URL     = (process.env.AUTH_SUPABASE_URL || '').replace(/\/+$/, '')
const ANON_KEY     = process.env.AUTH_SUPABASE_ANON_KEY || ''
const SERVICE_KEY  = process.env.AUTH_SUPABASE_SERVICE_KEY || ''
const DOMAIN       = (process.env.AUTH_EMAIL_DOMAIN || 'hiddengem.media').toLowerCase()
const FEATURE      = (process.env.AUTH_FEATURE || '').trim()
const ADMIN_LIST   = (process.env.ADMIN_USERS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

export const googleAuthConfigured = !!(AUTH_URL && ANON_KEY)

/* Verifying means a round trip to Supabase, and a page can fire a dozen calls
   at once. A short cache keeps that to one per token per minute, per warm
   instance. Cleared wholesale rather than per entry: it is a cache, not a store. */
const seen = new Map()
const CACHE_MS = 60_000

function cacheGet(token) {
  const hit = seen.get(token)
  if (!hit) return undefined
  if (hit.until < Date.now()) { seen.delete(token); return undefined }
  return hit.session
}
function cacheSet(token, session) {
  if (seen.size > 300) seen.clear()
  seen.set(token, { session, until: Date.now() + CACHE_MS })
}

async function fetchUser(token) {
  const res = await fetch(`${AUTH_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY },
  })
  if (!res.ok) return null
  return res.json()
}

/** The features this email is granted. Empty when it cannot be read. */
async function featuresFor(email, token) {
  const key = SERVICE_KEY || ANON_KEY
  const auth = SERVICE_KEY ? SERVICE_KEY : token
  try {
    const res = await fetch(
      `${AUTH_URL}/rest/v1/feature_access?select=feature&email=eq.${encodeURIComponent(email)}`,
      { headers: { apikey: key, Authorization: `Bearer ${auth}` } },
    )
    if (!res.ok) return null
    const rows = await res.json()
    return Array.isArray(rows) ? rows.map(r => String(r.feature || '').trim()) : null
  } catch { return null }
}

/**
 * A verified Google session as { id, name, role, isAdmin }, or null. Null for
 * anything this cannot vouch for: no token, a token the project rejects, an
 * address outside the company, or a missing grant once AUTH_FEATURE is set.
 */
export async function googleSessionFrom(event) {
  if (!googleAuthConfigured) return null
  const h = event?.headers || {}
  const m = /^Bearer\s+(.+)$/i.exec(String(h.authorization || h.Authorization || '').trim())
  if (!m) return null
  const token = m[1]
  /* Our own sessions are two dot-separated parts; a Google one is three. */
  if (token.split('.').length !== 3) return null

  const cached = cacheGet(token)
  if (cached !== undefined) return cached

  try {
    const user = await fetchUser(token)
    const email = String(user?.email || '').trim().toLowerCase()
    if (!email) { cacheSet(token, null); return null }

    if (!email.endsWith(`@${DOMAIN}`)) {
      console.warn(`[auth] rejected ${email}: outside @${DOMAIN}`)
      cacheSet(token, null)
      return null
    }

    const granted = FEATURE || ADMIN_LIST.length ? await featuresFor(email, token) : null

    if (FEATURE) {
      if (granted === null) {
        console.error(`[auth] AUTH_FEATURE=${FEATURE} is set but feature_access could not be read — denying ${email}`)
        cacheSet(token, null)
        return null
      }
      if (!granted.includes(FEATURE)) {
        console.warn(`[auth] ${email} has no ${FEATURE} grant`)
        cacheSet(token, null)
        return null
      }
    }

    const name = String(user?.user_metadata?.full_name || user?.user_metadata?.name || email.split('@')[0]).trim()
    const session = {
      id: user.id || email,
      name,
      role: 'Google',
      /* Admin comes from the shared project's own admin grant, with the env
         list kept as a fallback so this app is never left without one. */
      isAdmin: (granted || []).includes('admin') || ADMIN_LIST.includes(email) || ADMIN_LIST.includes(name.toLowerCase()),
      email,
    }
    cacheSet(token, session)
    return session
  } catch (err) {
    console.error('[auth] Google check failed:', err.message)
    return null
  }
}
