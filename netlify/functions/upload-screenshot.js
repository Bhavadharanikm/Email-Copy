/**
 * POST /.netlify/functions/upload-screenshot
 * Accepts a base64-encoded PNG and uploads it to the GHL Media Library.
 * Body: { base64: string, locationId: string }
 * Returns: { url: string }
 */

const GHL_BASE    = 'https://services.leadconnectorhq.com'
const GHL_VERSION = '2021-07-28'

async function uploadToGHL(apiKey, locationId, base64) {
  const buffer   = Buffer.from(base64, 'base64')
  const fileName = `email-section-${Date.now()}.png`
  const boundary = '----FormBoundary' + Math.random().toString(36).slice(2)
  const CRLF     = '\r\n'

  const headerPart =
    `--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="file"; filename="${fileName}"${CRLF}` +
    `Content-Type: image/png${CRLF}${CRLF}`

  const footerPart = `${CRLF}--${boundary}--${CRLF}`

  const body = Buffer.concat([
    Buffer.from(headerPart, 'utf-8'),
    buffer,
    Buffer.from(footerPart, 'utf-8'),
  ])

  const res = await fetch(`${GHL_BASE}/medias/upload-file?locationId=${locationId}`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      Version:        GHL_VERSION,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GHL upload failed: ${res.status} ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  const url  = data.url || data.fileUrl || data?.data?.url || data?.file?.url || ''
  if (!url) throw new Error(`GHL upload succeeded but returned no URL: ${JSON.stringify(data)}`)
  return url
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  try {
    const { base64, locationId } = JSON.parse(event.body || '{}')
    if (!base64)     throw new Error('base64 is required')
    if (!locationId) throw new Error('locationId is required')

    const apiKey = process.env.GHL_API_KEY
    if (!apiKey) throw new Error('GHL_API_KEY not configured')

    const url = await uploadToGHL(apiKey, locationId, base64)
    console.log('[upload-screenshot] Uploaded:', url)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    }
  } catch (err) {
    console.error('[upload-screenshot] Error:', err.message)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    }
  }
}
