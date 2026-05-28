/**
 * POST /.netlify/functions/generate-copy
 * Body: { client, brief }
 * Returns: { jobId }  ← immediately, before n8n finishes
 *
 * Flow (Option B — async):
 *   1. This function generates a jobId
 *   2. POSTs to N8N_COPY_WEBHOOK_URL with { jobId, ...brief, ...clientBrand }
 *   3. n8n responds 200 immediately (does NOT use "Respond to Webhook")
 *   4. n8n processes copy in the background (35–45s, no problem)
 *   5. n8n POSTs result to /.netlify/functions/copy-callback
 *   6. Dashboard polls /copy-callback?jobId=XXX every 2s until done
 *
 * Required env var: N8N_COPY_WEBHOOK_URL
 */
import { randomUUID } from 'crypto'

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { client, prompt } = JSON.parse(event.body)
    const n8nWebhookUrl     = process.env.N8N_COPY_WEBHOOK_URL

    // ── Stub mode (no webhook URL set) ───────────────────────────────────
    if (!n8nWebhookUrl) {
      console.warn('[generate-copy] N8N_COPY_WEBHOOK_URL not set — returning stub jobId.')
      // Stub: immediately write a fake result to the callback store
      // so the poller gets a response right away during local dev.
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: `stub_${Date.now()}`, _stub: true }),
      }
    }

    // ── Generate a unique job ID for this run ─────────────────────────────
    const jobId = randomUUID()

    // ── Fire n8n and return immediately — do NOT await the copy ──────────
    const n8nRes = await fetch(n8nWebhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId,
        callbackUrl: `${process.env.CALLBACK_BASE_URL || process.env.URL}/.netlify/functions/copy-callback`,
        // Raw prompt sent exactly as typed — matches your n8n workflow's input format
        prompt,
        // Extra context n8n can use if needed
        clientId:   client.id,
        clientName: client.name,
        locationId: client.ghl?.locationId || '',
        brandVoice: client.brand?.voice || '',
      }),
    })

    if (!n8nRes.ok) {
      const errText = await n8nRes.text()
      throw new Error(`n8n webhook returned ${n8nRes.status}: ${errText}`)
    }

    // Return jobId to the dashboard — polling starts immediately
    return {
      statusCode: 200,
      headers:    { 'Content-Type': 'application/json' },
      body:       JSON.stringify({ jobId }),
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
