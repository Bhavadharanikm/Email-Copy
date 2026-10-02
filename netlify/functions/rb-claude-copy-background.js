/**
 * POST /.netlify/functions/rb-claude-copy-background
 * Body: { jobId, email, prompt, clientName }
 *
 * Writes one repeat booking email with Claude and stores the result in
 * copy_jobs under jobId; the page polls copy-callback?jobId=… for it, as the
 * welcome flow does. Every failure after the jobId is known is written to that
 * row too, so the page reports it instead of waiting out the poll.
 *
 * The -background name lets netlify dev run past its 30s cap; on Vercel the
 * API router runs it with vercel.json's 300s.
 */
import { withAuth } from './_auth.js'
import { generateRbCopy, rbClaudeEnabledFor } from './_rbClaude.js'

const json = (statusCode, body) => ({
  statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})

async function storeJob(jobId, result) {
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/copy_jobs`, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ job_id: jobId, result }),
  })
  if (!res.ok) throw new Error(`copy_jobs write failed (${res.status}): ${(await res.text()).slice(0, 200)}`)
}

const rawHandler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' })

  let body
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf-8') : event.body
    body = JSON.parse(raw || '{}')
  } catch { return json(400, { error: 'Invalid JSON' }) }

  const { jobId, prompt, clientName } = body
  const email = Number(body.email)
  if (!jobId || !/^[\w-]{8,64}$/.test(jobId)) return json(400, { error: 'jobId is required' })

  try {
    if (!prompt?.trim()) throw new Error('The brief is empty')
    if (!clientName)     throw new Error('clientName is required')
    if (!rbClaudeEnabledFor(email)) throw new Error(`Repeat booking Email ${email} is not set up to be written by Claude`)

    const { variations, notes, sources } = await generateRbCopy({ email, request: prompt, clientName })
    await storeJob(jobId, {
      status: 'done', engine: 'claude', flow: 'repeat', emailNumber: email, completedAt: Date.now(),
      copy: { variations, notes, sources },
    })
    return json(200, { ok: true })
  } catch (err) {
    console.error('[rb-claude-copy] failed:', err.message)
    try { await storeJob(jobId, { status: 'error', error: err.message, engine: 'claude', flow: 'repeat', emailNumber: email }) }
    catch (e) { console.error('[rb-claude-copy] could not record the failure:', e.message) }
    return json(500, { error: err.message })
  }
}

export const handler = withAuth(rawHandler)
