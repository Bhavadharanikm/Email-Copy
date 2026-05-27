/**
 * api.js
 * Thin wrappers around Netlify Function endpoints.
 * All API keys stay server-side — these calls go to /.netlify/functions/*
 */

const BASE = '/.netlify/functions'

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  const data = await res.json()
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
export const generateCopy = ({ client, brief }) =>
  post('/generate-copy', { client, brief })

// ── Google Drive images ──────────────────────────────────────────
export const fetchDriveImages = ({ folderId }) =>
  get('/get-drive-images', { folderId })

// ── Push to GHL ──────────────────────────────────────────────────
export const pushToGHL = ({ client, renderedHtml, generatedCopy }) =>
  post('/push-to-ghl', { client, renderedHtml, generatedCopy })

// ── Google Chat notification ─────────────────────────────────────
export const notifyChat = ({ clientName, previewUrl, approvedBy }) =>
  post('/notify-chat', { clientName, previewUrl, approvedBy })
