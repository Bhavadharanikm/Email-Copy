/**
 * POST /.netlify/functions/upload-logo
 * Body: { base64, mimeType, fileName, locationId, apiKey, clientRowIndex, clientName }
 *
 * 1. Uploads logo image to GHL Media Library
 * 2. Writes the returned URL to Column D of the Client Details sheet
 * Returns: { success, logoUrl }
 */

import { createSign } from 'crypto'

const GHL_BASE      = 'https://services.leadconnectorhq.com'
const GHL_VERSION   = '2021-07-28'
const SPREADSHEET_ID = '1IaIANRJMS7XWy3Cu_eEi3kZyPghRDPZbwlzBompeNxI'
const SHEET_NAME     = 'Client Details GHL'

// ── Google Sheets JWT token (read-write scope) ───────────────────────────────
async function getGoogleToken() {
  const email      = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim()
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  if (!email || !privateKey) throw new Error('Google credentials not set')

  const now     = Math.floor(Date.now() / 1000)
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss:   email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud:   'https://oauth2.googleapis.com/token',
    exp:   now + 3600,
    iat:   now,
  })).toString('base64url')

  const sign = createSign('RSA-SHA256')
  sign.update(`${header}.${payload}`)
  const signature = sign.sign(privateKey, 'base64url')
  const jwt = `${header}.${payload}.${signature}`

  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`Google token error: ${JSON.stringify(data)}`)
  return data.access_token
}

// ── Upload image to GHL Media Library ────────────────────────────────────────
async function uploadToGHL(apiKey, locationId, base64, mimeType, fileName) {
  const buffer = Buffer.from(base64, 'base64')

  // Build multipart/form-data manually
  const boundary = '----FormBoundary' + Math.random().toString(36).slice(2)
  const CRLF = '\r\n'

  const headerPart =
    `--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="file"; filename="${fileName}"${CRLF}` +
    `Content-Type: ${mimeType}${CRLF}${CRLF}`

  const footerPart = `${CRLF}--${boundary}--${CRLF}`

  const body = Buffer.concat([
    Buffer.from(headerPart, 'utf-8'),
    buffer,
    Buffer.from(footerPart, 'utf-8'),
  ])

  const res = await fetch(`${GHL_BASE}/medias/upload-file?locationId=${locationId}`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      Version:        GHL_VERSION,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GHL media upload failed: ${res.status} ${text}`)
  }

  const data = await res.json()
  // GHL upload-file returns the file object — url is at data.url, data.fileUrl, or data.data.url
  const url = data.url || data.fileUrl || data?.data?.url || data?.file?.url || ''
  if (!url) throw new Error(`GHL media upload succeeded but no URL returned: ${JSON.stringify(data)}`)
  return url
}

// ── Write logoUrl to Google Sheet column D (row = clientRowIndex + 2, 1-indexed + header) ──
async function writeLogoUrlToSheet(token, rowIndex, logoUrl) {
  // rowIndex is the actual 1-indexed sheet row (includes header), passed directly from clients.sheetRow
  const sheetRow  = rowIndex
  const range     = encodeURIComponent(`${SHEET_NAME}!D${sheetRow}`)
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=RAW`,
    {
      method:  'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [[logoUrl]] }),
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Sheets write failed: ${res.status} ${text}`)
  }
}

// ── Handler ──────────────────────────────────────────────────────────────────
export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  try {
    const { base64, mimeType, fileName, locationId, apiKey, clientRowIndex } = JSON.parse(event.body)

    if (!base64)           throw new Error('No image data provided')
    if (!locationId)       throw new Error('No locationId provided')
    if (!apiKey)           throw new Error('No GHL API key provided')
    if (clientRowIndex == null) throw new Error('No clientRowIndex provided')

    // 1. Upload to GHL
    const logoUrl = await uploadToGHL(apiKey, locationId, base64, mimeType || 'image/png', fileName || 'logo.png')

    // 2. Save URL back to Google Sheet (non-fatal)
    try {
      const token = await getGoogleToken()
      await writeLogoUrlToSheet(token, clientRowIndex, logoUrl)
      console.log(`[upload-logo] Uploaded + saved logo for row ${clientRowIndex}: ${logoUrl}`)
    } catch (sheetErr) {
      console.warn(`[upload-logo] Sheet write failed (non-fatal): ${sheetErr.message}`)
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, logoUrl }),
    }
  } catch (err) {
    console.error('[upload-logo] Error:', err.message)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
