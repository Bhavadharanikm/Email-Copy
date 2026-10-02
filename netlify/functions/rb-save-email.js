/**
 * POST /.netlify/functions/rb-save-email
 * Body: { clientName, locationId, emailNumber, renderedHtml }
 * Returns: { id, action: 'saved' | 'updated' }
 *
 * Stores a Repeat Booking email in public.rb_emails on the shared project
 * (foiykssauiqmzawwmdrm, the one Google sign-in runs on): one row per client
 * per email (1-3), the finished HTML. Saving again replaces that row.
 *
 * Written as the signed-in person, with their own Google session token and the
 * project's anon key, so the table's own rule (signed-in @hiddengem.media
 * accounts only) decides, and no service key is needed.
 */
import { withAuth } from './_auth.js'

const AUTH_URL = (process.env.AUTH_SUPABASE_URL || '').replace(/\/+$/, '')
const ANON_KEY = process.env.AUTH_SUPABASE_ANON_KEY || ''

const json = (statusCode, body) => ({
  statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})

const bearer = (event) => {
  const h = event.headers || {}
  const v = h.authorization || h.Authorization || ''
  return v.startsWith('Bearer ') ? v.slice(7) : ''
}

const rawHandler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' })
  if (!AUTH_URL || !ANON_KEY) return json(500, { error: 'The shared database is not configured (AUTH_SUPABASE_URL / AUTH_SUPABASE_ANON_KEY)' })

  const token = bearer(event)
  if (!token) return json(401, { error: 'Sign in with Google to save to the database' })

  let body
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf-8') : event.body
    body = JSON.parse(raw || '{}')
  } catch { return json(400, { error: 'Invalid JSON' }) }

  const clientName = String(body.clientName || '').trim()
  const emailNumber = Number(body.emailNumber)
  const renderedHtml = String(body.renderedHtml || '')
  if (!clientName) return json(400, { error: 'clientName is required' })
  if (![1, 2, 3].includes(emailNumber)) return json(400, { error: `Invalid email number "${body.emailNumber}", expected 1-3` })
  if (!renderedHtml.trim()) return json(400, { error: 'There is no rendered HTML to save yet. Open the Preview step first.' })

  const headers = {
    apikey: ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json',
  }
  const base = `${AUTH_URL}/rest/v1/rb_emails`
  const match = `client_name=eq.${encodeURIComponent(clientName)}&email_number=eq.${emailNumber}`

  try {
    /* Update in place when the row exists, so a re-save keeps its id. */
    const existing = await fetch(`${base}?${match}&select=id`, { headers }).then(r => r.ok ? r.json() : [])
    const row = {
      client_name: clientName,
      location_id: body.locationId || null,
      email_number: emailNumber,
      rendered_html: renderedHtml,
      saved_by: event.session?.email || null,
      updated_at: new Date().toISOString(),
    }
    const res = existing?.[0]
      ? await fetch(`${base}?${match}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify(row) })
      : await fetch(base, { method: 'POST', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify(row) })
    const text = await res.text()
    if (!res.ok) throw new Error(`Database save failed (${res.status}): ${text.slice(0, 200)}`)
    const saved = JSON.parse(text)?.[0]
    if (!saved?.id) throw new Error('The database did not confirm the save. Check that you are signed in with your @hiddengem.media account.')
    return json(200, { id: saved.id, action: existing?.[0] ? 'updated' : 'saved' })
  } catch (err) {
    console.error('[rb-save-email]', err.message)
    return json(500, { error: err.message })
  }
}

export const handler = withAuth(rawHandler)
