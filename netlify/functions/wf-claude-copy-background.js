/**
 * POST /.netlify/functions/wf-claude-copy-background
 * Body: { jobId, week, prompt, clientName }
 *
 * Writes a welcome-flow email with Claude and stores the result in copy_jobs
 * under jobId, the same row n8n's callback would have written. The page does
 * not wait on this request: it fires it, then polls copy-callback?jobId=… as
 * it always has, so the dashboard cannot tell which engine wrote the copy.
 *
 * Runs for one to three minutes. The -background name makes Netlify (and
 * netlify dev, which otherwise stops functions at 30s) answer 202 at once and
 * let it run up to 15 minutes; on Vercel, vercel.json gives it 300s.
 */
import { withAuth } from './_auth.js'
import { generateWfCopy, claudeEnabledFor } from './_wfClaude.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

const json = (statusCode, body) => ({
  statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})

async function storeJob(jobId, result) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/copy_jobs`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ job_id: jobId, result }),
  })
  if (!res.ok) console.error('[wf-claude-copy] copy_jobs write failed', res.status, await res.text())
}

const rawHandler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' })

  let body
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf-8') : event.body
    body = JSON.parse(raw || '{}')
  } catch { return json(400, { error: 'Invalid JSON' }) }

  const { jobId, prompt, clientName } = body
  const week = Number(body.week)
  if (!jobId || !/^[\w-]{8,64}$/.test(jobId)) return json(400, { error: 'jobId is required' })
  if (!prompt?.trim())  return json(400, { error: 'prompt is required' })
  if (!clientName)      return json(400, { error: 'clientName is required' })
  if (!claudeEnabledFor(week)) return json(400, { error: `Email ${week} is not set up to be written by Claude` })

  try {
    const { variations, markdown, notes, sources } = await generateWfCopy({ week, request: prompt, clientName })
    await storeJob(jobId, {
      status: 'done', engine: 'claude', emailNumber: week, completedAt: Date.now(),
      copy: { variations, markdown, copywriterNotes: notes, sources },
    })
    return json(200, { ok: true })
  } catch (err) {
    console.error('[wf-claude-copy] failed:', err.message)
    await storeJob(jobId, { status: 'error', error: err.message, engine: 'claude', emailNumber: week })
    return json(500, { error: err.message })
  }
}

export const handler = withAuth(rawHandler)
