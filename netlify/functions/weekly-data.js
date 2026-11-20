/**
 * /.netlify/functions/weekly-data — the Weekly Email Campaign's saved data.
 *
 *   GET  ?kind=client&locationId=X        → { client }      one client's folder and website
 *   GET  ?kind=emails&q=text              → { emails }      saved emails, newest first, no state
 *   GET  ?kind=email&id=X  |  &code=W7K3Q → { email }       one saved email, state included
 *   POST { kind: 'client', client }       → { client }      upserts weekly_clients
 *   POST { kind: 'email', id?, ... }      → { id, code, updatedAt }
 *
 * Both tables are on the shared project (foiykssauiqmzawwmdrm, the one Google
 * sign-in runs on). weekly_clients holds one row per GHL location: the folder
 * new templates go into and the client's website. weekly_emails holds one row
 * per saved email: the whole draft in `state`, so reopening it puts copy,
 * images, bakes, template and sliders back, and a short `code` to find it by.
 *
 * Read and written as the signed-in person, with their own Google session
 * token and the anon key, so the tables' own rule (signed-in @hiddengem.media
 * accounts only) decides, and no service key is needed. Nothing is deleted.
 */
import { randomInt } from 'crypto'
import { withAuth } from './_auth.js'

const AUTH_URL = (process.env.AUTH_SUPABASE_URL || '').replace(/\/+$/, '')
const ANON_KEY = process.env.AUTH_SUPABASE_ANON_KEY || ''
const MAX_STATE_BYTES = 3_000_000   // a draft is tens of KB plus its HTML; this only stops a runaway write

