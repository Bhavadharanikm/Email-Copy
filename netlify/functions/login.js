/**
 * login.js — POST /.netlify/functions/login
 *
 * The only public write path into the app. Replaces the browser reading the
 * "Email Login" table with the anon key and comparing the PIN in JavaScript:
 * the PIN never leaves the server now, and the answer is a signed session.
 *
 *   { name }                       → { step: 'set-pin' | 'enter-pin' }
 *   { name, pin }                  → { token, user }        (returning user)
 *   { name, pin, action:'set-pin' }→ { token, user }        (first login, PIN was null)
 *
 * Admin is decided here from ADMIN_USERS (comma-separated names, default
 * "Pooja"), so it cannot be granted by editing anything in the browser. The
 * Role column is carried for display only.
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, SESSION_SECRET, ADMIN_USERS (optional)
 */
import { signSession } from './_auth.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
const TABLE        = 'Email Login'

const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

async function sb(path, method = 'GET', body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json', Prefer: method === 'PATCH' ? 'return=representation' : '',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text.slice(0, 200)}`)
  return text ? JSON.parse(text) : null
}

const adminNames = () => (process.env.ADMIN_USERS || 'Pooja').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

function sessionFor(row) {
  const name = row.Name || ''
  const user = { id: row.id, name, role: row.Role || 'Standard', isAdmin: adminNames().includes(name.toLowerCase()) }
  return { token: signSession(user), user }
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' })
  if (!SUPABASE_URL || !SUPABASE_KEY) return json(500, { error: 'Login is not configured on the server' })

  let body
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Bad request' }) }
  const name = String(body.name || '').trim()
  const pin  = String(body.pin  || '').trim()
  if (!name) return json(400, { error: 'Name is required' })

  /* Exact, case-insensitive match on the name — the old ilike had no escaping. */
  const rows = await sb(`${encodeURIComponent(TABLE)}?select=id,Name,PIN,Role&Name=ilike.${encodeURIComponent(name.replace(/[%_]/g, ''))}&limit=2`)
  if (!rows?.length) return json(404, { error: 'Name not found. Please check and try again.' })
  if (rows.length > 1) return json(409, { error: 'That name matches more than one account — ask an admin to fix it.' })
  const row = rows[0]
  const hasPin = row.PIN !== null && row.PIN !== undefined

  /* Step 1: which screen to show. Says nothing about the PIN itself. */
  if (!pin) return json(200, { step: hasPin ? 'enter-pin' : 'set-pin' })

  /* First login: set the PIN, then sign in. Refused if one already exists, so
     this path cannot be used to overwrite someone's PIN. */
  if (body.action === 'set-pin') {
    if (hasPin) return json(409, { error: 'A PIN is already set for this account.' })
    if (!/^\d{4,}$/.test(pin)) return json(400, { error: 'PIN must be at least 4 digits.' })
    await sb(`${encodeURIComponent(TABLE)}?id=eq.${row.id}`, 'PATCH', { PIN: Number(pin) })
    return json(200, sessionFor(row))
  }

  if (!hasPin) return json(409, { error: 'No PIN set yet — choose one first.' })
  if (String(row.PIN) !== pin) return json(401, { error: 'Incorrect PIN. Please try again.' })
  return json(200, sessionFor(row))
}
