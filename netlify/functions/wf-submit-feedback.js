/**
 * POST /.netlify/functions/wf-submit-feedback
 * Body: { section, feedback, clientName, emailLabel, week, user }
 *
 * Welcome-flow feedback. Same service account as submit-feedback, but its own
 * destination so welcome-flow notes never land in the weekly guidelines doc.
 *
 *   WF_FEEDBACK_SHEET_ID  — a Google Sheet: one row per note
 *                           (Date, Time, By, Client, Email, Section, Feedback)
 *   WF_FEEDBACK_DOC_ID    — or a Google Doc with an "Email 1" … "Email 9" heading
 *                           each; every note is filed under its email's heading
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

const DOC_SCOPE = 'https://www.googleapis.com/auth/documents'
const HEADINGS  = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `Email ${n}`)

async function docGet(docId, auth) {
  const res = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, { headers: auth })
  if (!res.ok) throw new Error(`Docs GET failed: ${res.status}`)
  return res.json()
}

async function docBatch(docId, auth, requests) {
  const res = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
    method: 'POST', headers: auth, body: JSON.stringify({ requests }),
  })
  if (!res.ok) throw new Error(`Docs batchUpdate failed: ${res.status} ${(await res.text()).slice(0, 200)}`)
}

/** Every paragraph as { start, end, text, heading } in document order. */
function paragraphsOf(doc) {
  return (doc.body?.content || [])
    .filter(e => e.paragraph)
    .map(e => ({
      start:   e.startIndex,
      end:     e.endIndex,
      text:    e.paragraph.elements.map(x => x.textRun?.content || '').join('').replace(/\n$/, '').trim(),
      heading: /^HEADING_/.test(e.paragraph.paragraphStyle?.namedStyleType || ''),
    }))
}

/** The "Email N" headings that exist, in order: [{ n, start, end }]. */
function emailHeadings(paras) {
  return paras
    .map(p => ({ p, m: p.heading ? /^Email\s+([1-9])\b/i.exec(p.text) : null }))
    .filter(x => x.m)
    .map(x => ({ n: Number(x.m[1]), start: x.p.start, end: x.p.end }))
}

const docEnd = (doc) => {
  const c = doc.body?.content || []
  return c[c.length - 1]?.endIndex ?? 1
}

/**
 * Make sure every "Email N" heading exists, in order 1..9. An empty doc gets
 * all nine in one batch; a doc with some already gets the missing ones slotted
 * in one at a time (each insert moves the indexes, so refetch between them).
 */
async function ensureHeadings(docId, auth) {
  let doc = await docGet(docId, auth)
  let heads = emailHeadings(paragraphsOf(doc))

  if (!heads.length) {
    const insertAt = Math.max(1, docEnd(doc) - 1)
    const text     = HEADINGS.join('\n')
    const requests = [{ insertText: { text, location: { index: insertAt } } }]
    let cursor = insertAt
    for (const h of HEADINGS) {
      requests.push({ updateParagraphStyle: {
        range: { startIndex: cursor, endIndex: cursor + h.length },
        paragraphStyle: { namedStyleType: 'HEADING_1' }, fields: 'namedStyleType',
      } })
      cursor += h.length + 1
    }
    await docBatch(docId, auth, requests)
    return docGet(docId, auth)
  }

  for (let n = 1; n <= 9; n++) {
    if (heads.some(h => h.n === n)) continue
    const next     = heads.find(h => h.n > n)
    const insertAt = Math.max(1, (next ? next.start : docEnd(doc)) - 1)
    const label    = `Email ${n}`
    await docBatch(docId, auth, [
      { insertText: { text: `\n${label}`, location: { index: insertAt } } },
      { updateParagraphStyle: {
        range: { startIndex: insertAt + 1, endIndex: insertAt + 1 + label.length },
        paragraphStyle: { namedStyleType: 'HEADING_1' }, fields: 'namedStyleType',
      } },
      { updateTextStyle: {
        range: { startIndex: insertAt + 1, endIndex: insertAt + 1 + label.length },
        textStyle: { bold: false }, fields: 'bold',
      } },
    ])
    doc   = await docGet(docId, auth)
    heads = emailHeadings(paragraphsOf(doc))
  }
  return doc
}

/**
 * File a note at the end of the "Email {week}" section: a bold title line,
 * then the note as normal text. Exported so the placement can be exercised
 * against a scratch doc.
 */
export async function placeNoteInDoc(docId, token, week, title, body) {
  const auth  = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const doc   = await ensureHeadings(docId, auth)
  const paras = paragraphsOf(doc)
  const heads = emailHeadings(paras)
  const here  = heads.find(h => h.n === week)
  if (!here) throw new Error(`Heading "Email ${week}" missing after setup`)

  // The section ends where the next heading of any kind starts, or at the doc end.
  const nextHead = paras.find(p => p.heading && p.start >= here.end)
  const insertAt = Math.max(1, (nextHead ? nextHead.start : docEnd(doc)) - 1)

  const text       = `\n${title}\n${body}`
  const titleStart = insertAt + 1
  const titleEnd   = titleStart + title.length
  const bodyStart  = titleEnd + 1
  const bodyEnd    = insertAt + text.length

  await docBatch(docId, auth, [
    { insertText: { text, location: { index: insertAt } } },
    { updateParagraphStyle: {
      range: { startIndex: titleStart, endIndex: bodyEnd },
      paragraphStyle: { namedStyleType: 'NORMAL_TEXT' }, fields: 'namedStyleType',
    } },
    { updateTextStyle: { range: { startIndex: titleStart, endIndex: titleEnd }, textStyle: { bold: true },  fields: 'bold' } },
    { updateTextStyle: { range: { startIndex: bodyStart,  endIndex: bodyEnd  }, textStyle: { bold: false }, fields: 'bold' } },
  ])
}

export { getAccessToken, DOC_SCOPE }

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
    const { section, feedback, clientName, emailLabel, week: rawWeek, user } = JSON.parse(rawBody || '{}')
    if (!section || !feedback?.trim()) {
      return { statusCode: 400, body: JSON.stringify({ error: 'section and feedback are required' }) }
    }
    const week = Number(rawWeek)
    if (!Number.isInteger(week) || week < 1 || week > 9) {
      return { statusCode: 400, body: JSON.stringify({ error: 'week must be 1 to 9 so the note can be filed under its email' }) }
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
      const title = [client, section].filter(Boolean).join(' · ') + ` · ${date}${by ? ` · ${by}` : ''}`
      const token = await getAccessToken(DOC_SCOPE)
      await placeNoteInDoc(docId, token, week, title, note)
    }

    console.log(`[wf-submit-feedback] ${label || 'no email'} / ${section} for ${client || 'unknown'}`)
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) }
  } catch (err) {
    console.error('[wf-submit-feedback] Error:', err.message)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}

export const handler = withAuth(rawHandler)
