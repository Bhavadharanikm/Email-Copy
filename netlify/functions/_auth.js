/**
 * _auth.js — the one place a request's identity is decided.
 *
 * Sessions are HMAC-signed tokens (SHA-256 over a base64url payload) issued by
 * login.js and checked here. There is no server-side session store: the
 * signature is the proof, so a token edited in the browser fails to verify and
 * a token can only be minted by something holding SESSION_SECRET.
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
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

const SECRET   = process.env.SESSION_SECRET || ''
const TTL_SECS = 7 * 24 * 60 * 60   // a week; login is a name and a PIN, not worth more

const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
const unb64u = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')

const sign = (data) => b64u(createHmac('sha256', SECRET).update(data).digest())

export function signSession({ id, name, role, isAdmin }) {
  if (!SECRET) throw new Error('SESSION_SECRET is not set')
  const payload = b64u(JSON.stringify({ id, name, role, isAdmin: !!isAdmin, exp: Math.floor(Date.now() / 1000) + TTL_SECS }))
  return `${payload}.${sign(payload)}`
}

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
    if (opts.allow && opts.allow(event)) return handler(event, context)
    /* Misconfiguration reads as "everyone is locked out", which is the safe
       direction, but say why in the log so it is not mistaken for a bad token. */
    if (!SECRET) console.error('[auth] SESSION_SECRET is not set — every session check fails until it is')
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
