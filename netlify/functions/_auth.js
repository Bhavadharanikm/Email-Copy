/**
 * _auth.js — the one place a request's identity is decided.
 *
 * Signing in means Google, on the Supabase project the video analyser uses —
 * see _authGoogle.js. That is the only way to get a session now.
 *
 * The HMAC-signed tokens the old name-and-PIN sign-in issued are still checked
 * here so a session already in someone's browser is not cut off mid-edit, but
 * nothing mints them any more: login.js and signSession are both gone. They
 * lapse on their own within a week, after which this path never matches again
 * and can be deleted.
 *
 * withAuth(handler, opts) wraps a Netlify-style handler so the check happens
 * before the handler runs, on both Vercel (through api/_adapter.js) and
 * `netlify dev`, which calls handlers directly.
 *
 *   opts.public   — skip the session check entirely (login; endpoints with
 *                   their own key, like fetch-email-stats)
 *   opts.allow    — (event) => true to admit a request that carries no
 *                   session, e.g. n8n posting to copy-callback with its secret
 *
 * A verified session is attached as event.session = { id, name, role, isAdmin }.
 *
 * Two kinds of token are accepted. This app's own signed session, and a Google
 * sign-in from the Supabase project the video analyser uses — see _authGoogle.js.
 * The HMAC one is tried first because it needs no network call.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'
import { googleSessionFrom, googleAuthConfigured } from './_authGoogle.js'

const SECRET   = process.env.SESSION_SECRET || ''

const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
const unb64u = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')

const sign = (data) => b64u(createHmac('sha256', SECRET).update(data).digest())

/** Returns the session payload, or null for anything missing, forged or expired. */
export function verifySession(token) {
  if (!SECRET || typeof token !== 'string') return null
  const dot = token.lastIndexOf('.')
  if (dot < 1) return null
  const payload = token.slice(0, dot), sig = token.slice(dot + 1)
  const expected = sign(payload)
  /* Constant-time compare, and only when the lengths already agree — a length
     mismatch is a forgery anyway and timingSafeEqual throws on it. */
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  try {
    const data = JSON.parse(unb64u(payload).toString('utf8'))
    if (!data?.exp || data.exp < Math.floor(Date.now() / 1000)) return null
    return { id: data.id, name: data.name, role: data.role, isAdmin: !!data.isAdmin }
  } catch { return null }
}

/** The bearer token from an incoming event, or null. Header names are lower-cased by both runtimes. */
export function sessionFrom(event) {
  const h = event?.headers || {}
  const raw = h.authorization || h.Authorization || ''
  const m = /^Bearer\s+(.+)$/i.exec(raw.trim())
  return m ? verifySession(m[1]) : null
}

const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export function withAuth(handler, opts = {}) {
  return async (event, context) => {
    if (opts.public) return handler(event, context)
    const session = sessionFrom(event)
    if (session) { event.session = session; return handler(event, context) }
    /* Not one of ours. It may be a Google sign-in on the shared Supabase
       project, which is the same account that opens the video tool. */
    const google = await googleSessionFrom(event)
    if (google) { event.session = google; return handler(event, context) }
    if (opts.allow && opts.allow(event)) return handler(event, context)
    /* Misconfiguration reads as "everyone is locked out", which is the safe
       direction, but say why in the log so it is not mistaken for a bad token. */
    if (!googleAuthConfigured) console.error('[auth] AUTH_SUPABASE_URL is not set — nobody can sign in until it is')
    return json(401, { error: 'Sign in required' })
  }
}

/** For copy-callback: n8n proves itself with a shared secret instead of a session. */
export function hasCallbackSecret(event) {
  const want = process.env.N8N_CALLBACK_SECRET || ''
  const got  = (event?.headers || {})['x-callback-secret'] || ''
  if (!want) {
    /* Not configured yet: admit the callback so copy keeps arriving, and say so
       loudly. This is the one deliberate soft spot — close it by setting the
       variable here and the header in n8n. */
    console.warn('[auth] N8N_CALLBACK_SECRET is not set — copy-callback POST is accepting unauthenticated calls')
    return true
  }
  return got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want))
}
