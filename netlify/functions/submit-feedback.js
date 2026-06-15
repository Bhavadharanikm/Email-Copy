/**
 * POST /.netlify/functions/submit-feedback
 * Body: { section, feedback, clientName }
 *
 * Appends a feedback entry to the HGM copy guidelines Google Doc.
 * Required env vars:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_PRIVATE_KEY
 *   FEEDBACK_DOC_ID  — the Google Doc ID to append to
 */

import { createSign } from 'crypto'

async function getAccessToken() {
  const email      = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim()
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').trim().replace(/\\n/g, '\n')
  if (!email || !privateKey) throw new Error('Google credentials not set')

  const now     = Math.floor(Date.now() / 1000)
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss:   email,
    scope: 'https://www.googleapis.com/auth/documents',
    aud:   'https://oauth2.googleapis.com/token',
    exp:   now + 3600,
    iat:   now,
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

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  const docId = process.env.FEEDBACK_DOC_ID || '13dgnHnPpGDE8BeU3od2JQq52En7jtHhgn5gVs1Qozf4'

  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body

    const { section, feedback, clientName } = JSON.parse(rawBody || '{}')
    if (!section || !feedback?.trim()) {
      return { statusCode: 400, body: JSON.stringify({ error: 'section and feedback are required' }) }
    }

    const accessToken = await getAccessToken()

    // Get the document to find the current end index
    const docRes = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!docRes.ok) throw new Error(`Docs GET failed: ${docRes.status}`)
    const doc = await docRes.json()

    // Body content array — last element is the end-of-body marker
    const bodyContent = doc.body?.content || []
    const lastElem    = bodyContent[bodyContent.length - 1]
    const endIndex    = lastElem?.endIndex ?? 1

    // Build the text to insert (before the final newline at endIndex)
    const date       = new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
    const clientPart = clientName ? ` — ${clientName}` : ''
    const insertText = `\n${section}${clientPart} · ${date}\n${feedback.trim()}\n`

    // insertText goes at endIndex - 1 (just before the trailing newline)
    const insertAt = Math.max(1, endIndex - 1)

    const requests = [
      {
        insertText: {
          text:     insertText,
          location: { index: insertAt },
        },
      },
      // Bold the first line (section + client + date)
      {
        updateTextStyle: {
          range: {
            startIndex: insertAt + 1,
            endIndex:   insertAt + 1 + section.length + clientPart.length + 3 + date.length,
          },
          textStyle:       { bold: true },
          fields:          'bold',
        },
      },
    ]

    const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    })

    if (!updateRes.ok) {
      const text = await updateRes.text()
      throw new Error(`Docs batchUpdate failed: ${updateRes.status} ${text.slice(0, 200)}`)
    }

    console.log(`[submit-feedback] Appended "${section}" feedback for ${clientName || 'unknown'}`)
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true }),
    }
  } catch (err) {
    console.error('[submit-feedback] Error:', err.message)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
