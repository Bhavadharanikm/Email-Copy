/**
 * copy-callback.js
 * /.netlify/functions/copy-callback
 *
 * n8n POSTs the finished copy here when done.
 * Dashboard polls GET /copy-callback?jobId=XXX every 2s until result arrives.
 *
 * Local dev: uses an in-memory Map (lives as long as netlify dev is running).
 * Production: swap the Map for Netlify Blobs or a DB of your choice.
 */

// In-memory store — persists across requests within the same process
const results = new Map()

export const handler = async (event) => {

  // ── POST: n8n delivers completed copy ──────────────────────────────────
  if (event.httpMethod === 'POST') {
    try {
      const payload = JSON.parse(event.body)
      const { jobId, ...rest } = payload

      if (!jobId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'jobId required' }) }
      }

      results.set(jobId, { status: 'done', copy: rest, completedAt: Date.now() })
      console.log(`[copy-callback] Stored result for jobId: ${jobId}`)

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: true }),
      }
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
    }
  }

  // ── GET: dashboard polls for result ────────────────────────────────────
  if (event.httpMethod === 'GET') {
    const jobId = event.queryStringParameters?.jobId

    if (!jobId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'jobId required' }) }
    }

    const result = results.get(jobId)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result ?? { status: 'pending' }),
    }
  }

  return { statusCode: 405, body: 'Method Not Allowed' }
}
