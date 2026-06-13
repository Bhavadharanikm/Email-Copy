/**
 * GET /.netlify/functions/clients
 * Reads client list from Google Sheet:
 *   Column A: Client Name
 *   Column B: GHL API Key
 *   Column C: GHL Location ID
 *
 * Uses the same service account as log-to-sheets.js
 */
import { createSign } from 'crypto'

const SPREADSHEET_ID = '1IaIANRJMS7XWy3Cu_eEi3kZyPghRDPZbwlzBompeNxI'
const SHEET_NAME     = 'Client Details GHL'

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

export const handler = async () => {
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
    const rows = data.values || []

    // Skip header row (row 0), build client objects
    const clients = rows
      .slice(1)
      .filter(row => row[0]?.trim()) // must have at minimum a name
      .map((row, i) => {
        console.log(`[clients] Row ${i + 2}: name="${row[0]}" apiKey="${row[1]?.substring(0,10)}..." locationId="${row[2]}"`)
        // Parse brand colors from col E (JSON string)
        let brandColors = null
        try {
          const raw = row[4]?.trim()
          if (raw) brandColors = JSON.parse(raw)
        } catch (e) {
          console.warn(`[clients] Could not parse brandColors for row ${i + 2}:`, row[4])
        }

        return {
          id:         `client-${i}`,
          name:       row[0]?.trim() || '',
          ghlApiKey:  row[1]?.trim() || '',
          ghl: {
            locationId: row[2]?.trim() || '',
          },
          logoUrl:     row[3]?.trim() || '',
          brandColors: brandColors,
          brand: {},
        }
      })

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clients),
    }
  } catch (err) {
    console.error('[clients] Error:', err.message)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
