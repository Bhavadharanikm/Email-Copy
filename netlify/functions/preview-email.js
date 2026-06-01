/**
 * POST /.netlify/functions/preview-email
 * Body: { client, generatedCopy, selectedImages }
 *
 * Fetches the client's GHL template HTML, replaces {{custom_values.xxx}}
 * with real copy values in memory, and returns the filled HTML for preview.
 * The actual GHL template is NEVER modified.
 */

const GHL_BASE    = 'https://services.leadconnectorhq.com'
const GHL_VERSION = '2021-07-28'

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body

    const { client, generatedCopy, selectedImages = [] } = JSON.parse(rawBody)

    const apiKey     = process.env.GHL_API_KEY
    const locationId = client?.ghl?.locationId
    const templateId = client?.ghl?.templateId
    const folderId   = client?.ghl?.folderId

    console.log('[preview-email] Searching for template', templateId, 'in folder', folderId)

    if (!apiKey || !locationId || !templateId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing client config' }) }
    }

    // ── Fetch template list to get current previewUrl ─────────────────────────
    // Try with folderId first (faster), then fall back to searching all templates
    const headers = { Authorization: `Bearer ${apiKey}`, Version: GHL_VERSION }

    let template = null

    // Pass 1 — scoped to folder (fast path, max limit=50)
    if (folderId) {
      const r1 = await fetch(
        `${GHL_BASE}/emails/public/v2/locations/${locationId}/templates?folderId=${folderId}&limit=50`,
        { headers }
      )
      const d1 = await r1.json()
      console.log('[preview-email] Pass 1 status:', r1.status, '| items:', d1.items?.length ?? 0, '| found:', !!d1.items?.find(t => t.id === templateId))
      template = d1.items?.find(t => t.id === templateId) ?? null
    }

    // Pass 2 — search top-level templates (no folder filter)
    if (!template) {
      const r2 = await fetch(
        `${GHL_BASE}/emails/public/v2/locations/${locationId}/templates?limit=50`,
        { headers }
      )
      const d2 = await r2.json()
      console.log('[preview-email] Pass 2 status:', r2.status, '| items:', d2.items?.length ?? 0, '| found:', !!d2.items?.find(t => t.id === templateId))
      template = d2.items?.find(t => t.id === templateId) ?? null
    }

    if (!template?.previewUrl) {
      return { statusCode: 404, body: JSON.stringify({ error: `Template ${templateId} not found` }) }
    }

    // ── Fetch the actual HTML from Firebase ───────────────────────────────────
    const htmlRes  = await fetch(template.previewUrl)
    const html     = await htmlRes.text()

    // ── Replace {{custom_values.xxx}} with real values (in memory only) ───────
    const bodyHtml = (generatedCopy.bodyText || '').replace(/\n/g, '<br>')

    const filled = html
      .replace(/\{\{\s*custom_values\.hero_headline\s*\}\}/g,      generatedCopy.headlineText    || '')
      .replace(/\{\{\s*custom_values\.subject_line\s*\}\}/g,       generatedCopy.subjectLine     || '')
      .replace(/\{\{\s*custom_values\.preview_text\s*\}\}/g,       generatedCopy.previewText     || '')
      .replace(/\{\{\s*custom_values\.subhead\s*\}\}/g,            generatedCopy.subhead         || '')
      .replace(/\{\{\s*custom_values\.body\s*\}\}/g,               bodyHtml)
      .replace(/\{\{\s*custom_values\.body_block_title_2\s*\}\}/g, generatedCopy.bodyBlock2Title || '')
      .replace(/\{\{\s*custom_values\.body_block_body_2\s*\}\}/g,  generatedCopy.bodyBlock2      || '')
      .replace(/\{\{\s*custom_values\.cta\s*\}\}/g,                generatedCopy.ctaText         || '')
      .replace(/\{\{\s*custom_values\.closing_line\s*\}\}/g,       generatedCopy.closingLine     || '')
      .replace(/\{\{\s*custom_values\.hero_image\s*\}\}/g,         selectedImages[0]?.url        || '')
      .replace(/\{\{\s*custom_values\.sub_image_1\s*\}\}/g,        selectedImages[1]?.url        || '')
      .replace(/\{\{\s*custom_values\.sub_image_2\s*\}\}/g,        selectedImages[2]?.url        || '')

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: filled }),
    }

  } catch (err) {
    console.error('[preview-email] Error:', err.message)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
