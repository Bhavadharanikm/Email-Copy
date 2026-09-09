/**
 * POST /.netlify/functions/wf-submit-feedback
 * Body: { section, feedback, clientName, emailLabel, week, user }
 *
 * Welcome-flow feedback. Same service account as submit-feedback, but its own
 * destination so welcome-flow notes never land in the weekly guidelines doc.
 *
 *   WF_FEEDBACK_SHEET_ID  — a Google Sheet: one row per note
 *                           (Date, Time, By, Client, Email, Section, Feedback)
 *   WF_FEEDBACK_DOC_ID    — or a Google Doc: appended like the weekly feedback
 *
 * The sheet wins when both are set. The doc defaults to Pooja's welcome-flow
 * feedback doc, so nothing needs configuring on Vercel for the doc path.
 */

import { withAuth } from './_auth.js'
import { createSign } from 'crypto'

async function getAccessToken(scope) {
  const email      = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim()
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').trim().replace(/\\n/g, '\n')
  if (!email || !privateKey) throw new Error('Google credentials not set')

  const now     = Math.floor(Date.now() / 1000)
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: email, scope, aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now,
  })).toString('base64url')

  const sign = createSign('RSA-SHA256')
  sign.update(`${header}.${payload}`)
  const jwt = `${header}.${payload}.${sign.sign(privateKey, 'base64url')}`

  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`Google token error: ${JSON.stringify(data)}`)
  return data.access_token
}

// Pooja's welcome-flow feedback doc (2026-09-09). Override with WF_FEEDBACK_DOC_ID.
const WF_FEEDBACK_DOC_DEFAULT = '1RmcWUUC-Gr0MO3LvBEsVp5jB47RM13TL-LLfLneMRdE'

const SHEET_HEADER = ['Date', 'Time', 'By', 'Client', 'Email', 'Section', 'Feedback']

async function appendToSheet(sheetId, row) {
  const token = await getAccessToken('https://www.googleapis.com/auth/spreadsheets')
  const auth  = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const base  = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`

  // First note into an empty sheet also writes the header row.
  const probe = await fetch(`${base}/values/A1:A1`, { headers: auth })
  if (!probe.ok) throw new Error(`Sheets GET failed: ${probe.status} ${(await probe.text()).slice(0, 200)}`)
  const probeData = await probe.json()
  const values = probeData.values?.length ? [row] : [SHEET_HEADER, row]

  const res = await fetch(`${base}/values/A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
    method: 'POST', headers: auth, body: JSON.stringify({ values }),
  })
  if (!res.ok) throw new Error(`Sheets append failed: ${res.status} ${(await res.text()).slice(0, 200)}`)
}

async function appendToDoc(docId, heading, body) {
  const token = await getAccessToken('https://www.googleapis.com/auth/documents')
  const auth  = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const docRes = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, { headers: auth })
  if (!docRes.ok) throw new Error(`Docs GET failed: ${docRes.status}`)
  const doc      = await docRes.json()
  const content  = doc.body?.content || []
  const endIndex = content[content.length - 1]?.endIndex ?? 1
  const insertAt = Math.max(1, endIndex - 1)

  const requests = [
    { insertText: { text: `\n${heading}\n${body}\n`, location: { index: insertAt } } },
    { updateTextStyle: {
        range: { startIndex: insertAt + 1, endIndex: insertAt + 1 + heading.length },
        textStyle: { bold: true }, fields: 'bold',
    } },
  ]
  const res = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
    method: 'POST', headers: auth, body: JSON.stringify({ requests }),
  })
  if (!res.ok) throw new Error(`Docs batchUpdate failed: ${res.status} ${(await res.text()).slice(0, 200)}`)
}

const rawHandler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  const sheetId = (process.env.WF_FEEDBACK_SHEET_ID || '').trim()
  const docId   = (process.env.WF_FEEDBACK_DOC_ID   || WF_FEEDBACK_DOC_DEFAULT).trim()
  if (!sheetId && !docId) {
    return { statusCode: 503, body: JSON.stringify({ error: 'Welcome-flow feedback destination is not configured yet' }) }
  }

  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body
    const { section, feedback, clientName, emailLabel, user } = JSON.parse(rawBody || '{}')
    if (!section || !feedback?.trim()) {
      return { statusCode: 400, body: JSON.stringify({ error: 'section and feedback are required' }) }
    }

    const now  = new Date()
    const date = now.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Australia/Sydney' })
    const time = now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Sydney' })
    const by     = (user || '').trim()
    const client = (clientName || '').trim()
    const label  = (emailLabel || '').trim()
    const note   = feedback.trim()

    if (sheetId) {
      await appendToSheet(sheetId, [date, time, by, client, label, section, note])
    } else {
      const heading = [label, client, section].filter(Boolean).join(' · ') + ` · ${date}${by ? ` · ${by}` : ''}`
      await appendToDoc(docId, heading, note)
    }

    console.log(`[wf-submit-feedback] ${label || 'no email'} / ${section} for ${client || 'unknown'}`)
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) }
  } catch (err) {
    console.error('[wf-submit-feedback] Error:', err.message)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}

export const handler = withAuth(rawHandler)
