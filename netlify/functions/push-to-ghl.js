/**
 * POST /.netlify/functions/push-to-ghl
 * Body: { client, generatedCopy, selectedImages }
 * Returns: { success, previewUrl }
 *
 * Updates GHL Custom Values with generated copy + selected images.
 * The builder template uses {{custom_values.xxx}} and stays untouched.
 *
 * Required env var: GHL_API_KEY (Private Integration token)
 */

const GHL_BASE    = 'https://services.leadconnectorhq.com'
const GHL_VERSION = '2021-07-28'

function ghlHeaders(apiKey) {
  return {
    Authorization:  `Bearer ${apiKey}`,
    Version:        GHL_VERSION,
    'Content-Type': 'application/json',
  }
}

// ── Key slugs we care about (matches GHL fieldKey suffix) ────────────────────
const KEY_TO_FIELD = {
  hero_headline:      'hero_headline',
  subject_line:       'subject_line',
  preview_text:       'preview_text',
  subhead:            'subhead',
  body:               'body',
  body_block_title_2: 'body_block_title_2',
  body_block_body_2:  'body_block_body_2',
  cta:                'cta',
  closing_line:       'closing_line',
  hero_image:         'hero_image',
  sub_image_1:        'sub_image_1',
  sub_image_2:        'sub_image_2',
}

// ── Fetch all custom values for a location and return a fieldKey→{id,name} map
async function fetchCustomValueMap(apiKey, locationId) {
  const res = await fetch(
    `${GHL_BASE}/locations/${locationId}/customValues`,
    { headers: ghlHeaders(apiKey) }
  )
  if (!res.ok) throw new Error(`Failed to fetch custom values: ${res.status}`)
  const data = await res.json()
  const map = {}
  for (const cv of (data.customValues || [])) {
    // fieldKey is like "custom_values.hero_headline" — extract the slug after the dot
    const match = (cv.fieldKey || '').match(/custom_values\.(\w+)/)
    const slug = match ? match[1] : ''
    if (slug) map[slug] = { id: cv.id, name: cv.name }
  }
  return map
}

// ── Update a single custom value ─────────────────────────────────────────────
async function updateCustomValue(apiKey, locationId, { id, name }, value) {
  const res = await fetch(
    `${GHL_BASE}/locations/${locationId}/customValues/${id}`,
    {
      method:  'PUT',
      headers: ghlHeaders(apiKey),
      body:    JSON.stringify({ name, value: value || '' }),
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to update custom value ${id}: ${res.status} ${text}`)
  }
  return res.json()
}

// ── Handler ──────────────────────────────────────────────────────────────────
export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body

    const { client, generatedCopy, selectedImages = [], templateId, locationId: urlLocationId } = JSON.parse(rawBody)

    // Use client's own API key from sheet, fall back to env var
    const apiKey     = client?.ghlApiKey || process.env.GHL_API_KEY
    // Use locationId from pasted URL first, fall back to client config
    const locationId = urlLocationId || client?.ghl?.locationId
    const resolvedTemplateId = templateId || client?.ghl?.templateId || null

    if (!apiKey)     throw new Error('GHL_API_KEY env var not set')
    if (!locationId) throw new Error('No locationId for this client')

    // ── Fetch this location's custom value IDs dynamically ───────────────────
    const cvMap = await fetchCustomValueMap(apiKey, locationId)

    // ── Build the values to update ────────────────────────────────────────────
    const updates = {
      hero_headline:      generatedCopy.headlineText    || '',
      subject_line:       generatedCopy.subjectLine     || '',
      preview_text:       generatedCopy.previewText     || '',
      subhead:            generatedCopy.subhead          || '',
      body:               generatedCopy.bodyText         || '',
      body_block_title_2: generatedCopy.bodyBlock2Title  || '',
      body_block_body_2:  generatedCopy.bodyBlock2       || '',
      cta:                generatedCopy.ctaText          || '',
      closing_line:       generatedCopy.closingLine      || '',
      hero_image:         selectedImages[0]?.url         || '',
      sub_image_1:        selectedImages[1]?.url         || '',
      sub_image_2:        selectedImages[2]?.url         || '',
    }

    // ── Update all custom values in parallel ──────────────────────────────────
    await Promise.all(
      Object.entries(updates).map(([key, value]) => {
        const cv = cvMap[KEY_TO_FIELD[key]]
        if (!cv) { console.warn(`[push-to-ghl] Custom value not found for key: ${key}`); return }
        return updateCustomValue(apiKey, locationId, cv, value)
      })
    )

    console.log(`[push-to-ghl] Updated ${Object.keys(updates).length} custom values for ${client.name}`)

    // Build preview URL — link directly to the template if we have its ID
    const emailsBase = `https://app.gohighlevel.com/v2/location/${locationId}/marketing/emails`
    const previewUrl = resolvedTemplateId
      ? `${emailsBase}/builder/${resolvedTemplateId}`
      : `${emailsBase}/all?pageNumber=1`

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, previewUrl }),
    }

  } catch (err) {
    console.error('[push-to-ghl] Error:', err.message)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
