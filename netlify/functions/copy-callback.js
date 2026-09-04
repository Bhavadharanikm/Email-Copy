/**
 * copy-callback.js
 * /.netlify/functions/copy-callback
 *
 * n8n POSTs the finished copy here when done (async Option B).
 * Dashboard polls GET /copy-callback?jobId=XXX every 2s until result arrives.
 *
 * Storage: Supabase (copy_jobs table)
 * Required env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

import { withAuth, hasCallbackSecret } from './_auth.js'
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

function supabase(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      apikey:          SUPABASE_KEY,
      Authorization:   `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  'application/json',
      Prefer:          method === 'POST' ? 'resolution=merge-duplicates' : '',
    },
  }
  if (body) opts.body = JSON.stringify(body)
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, opts).then(r => r.text().then(t => t ? JSON.parse(t) : null))
}

const rawHandler = async (event) => {

  // ── POST: n8n delivers completed copy ─────────────────────────────────────
  if (event.httpMethod === 'POST') {
    try {
      const rawBody = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf-8')
        : event.body
      const payload = JSON.parse(rawBody)
      /* n8n may say which email this copy is for (emailNumber / week / emailKey).
         Kept beside the copy, not inside it, so the dashboard can check it
         against the brief that asked — and the parser never sees it as a field. */
      const { jobId, emailNumber, week, emailKey, ...copy } = payload

      if (!jobId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'jobId required' }) }
      }

      const num = Number(emailNumber ?? week) || null
      await supabase('copy_jobs', 'POST', {
        job_id: jobId,
        result: { status: 'done', copy, completedAt: Date.now(),
                  ...(num ? { emailNumber: num } : {}), ...(emailKey ? { emailKey } : {}) },
      })

      console.log(`[copy-callback] Stored result for jobId: ${jobId}`)

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: true }),
      }
    } catch (err) {
      console.error('[copy-callback] POST error:', err.message)
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
    }
  }

  // ── GET: dashboard polls for result ───────────────────────────────────────
  if (event.httpMethod === 'GET') {
    const jobId = event.queryStringParameters?.jobId

    if (!jobId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'jobId required' }) }
    }

    try {
      const rows = await supabase(`copy_jobs?job_id=eq.${encodeURIComponent(jobId)}&select=result`)

      if (!rows?.length) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'pending' }),
        }
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rows[0].result),
      }
    } catch (err) {
      console.error('[copy-callback] GET error:', err.message)
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
    }
  }

  return { statusCode: 405, body: 'Method Not Allowed' }
}

/* n8n has no session; it proves itself with x-callback-secret on POST. The
   dashboard's GET poll carries a normal session. */
export const handler = withAuth(rawHandler, { allow: (e) => e.httpMethod === 'POST' && hasCallbackSecret(e) })
