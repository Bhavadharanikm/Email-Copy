/**
 * GET /.netlify/functions/fetch-footer-data
 * ?clientName=Pine+Valley+Cabins
 *
 * Reads the brand board Google Sheet and returns footer data for the given client.
 *
 * Brand board sheet: 14HEBZ9DPckY9jJRq-DYUZYI6bz2WJHhec9LTmP8FP54
 *   Col A: Client Name
 *   Col B: BG Colour
 *   Col C: Button Colour
 *   Col D: Secondary Colour
 *   Col E: Contact Info
 *   Col F: Footer Text
 *   Col G: Instagram Link
 *   Col H: Facebook Link
 *   Col I: TikTok Link
 *   Col J: Website Link
 *   Col K: Contact Number (phone)
 */
import { createSign } from 'crypto'

const SPREADSHEET_ID = '14HEBZ9DPckY9jJRq-DYUZYI6bz2WJHhec9LTmP8FP54'
const SHEET_NAME     = 'Sheet1'

async function getAccessToken() {
  const email      = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n')

  if (!email || !privateKey) throw new Error('Google credentials not set')

  const now     = Math.floor(Date.now() / 1000)
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss:   email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud:   'https://oauth2.googleapis.com/token',
    exp:   now + 3600,
    iat:   now,
  })).toString('base64url')

  const sign = createSign('RSA-SHA256')
  sign.update(`${header}.${payload}`)
  const signature = sign.sign(privateKey, 'base64url')
  const jwt = `${header}.${payload}.${signature}`

  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`Google token error: ${JSON.stringify(data)}`)
  return data.access_token
}

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' }

  const { clientName } = event.queryStringParameters || {}
  if (!clientName) return { statusCode: 400, body: JSON.stringify({ error: 'clientName required' }) }

  try {
    const accessToken = await getAccessToken()

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Sheets read error ${res.status}: ${text}`)
    }

    const data = await res.json()
    const rows = (data.values || []).slice(1) // skip header row

    // Find the matching row (case-insensitive trim)
    const nameNorm = clientName.trim().toLowerCase()
    const row = rows.find(r => (r[0] || '').trim().toLowerCase() === nameNorm)

    if (!row) {
      // Return empty but valid object — templates will just use fallback styles
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ found: false }),
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        found:          true,
        bgColor:        row[1]?.trim()  || '',  // Col B — BG Colour
        buttonColor:    row[2]?.trim()  || '',  // Col C — Button Colour
        secondaryColor: row[3]?.trim()  || '',  // Col D — Secondary Colour
        contactInfo:    row[4]?.trim()  || '',  // Col E — Contact Info (email address)
        footerText:     row[5]?.trim()  || '',  // Col F — Footer Text
        instagramUrl:   row[6]?.trim()  || '',  // Col G — Instagram
        facebookUrl:    row[7]?.trim()  || '',  // Col H — Facebook
        tiktokUrl:      row[8]?.trim()  || '',  // Col I — TikTok
        websiteUrl:     row[9]?.trim()  || '',  // Col J — Website
        contactNumber:  row[10]?.trim() || '',  // Col K — Contact Number (phone)
      }),
    }
  } catch (err) {
    console.error('[fetch-footer-data] Error:', err.message)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
