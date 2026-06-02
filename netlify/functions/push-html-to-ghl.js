/**
 * POST /.netlify/functions/push-html-to-ghl
 * Body: { client, renderedHtml, generatedCopy, templateId, locationId }
 *
 * Creates a new GHL email template with the full rendered HTML,
 * OR updates the existing template if templateId is provided.
 * Returns: { success, previewUrl, templateId }
 */

const GHL_BASE    = 'https://services.leadconnectorhq.com'
const GHL_VERSION = '2021-07-28'

function ghlHeaders(apiKey) {
  return {
    Authorization:  `Bearer ${apiKey}`,
    Version:        GHL_VERSION,
    'Content-Type': 'application/json',
  }
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body

    const { client, renderedHtml, generatedCopy, templateId, locationId: urlLocationId, folderId } = JSON.parse(rawBody)

    const apiKey     = client?.ghlApiKey || process.env.GHL_API_KEY
    const locationId = urlLocationId || client?.ghl?.locationId

    if (!apiKey)      throw new Error('No GHL API key available')
    if (!locationId)  throw new Error('No locationId available')
    if (!renderedHtml) throw new Error('No HTML to push')

    const templateName = `${client?.name || 'Campaign'} — ${(generatedCopy?.subjectLine || 'Email').slice(0, 50)} (${new Date().toISOString().slice(0, 10)})`

    let newTemplateId
    let method
    let url

    if (templateId) {
      // Update existing template
      method = 'PATCH'
      url    = `${GHL_BASE}/emails/public/v2/locations/${locationId}/templates/${templateId}`
    } else {
      // Create new template
      method = 'POST'
      url    = `${GHL_BASE}/emails/public/v2/locations/${locationId}/templates`
    }

    const templateBody = { name: templateName, html: renderedHtml, editorType: 'html' }
    if (folderId && method === 'POST') templateBody.folderId = folderId

    const res = await fetch(url, {
      method,
      headers: ghlHeaders(apiKey),
      body: JSON.stringify(templateBody),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`GHL template push failed: ${res.status} ${text}`)
    }

    const data = await res.json()
    newTemplateId = data?.id || data?.template?.id || templateId || ''

    const emailsBase = `https://app.gohighlevel.com/v2/location/${locationId}/marketing/emails`
    const previewUrl = newTemplateId
      ? `${emailsBase}/builder/${newTemplateId}`
      : `${emailsBase}/all?pageNumber=1`

    console.log(`[push-html-to-ghl] Pushed HTML template "${templateName}" → ${previewUrl}`)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, previewUrl, templateId: newTemplateId }),
    }

  } catch (err) {
    console.error('[push-html-to-ghl] Error:', err.message)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