/* No 0/O, 1/I/L: the code gets read out and typed in. */
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const newCode = () => 'W' + Array.from({ length: 5 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('')

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
  if (!res.ok) { const e = new Error(`Database request failed (${res.status}): ${text.slice(0, 200)}`); e.status = res.status; throw e }
  return text ? JSON.parse(text) : null
}

const NOT_CONFIRMED = 'The database did not confirm the save. Check that you are signed in with your @hiddengem.media account.'
/* PostgREST's ilike takes * as the wildcard; keep a typed one from widening the search. */
const likeText = (s) => encodeURIComponent(String(s).replace(/[*,()%]/g, ' ').trim())

const clientOut = (r) => r && ({
  locationId: r.location_id, clientName: r.client_name, folderUrl: r.folder_url, folderId: r.folder_id,
  websiteUrl: r.website_url, updatedBy: r.updated_by, updatedAt: r.updated_at,
})

const emailOut = (r) => r && ({
  id: r.id, code: r.code, clientName: r.client_name, locationId: r.location_id, templateLabel: r.template_label,
  subjectLine: r.subject_line, status: r.status, createdBy: r.created_by, updatedBy: r.updated_by,
  createdAt: r.created_at, updatedAt: r.updated_at,
  ...(r.state !== undefined ? { state: r.state } : {}),
  ...(r.rendered_html !== undefined ? { renderedHtml: r.rendered_html } : {}),
})

const rawHandler = async (event) => {
  if (!AUTH_URL || !ANON_KEY) return json(500, { error: 'The shared database is not configured (AUTH_SUPABASE_URL / AUTH_SUPABASE_ANON_KEY)' })
  const token = bearer(event)
  if (!token) return json(401, { error: 'Sign in with Google to save and open weekly emails' })
  const who = event.session?.email || null

  try {
    if (event.httpMethod === 'GET') {
      const q = event.queryStringParameters || {}

      if (q.kind === 'client') {
        if (!q.locationId) return json(400, { error: 'locationId is required' })
        const rows = await rest(token, `weekly_clients?location_id=eq.${encodeURIComponent(q.locationId)}&select=*`)
        return json(200, { client: clientOut(rows?.[0]) || null })
      }

      if (q.kind === 'emails') {
        const text = String(q.q || '').trim()
        const filter = text
          ? `&or=(code.ilike.*${likeText(text)}*,client_name.ilike.*${likeText(text)}*,subject_line.ilike.*${likeText(text)}*,template_label.ilike.*${likeText(text)}*)`
          : ''
        const rows = await rest(token, `weekly_emails?select=id,code,client_name,location_id,template_label,subject_line,status,created_by,updated_by,created_at,updated_at&order=updated_at.desc&limit=200${filter}`)
        return json(200, { emails: (rows || []).map(emailOut) })
      }

      if (q.kind === 'email') {
        const by = q.id ? `id=eq.${encodeURIComponent(q.id)}` : q.code ? `code=eq.${encodeURIComponent(String(q.code).trim().toUpperCase())}` : ''
        if (!by) return json(400, { error: 'id or code is required' })
        const rows = await rest(token, `weekly_emails?${by}&select=*`)
        if (!rows?.[0]) return json(404, { error: `No saved email with ${q.id ? 'that id' : `code ${q.code}`}` })
        return json(200, { email: emailOut(rows[0]) })
      }

      return json(400, { error: `Unknown kind "${q.kind}"` })
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
      const clientName = String(c.clientName || '').trim()
      if (!locationId || !clientName) return json(400, { error: 'A client needs a locationId and a name' })
      /* Only the fields sent are written, so saving the folder never blanks the website. */
      const row = { location_id: locationId, client_name: clientName, updated_by: who, updated_at: new Date().toISOString() }
      if (c.folderUrl  !== undefined) row.folder_url  = String(c.folderUrl  || '').trim()
      if (c.folderId   !== undefined) row.folder_id   = String(c.folderId   || '').trim()
      if (c.websiteUrl !== undefined) row.website_url = String(c.websiteUrl || '').trim()
      const saved = await rest(token, 'weekly_clients?on_conflict=location_id', {
        method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(row),
      })
      if (!saved?.[0]) throw new Error(NOT_CONFIRMED)
      return json(200, { client: clientOut(saved[0]) })
    }

    if (body.kind === 'email') {
      const clientName = String(body.clientName || '').trim()
      if (!clientName) return json(400, { error: 'Pick a client before saving' })
      const state = body.state && typeof body.state === 'object' ? body.state : {}
      const renderedHtml = String(body.renderedHtml || '')
      if (JSON.stringify(state).length + renderedHtml.length > MAX_STATE_BYTES) return json(413, { error: 'This email is too large to save' })
      const now = new Date().toISOString()
      const row = {
        client_name: clientName, location_id: body.locationId || null,
        template_label: String(body.templateLabel || ''), subject_line: String(body.subjectLine || ''),
        status: String(body.status || 'draft'), state, rendered_html: renderedHtml,
        updated_by: who, updated_at: now,
      }

      if (body.id) {
        const saved = await rest(token, `weekly_emails?id=eq.${encodeURIComponent(body.id)}`, {
          method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row),
        })
        if (!saved?.[0]) throw new Error(NOT_CONFIRMED)
        return json(200, { id: saved[0].id, code: saved[0].code, updatedAt: saved[0].updated_at })
      }

      /* A new email gets a fresh code; on the rare clash, draw again. */
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const saved = await rest(token, 'weekly_emails', {
            method: 'POST', headers: { Prefer: 'return=representation' },
            body: JSON.stringify({ ...row, code: newCode(), created_by: who, created_at: now }),
          })
          if (!saved?.[0]) throw new Error(NOT_CONFIRMED)
          return json(200, { id: saved[0].id, code: saved[0].code, updatedAt: saved[0].updated_at })
        } catch (e) {
          if (e.status !== 409) throw e
        }
      }
      throw new Error('Could not find a free code for this email; try saving again')
    }

    return json(400, { error: `Unknown kind "${body.kind}"` })
  } catch (err) {
    console.error('[weekly-data]', err.message)
    return json(500, { error: err.message })
  }
}

export const handler = withAuth(rawHandler)
