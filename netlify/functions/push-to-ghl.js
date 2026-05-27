/**
 * POST /.netlify/functions/push-to-ghl
 * Body: { client, renderedHtml, generatedCopy }
 * Returns: { success, campaignId, previewUrl }
 *
 * Creates a draft email campaign in GHL via v2 API.
 * Required env var: GHL_API_KEY (Private Integration token)
 */

const GHL_BASE = 'https://services.leadconnectorhq.com'
const GHL_VERSION = '2021-07-28'

function ghlHeaders(apiKey) {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Version':       GHL_VERSION,
    'Content-Type':  'application/json',
  }
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body

    const { client, renderedHtml, generatedCopy } = JSON.parse(rawBody)

    const apiKey     = process.env.GHL_API_KEY
    const locationId = client?.ghl?.locationId

    if (!apiKey)     throw new Error('GHL_API_KEY env var not set')
    if (!locationId) throw new Error('No locationId for this client')

    // Build a campaign name with timestamp so it's easy to find in GHL
    const campaignName = `[HGM] ${client.name} — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

    // ── Create email campaign draft ────────────────────────────────────────
    const res = await fetch(`${GHL_BASE}/email-marketing/campaigns`, {
      method:  'POST',
      headers: ghlHeaders(apiKey),
      body: JSON.stringify({
        locationId,
        name:      campaignName,
        subject:   generatedCopy.subjectLine,
        previewText: generatedCopy.previewText || '',
        html:      renderedHtml || buildPlainHtml(generatedCopy),
        status:    'draft',
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('[push-to-ghl] GHL API error:', JSON.stringify(data))
      throw new Error(data.message || `GHL returned ${res.status}`)
    }

    const campaignId  = data.id || data.campaign?.id || data.data?.id
    const previewUrl  = `https://app.gohighlevel.com/v2/location/${locationId}/marketing/emails/scheduled`

    console.log(`[push-to-ghl] Created campaign ${campaignId} for ${client.name}`)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, campaignId, previewUrl }),
    }

  } catch (err) {
    console.error('[push-to-ghl] Error:', err.message)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}

// Fallback: build a minimal plain HTML email from copy fields
// (used if no rendered HTML template is provided yet)
function buildPlainHtml(copy) {
  return `<!DOCTYPE html>
<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <h1 style="font-size:28px;margin-bottom:8px;">${copy.headlineText || ''}</h1>
  <p style="color:#555;font-size:16px;margin-bottom:24px;">${copy.subhead || ''}</p>
  <p style="font-size:16px;line-height:1.6;">${(copy.bodyText || '').replace(/\n/g, '<br>')}</p>
  ${copy.bodyBlock2Title ? `<h2 style="font-size:20px;margin-top:32px;">${copy.bodyBlock2Title}</h2>` : ''}
  ${copy.bodyBlock2 ? `<p style="font-size:16px;line-height:1.6;">${copy.bodyBlock2}</p>` : ''}
  <p style="margin-top:24px;font-style:italic;color:#555;">${copy.closingLine || ''}</p>
  ${copy.ctaUrl ? `<a href="${copy.ctaUrl}" style="display:inline-block;margin-top:24px;padding:14px 28px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">${copy.ctaText || 'Book Now'}</a>` : ''}
</body></html>`
}
