/**
 * api.js
 * Thin wrappers around Netlify Function endpoints.
 * All API keys stay server-side — these calls go to /.netlify/functions/*
 */

const BASE = '/.netlify/functions'

async function post(path, body) {
  const res  = await fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  const text = await res.text()
  if (!text) throw new Error(`Empty response from ${path} (status ${res.status}) — check Netlify function logs`)
  const data = JSON.parse(text)
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`)
  return data
}

async function get(path, params = {}) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${BASE}${path}${qs ? `?${qs}` : ''}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`)
  return data
}

// ── Client list ──────────────────────────────────────────────────
export const fetchClients = () =>
  get('/clients')

// ── Claude copy generation ───────────────────────────────────────
export const generateCopy = ({ client, prompt }) =>
  post('/generate-copy', { client, prompt })

// ── Google Drive images ──────────────────────────────────────────
export const fetchDriveImages = ({ folderId }) =>
  get('/get-drive-images', { folderId })

// ── Push to GHL ──────────────────────────────────────────────────
export const pushToGHL = ({ client, renderedHtml, generatedCopy }) =>
  post('/push-to-ghl', { client, renderedHtml, generatedCopy })

// ── Google Chat notification ─────────────────────────────────────
export const notifyChat = ({ clientName, previewUrl, approvedBy }) =>
  post('/notify-chat', { clientName, previewUrl, approvedBy })

// ── Google Sheets logging ─────────────────────────────────────────
// Pass { client, variations } to log all 3 at once (after generation)
// Pass { client, generatedCopy, variationLabel } to log the selected one (on approval)
export const logToSheets = (payload) =>
  post('/log-to-sheets', payload)
