/**
 * POST /.netlify/functions/log-to-sheets
 * Body: { client, generatedCopy, variationLabel }
 *
 * Appends one row to the HGM copy log Google Sheet.
 * Uses a Google Service Account — no n8n needed.
 *
 * Required env vars:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL  — service account email
 *   GOOGLE_PRIVATE_KEY            — private key from the JSON key file (with \n line breaks)
 */

import { createSign } from 'crypto'

const SPREADSHEET_ID = '1jKx6btgMaXi6eoqQanuLBp-B_t_S4h3bMLQyYp56MMo'
const SHEET_NAME     = 'Sheet1'

// ── Build a signed JWT and exchange it for a Google access token ─────────────
async function getAccessToken() {
  const email      = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n')

  if (!email || !privateKey) throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY not set')

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
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`Google token error: ${JSON.stringify(data)}`)
  return data.access_token
}

// ── Append rows to the sheet ─────────────────────────────────────────────────
async function appendRows(accessToken, rows) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`
  const res = await fetch(url, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: rows }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Sheets API error ${res.status}: ${text}`)
  }
  return res.json()
}

// ── Build a single sheet row from copy data ──────────────────────────────────
function buildRow(clientName, locationId, variationLabel, copy) {
  return [
    clientName,
    locationId,
    variationLabel,
    copy.name            || '',   // POV / variation name
    copy.subjectLine     || '',
    copy.previewText     || '',
    copy.headlineText    || '',
    copy.subhead         || '',
    copy.bodyText        || '',
    copy.bodyBlock2Title || '',
    copy.bodyBlock2      || '',
    copy.ctaText         || '',
    copy.closingLine     || '',
  ]
}

// ── Handler ──────────────────────────────────────────────────────────────────
export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  if (!email) {
    // Stub — credentials not configured yet
    console.warn('[log-to-sheets] Google credentials not set — skipping sheet log.')
    return { statusCode: 200, body: JSON.stringify({ stub: true }) }
  }

  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body

    const { client, generatedCopy, variationLabel = 'Variation - Selected', variations } = JSON.parse(rawBody)

    const clientName = client?.name        || ''
    const locationId = client?.ghl?.locationId || ''

    const accessToken = await getAccessToken()

    let rows
    if (variations && Array.isArray(variations)) {
      // Log all 3 variations at once (called from copy-callback)
      rows = variations.map((v, i) => buildRow(clientName, locationId, `Variation ${i + 1}`, v))
    } else {
      // Log a single selected variation (called from ApprovalPanel)
      rows = [buildRow(clientName, locationId, variationLabel, generatedCopy)]
    }

    await appendRows(accessToken, rows)
    console.log(`[log-to-sheets] Appended ${rows.length} row(s) for ${clientName}`)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, rowsAdded: rows.length }),
    }

  } catch (err) {
    console.error('[log-to-sheets] Error:', err.message)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
