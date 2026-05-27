/**
 * copy-callback.js
 * /.netlify/functions/copy-callback
 *
 * n8n POSTs the finished copy here when done (async Option B).
 * Dashboard polls GET /copy-callback?jobId=XXX every 2s until result arrives.
 *
 * Storage: Netlify Blobs — persists across serverless function instances.
 * Results expire after 10 minutes automatically.
 */
import { getStore } from '@netlify/blobs'

const TTL_MS = 10 * 60 * 1000  // 10 minutes

function store() {
  return getStore('copy-results')
}

export const handler = async (event) => {

  // ── POST: n8n delivers completed copy ──────────────────────────────────
  if (event.httpMethod === 'POST') {
    try {
      const payload = JSON.parse(event.body)
      const { jobId, ...copy } = payload

      if (!jobId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'jobId required' }) }
      }

      await store().setJSON(jobId, {
        status:      'done',
        copy,
        completedAt: Date.now(),
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

  // ── GET: dashboard polls for result ────────────────────────────────────
  if (event.httpMethod === 'GET') {
    const jobId = event.queryStringParameters?.jobId

    if (!jobId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'jobId required' }) }
    }

    try {
      const result = await store().get(jobId, { type: 'json' })

      // Auto-cleanup: delete after retrieval if older than TTL
      if (result && Date.now() - result.completedAt > TTL_MS) {
        await store().delete(jobId)
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result ?? { status: 'pending' }),
      }
    } catch (err) {
      console.error('[copy-callback] GET error:', err.message)
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
    }
  }

  return { statusCode: 405, body: 'Method Not Allowed' }
}
