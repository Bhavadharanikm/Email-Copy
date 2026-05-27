/**
 * POST /.netlify/functions/push-to-ghl
 * Body: { client, renderedHtml, generatedCopy }
 * Returns: { success, campaignId, previewUrl }
 *
 * Loads client HTML template, fills copy fields, creates a GHL campaign draft.
 * Required env var: GHL_API_KEY (Private Integration token)
 */

import { readFileSync } from 'fs'
import { join }         from 'path'

const GHL_BASE    = 'https://services.leadconnectorhq.com'
const GHL_VERSION = '2021-07-28'

// ── Template file map (add new clients here) ────────────────────────────────
const TEMPLATE_MAP = {
  c1: 'flohom-template.html',   // FLOHOM
  c2: null,                      // The Cohost Company — coming soon
  c3: null,                      // Evergreen Cabins — coming soon
}

function ghlHeaders(apiKey) {
  return {
    Authorization:  `Bearer ${apiKey}`,
    Version:        GHL_VERSION,
    'Content-Type': 'application/json',
  }
}

function fillTemplate(templateHtml, copy, imageUrl = '') {
  // Build optional body block 2 section
  const block2Section = copy.bodyBlock2Title ? `
    <tr>
      <td align="left" style="font-size:0px;padding:12px 32px 4px 32px;word-break:break-word;">
        <div style="font-family:arial,helvetica,sans-serif;font-size:14px;line-height:1.25;text-align:left;color:#000000;">
          <p style="margin:0;line-height:1.5;">
            <span style="color:{{ brandboards.b975 }} !important;font-size:18px;font-family:arial,helvetica,sans-serif;font-weight:600;">${copy.bodyBlock2Title}</span>
          </p>
        </div>
      </td>
    </tr>
    <tr>
      <td align="left" style="font-size:0px;padding:4px 32px 12px 32px;word-break:break-word;">
        <div style="font-family:arial,helvetica,sans-serif;font-size:14px;line-height:1.25;text-align:left;color:#000000;">
          <p style="margin:0;line-height:1.6;">
            <span style="color:{{ brandboards.b975 }} !important;font-size:16px;font-family:arial,helvetica,sans-serif;">${copy.bodyBlock2 || ''}</span>
          </p>
        </div>
      </td>
    </tr>` : ''

  // Replace newlines in body text with <br> tags
  const bodyHtml = (copy.bodyText || '').replace(/\n/g, '<br>')

  return templateHtml
    .replace(/\[\[PREVIEW_TEXT\]\]/g,        copy.previewText     || '')
    .replace(/\[\[HEADLINE_TEXT\]\]/g,        copy.headlineText    || '')
    .replace(/\[\[SUBHEAD\]\]/g,              copy.subhead         || '')
    .replace(/\[\[BODY_TEXT\]\]/g,            bodyHtml)
    .replace(/\[\[BODY_BLOCK_2_SECTION\]\]/g, block2Section)
    .replace(/\[\[CLOSING_LINE\]\]/g,         copy.closingLine     || '')
    .replace(/\[\[CTA_TEXT\]\]/g,             copy.ctaText         || 'Book Now')
    .replace(/\[\[CTA_URL\]\]/g,              copy.ctaUrl          || '#')
    .replace(/\[\[HERO_IMAGE_URL\]\]/g,       imageUrl             || 'https://assets.cdn.filesafe.space/CZvj81MucHmlUc96LpJS/media/69fb4a579594baa062dffd33.png')
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body

    const { client, generatedCopy, selectedImages } = JSON.parse(rawBody)

    const apiKey     = process.env.GHL_API_KEY
    const locationId = client?.ghl?.locationId

    if (!apiKey)     throw new Error('GHL_API_KEY env var not set')
    if (!locationId) throw new Error('No locationId for this client')

    // ── Load and fill HTML template ──────────────────────────────────────────
    const templateFile = TEMPLATE_MAP[client.id]
    let filledHtml

    if (templateFile) {
      const templatePath = join('/var/task', 'clients', templateFile)
      const templateHtml = readFileSync(templatePath, 'utf-8')
      const heroImageUrl = selectedImages?.[0]?.url || ''
      filledHtml = fillTemplate(templateHtml, generatedCopy, heroImageUrl)
    } else {
      // Fallback: plain HTML for clients without a template yet
      filledHtml = buildPlainHtml(generatedCopy)
    }

    // ── Create campaign draft in GHL ─────────────────────────────────────────
    const campaignName = `[HGM] ${client.name} — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

    const res = await fetch(`${GHL_BASE}/email-marketing/campaigns`, {
      method:  'POST',
      headers: ghlHeaders(apiKey),
      body: JSON.stringify({
        locationId,
        name:        campaignName,
        subject:     generatedCopy.subjectLine,
        previewText: generatedCopy.previewText || '',
        html:        filledHtml,
        status:      'draft',
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('[push-to-ghl] GHL API error:', JSON.stringify(data))
      throw new Error(data.message || `GHL returned ${res.status}`)
    }

    const campaignId = data.id || data.campaign?.id || data.data?.id
    const previewUrl = `https://app.gohighlevel.com/v2/location/${locationId}/marketing/emails/scheduled`

    console.log(`[push-to-ghl] Created campaign ${campaignId} for ${client.name}`)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, campaignId, previewUrl }),
    }

  } catch (err) {
    console.error('[push-to-ghl] Error:', err.message)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}

function buildPlainHtml(copy) {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
    <h1 style="font-size:28px;">${copy.headlineText || ''}</h1>
    <p style="font-size:18px;font-weight:600;">${copy.subhead || ''}</p>
    <p style="font-size:16px;line-height:1.6;">${(copy.bodyText || '').replace(/\n/g,'<br>')}</p>
    ${copy.bodyBlock2Title ? `<h2 style="font-size:20px;margin-top:32px;">${copy.bodyBlock2Title}</h2>` : ''}
    ${copy.bodyBlock2 ? `<p style="font-size:16px;line-height:1.6;">${copy.bodyBlock2}</p>` : ''}
    <p style="font-style:italic;">${copy.closingLine || ''}</p>
    <a href="${copy.ctaUrl||'#'}" style="display:inline-block;margin-top:24px;padding:14px 28px;background:#2D6A4F;color:#fff;text-decoration:none;border-radius:999px;">${copy.ctaText||'Book Now'}</a>
  </body></html>`
}
