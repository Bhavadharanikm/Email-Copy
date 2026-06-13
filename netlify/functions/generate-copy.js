/**
 * POST /.netlify/functions/generate-copy
 * Body: { client, brief }
 * Returns: { jobId }  ← immediately, before n8n finishes
 *
 * Flow (Option B — async):
 *   1. This function generates a jobId
 *   2. Fetches brand data from Google Sheet (client name lookup)
 *   3. POSTs to N8N_COPY_WEBHOOK_URL with { jobId, ...brief, ...clientBrand, brandData }
 *   4. n8n responds 200 immediately (does NOT use "Respond to Webhook")
 *   5. n8n processes copy in the background (35–45s, no problem)
 *   6. n8n POSTs result to /.netlify/functions/copy-callback
 *   7. Dashboard polls /copy-callback?jobId=XXX every 2s until done
 *
 * Required env var: N8N_COPY_WEBHOOK_URL
 */
import { randomUUID, createSign } from 'crypto'

const SPREADSHEET_ID = '14HEBZ9DPckY9jJRq-DYUZYI6bz2WJHhec9LTmP8FP54'
const SHEET_NAME     = 'Sheet1'

async function getGoogleToken() {
  const email      = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  if (!email || !privateKey) return null

  const now     = Math.floor(Date.now() / 1000)
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: email, scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now,
  })).toString('base64url')

  const sign = createSign('RSA-SHA256')
  sign.update(`${header}.${payload}`)
  const jwt = `${header}.${payload}.${sign.sign(privateKey, 'base64url')}`

  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })
  const data = await res.json()
  return data.access_token || null
}

async function fetchBrandData(clientName) {
  try {
    const token = await getGoogleToken()
    if (!token) return null

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}`
    const res  = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return null

    const data  = await res.json()
    const rows  = (data.values || []).slice(1)
    const norm  = clientName.trim().toLowerCase()
    const row   = rows.find(r => (r[0] || '').trim().toLowerCase() === norm)
    if (!row) return null

    return {
      found:          true,
      bgColor:        row[1]?.trim() || '',
      buttonColor:    row[2]?.trim() || '',
      secondaryColor: row[3]?.trim() || '',
      contactInfo:    row[4]?.trim() || '',
      footerText:     row[5]?.trim() || '',
      instagramUrl:   row[6]?.trim() || '',
      facebookUrl:    row[7]?.trim() || '',
      tiktokUrl:      row[8]?.trim() || '',
      websiteUrl:     row[9]?.trim() || '',
    }
  } catch {
    return null
  }
}

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

    // ── Fetch brand data from Google Sheet (non-blocking if it fails) ─────
    const brandData = await fetchBrandData(client.name)
    console.log(`[generate-copy] brandData for "${client.name}":`, brandData ? 'found' : 'not found')

    // ── Fire n8n and return immediately — do NOT await the copy ──────────
    const n8nRes = await fetch(n8nWebhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId,
        callbackUrl: `${process.env.CALLBACK_BASE_URL || process.env.URL}/.netlify/functions/copy-callback`,
        // Raw prompt sent exactly as typed — matches your n8n workflow's input format
        prompt,
        // Extra context n8n can use for brand-aware copy generation
        clientId:   client.id,
        clientName: client.name,
        locationId: client.ghl?.locationId || '',
        brandVoice: client.brand?.voice || '',
        brandData,  // colors, footer info, social links from Google Sheet
      }),
    })

    if (!n8nRes.ok) {
      const errText = await n8nRes.text()
      throw new Error(`n8n webhook returned ${n8nRes.status}: ${errText}`)
    }

    // Return jobId + brandData to the dashboard — polling starts immediately
    // brandData is applied to the template right away (no need to wait for n8n)
    return {
      statusCode: 200,
      headers:    { 'Content-Type': 'application/json' },
      body:       JSON.stringify({ jobId, brandData }),
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
