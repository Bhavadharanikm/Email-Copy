/**
 * /.netlify/functions/rb-data — the Repeat Booking flow's shared data.
 *
 *   GET                                   → { clients: [...], emails: [...] }
 *   POST { kind: 'client', client }       → { ok: true }   upserts rb_clients
 *   POST { kind: 'email', clientName,
 *          locationId, email }            → { ok: true }   upserts rb_emails.state
 *
 * Both tables are on the shared project (foiykssauiqmzawwmdrm, the one Google
 * sign-in runs on). rb_emails keeps one row per client per email (1-3): the
 * whole working state in `state`, the finished HTML in `rendered_html`, which
 * rb-save-email writes. Each write here touches only its own columns, so the
 * two never overwrite each other.
 *
 * Read and written as the signed-in person, with their own Google session
 * token and the anon key, so the tables' own rule (signed-in @hiddengem.media
 * accounts only) decides, and no service key is needed.
 */
import { withAuth } from './_auth.js'

const AUTH_URL = (process.env.AUTH_SUPABASE_URL || '').replace(/\/+$/, '')
const ANON_KEY = process.env.AUTH_SUPABASE_ANON_KEY || ''
const MAX_STATE_BYTES = 2_000_000   // an email's state is tens of KB; this only stops a runaway write

const json = (statusCode, body) => ({
  statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})

const bearer = (event) => {
  const h = event.headers || {}
  const v = h.authorization || h.Authorization || ''
  return v.startsWith('Bearer ') ? v.slice(7) : ''
}

async function rest(token, path, init = {}) {
  const res = await fetch(`${AUTH_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Database request failed (${res.status}): ${text.slice(0, 200)}`)
  return text ? JSON.parse(text) : null
}

/** Insert, or update only the given columns of the row the conflict key names. */
const upsert = (token, table, onConflict, row) => rest(token, `${table}?on_conflict=${onConflict}`, {
  method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(row),
})

const rawHandler = async (event) => {
  if (!AUTH_URL || !ANON_KEY) return json(500, { error: 'The shared database is not configured (AUTH_SUPABASE_URL / AUTH_SUPABASE_ANON_KEY)' })
  const token = bearer(event)
  if (!token) return json(401, { error: 'Sign in with Google to use the Repeat Booking flow' })
  const who = event.session?.email || null

  try {
    if (event.httpMethod === 'GET') {
      const [clients, emails] = await Promise.all([
        rest(token, 'rb_clients?select=*&order=client_name'),
        rest(token, 'rb_emails?select=id,client_name,location_id,email_number,state,rendered_html,saved_by,updated_by,updated_at&order=email_number'),
      ])
      return json(200, { clients: clients || [], emails: emails || [] })
    }

    if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' })

    let body
    try {
      const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf-8') : event.body
      body = JSON.parse(raw || '{}')
    } catch { return json(400, { error: 'Invalid JSON' }) }

    if (body.kind === 'client') {
      const c = body.client || {}
      const locationId = String(c.locationId || '').trim()
      const name = String(c.name || '').trim()
      if (!locationId || !name) return json(400, { error: 'A client needs a locationId and a name' })
      const saved = await upsert(token, 'rb_clients', 'location_id', {
        location_id: locationId, client_name: name,
        logo_url: c.logoUrl || '', folder_url: c.folderUrl || '', folder_id: c.folderId || '',
        ...(c.isNew ? { added_by: who } : {}),
        updated_by: who, updated_at: new Date().toISOString(),
      })
      if (!saved?.[0]) throw new Error('The database did not confirm the save. Check that you are signed in with your @hiddengem.media account.')
      return json(200, { ok: true })
    }

    if (body.kind === 'email') {
      const clientName = String(body.clientName || '').trim()
      const email = body.email || {}
      const emailNumber = Number(email.email)
      if (!clientName) return json(400, { error: 'clientName is required' })
      if (![1, 2, 3].includes(emailNumber)) return json(400, { error: `Invalid email number "${email.email}", expected 1-3` })
      if (JSON.stringify(email).length > MAX_STATE_BYTES) return json(413, { error: 'This email is too large to save' })
      const saved = await upsert(token, 'rb_emails', 'client_name,email_number', {
        client_name: clientName, location_id: body.locationId || null, email_number: emailNumber,
        state: email, updated_by: who, updated_at: new Date().toISOString(),
      })
      if (!saved?.[0]) throw new Error('The database did not confirm the save. Check that you are signed in with your @hiddengem.media account.')
      return json(200, { ok: true })
    }

    return json(400, { error: `Unknown kind "${body.kind}"` })
  } catch (err) {
    console.error('[rb-data]', err.message)
    return json(500, { error: err.message })
  }
}

export const handler = withAuth(rawHandler)
