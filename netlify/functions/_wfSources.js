/**
 * What the welcome-flow copywriter reads, fetched server-side:
 *
 *   1. the client's copy brief — a Google Doc, linked from the client's row in
 *      the "Welcome Email Copy Brief" sheet (the same sheet and doc the n8n
 *      workflow reads)
 *   2. the client's brand board row — website, contact, footer, socials
 *   3. the feedback document, trimmed to the section for this one email
 *
 * All three are read-only. The service account needs viewer access to the
 * sheet and to each client's brief doc.
 */
import { createSign } from 'crypto'

const BRIEF_SHEET_ID   = '1Ho4qPghhieT8hs9ftypRhPTb2wTemZwTi4p2jSXzELk'
const BRAND_SHEET_ID   = '14HEBZ9DPckY9jJRq-DYUZYI6bz2WJHhec9LTmP8FP54'
const FEEDBACK_DOC_ID  = '1RmcWUUC-Gr0MO3LvBEsVp5jB47RM13TL-LLfLneMRdE'

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/documents.readonly',
].join(' ')

let cachedToken = null   // { token, exp }

async function googleToken() {
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.token
  const email      = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  if (!email || !privateKey) throw new Error('Google service account is not configured')

  const now     = Math.floor(Date.now() / 1000)
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: email, scope: SCOPES, aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now,
  })).toString('base64url')
  const sign = createSign('RSA-SHA256')
  sign.update(`${header}.${payload}`)
  const jwt = `${header}.${payload}.${sign.sign(privateKey, 'base64url')}`

  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`Google auth failed: ${data.error_description || data.error || res.status}`)
  cachedToken = { token: data.access_token, exp: Date.now() + 3500_000 }
  return data.access_token
}

async function googleGet(url) {
  const res  = await fetch(url, { headers: { Authorization: `Bearer ${await googleToken()}` } })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || `Google API ${res.status}`)
  return data
}

const norm = (s) => (s || '').trim().toLowerCase()

async function sheetRows(sheetId, range) {
  const data = await googleGet(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`)
  return data.values || []
}

/* ── Google Doc → plain text ───────────────────────────────────────────── */

function paragraphText(p) {
  return (p.elements || []).map(e => e.textRun?.content || '').join('')
}

function contentText(content = []) {
  let out = ''
  for (const el of content) {
    if (el.paragraph) out += paragraphText(el.paragraph)
    else if (el.table) {
      for (const row of el.table.tableRows || []) {
        const cells = (row.tableCells || []).map(c => contentText(c.content).trim().replace(/\n+/g, ' '))
        out += cells.join(' | ') + '\n'
      }
    }
  }
  return out
}

/** Every tab of the doc, in order, as one text. */
function docText(doc) {
  const walk = (tabs = []) => tabs.flatMap(t => [
    (t.tabProperties?.title && tabs.length > 1 ? `\n## ${t.tabProperties.title}\n` : '') + contentText(t.documentTab?.body?.content),
    ...walk(t.childTabs),
  ])
  const text = doc.tabs?.length ? walk(doc.tabs).join('\n') : contentText(doc.body?.content)
  return text.replace(/\n{3,}/g, '\n\n').trim()
}

/* ── 1. copy brief ─────────────────────────────────────────────────────── */

export async function fetchCopyBrief(clientName) {
  const [header = [], ...rows] = await sheetRows(BRIEF_SHEET_ID, 'A1:Z500')
  const col  = (name) => header.findIndex(h => norm(h) === norm(name))
  const iName = col('Client Name'), iDoc = col('Email Copy Brief'), iSite = col('Client Website')
  const row  = rows.find(r => norm(r[iName]) === norm(clientName))
  if (!row) throw new Error(`"${clientName}" has no row in the Welcome Email Copy Brief sheet`)

  const docId = (row[iDoc] || '').match(/\/d\/([\w-]+)/)?.[1]
  if (!docId) throw new Error(`"${clientName}" has no copy brief doc linked in the Welcome Email Copy Brief sheet`)

  const doc  = await googleGet(`https://docs.googleapis.com/v1/documents/${docId}?includeTabsContent=true`)
  const text = docText(doc)
  if (!text) throw new Error(`The copy brief doc for "${clientName}" is empty`)
  return { title: doc.title || '', text, website: iSite >= 0 ? (row[iSite] || '').trim() : '' }
}

/* ── 2. brand board row ────────────────────────────────────────────────── */

export async function fetchBrandRow(clientName) {
  const rows = await sheetRows(BRAND_SHEET_ID, 'Sheet1!A:K')
  const row  = rows.find(r => norm(r[0]) === norm(clientName))
  if (!row) return null
  return {
    contactInfo:   row[4] || '',
    footerText:    row[5] || '',
    instagramUrl:  row[6] || '',
    facebookUrl:   row[7] || '',
    tiktokUrl:     row[8] || '',
    websiteUrl:    row[9] || '',
    contactNumber: row[10] || '',
  }
}

/* ── 3. feedback for one email ─────────────────────────────────────────── */

/**
 * Only the text under this email's own "Email N" heading. The heading decides,
 * never the content: a note filed under Email 6 can look relevant to Email 2
 * and still be about different copy.
 */
export async function fetchFeedbackSection(week) {
  const doc = await googleGet(`https://docs.googleapis.com/v1/documents/${FEEDBACK_DOC_ID}`)
  const lines = []
  let inSection = false
  for (const el of doc.body?.content || []) {
    if (!el.paragraph) continue
    const text  = paragraphText(el.paragraph).trim()
    const style = el.paragraph.paragraphStyle?.namedStyleType || ''
    const m     = text.match(/^Email\s+(\d)\b/i)
    if (style.startsWith('HEADING') && m) { inSection = Number(m[1]) === Number(week); continue }
    if (inSection && text) lines.push(text)
  }
  return lines.join('\n')
}
