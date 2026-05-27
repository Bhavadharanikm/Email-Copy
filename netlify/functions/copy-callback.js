/**
 * copy-callback.js
 * /.netlify/functions/copy-callback
 *
 * n8n POSTs the finished copy here when done (async Option B).
 * Dashboard polls GET /copy-callback?jobId=XXX every 2s until result arrives.
 *
 * Storage: Upstash Redis REST API — no extra npm package needed, just fetch.
 * Required env vars: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 */

const TTL_SECONDS = 600  // 10 minutes

async function redisCmd(command) {
  const res = await fetch(process.env.UPSTASH_REDIS_REST_URL, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  })
  return res.json()
}

export const handler = async (event) => {

  // ── POST: n8n delivers completed copy ─────────────────────────────────────
  if (event.httpMethod === 'POST') {
    try {
      const payload = JSON.parse(event.body)
      const { jobId, ...copy } = payload

      if (!jobId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'jobId required' }) }
      }

      const value = JSON.stringify({ status: 'done', copy, completedAt: Date.now() })

      // SET key value EX 600
      await redisCmd(['SET', jobId, value, 'EX', String(TTL_SECONDS)])

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
      const result = await redisCmd(['GET', jobId])

      if (!result.result) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'pending' }),
        }
      }

      const data = JSON.parse(result.result)
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    } catch (err) {
      console.error('[copy-callback] GET error:', err.message)
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
    }
  }

  return { statusCode: 405, body: 'Method Not Allowed' }
}
