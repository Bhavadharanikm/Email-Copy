/**
 * GET /.netlify/functions/fetch-brand-board
 * ?locationId=XXX&apiKey=YYY (apiKey optional, falls back to GHL_API_KEY)
 *
 * Returns the default brand board's colors, fonts, and logos for a location.
 */

const GHL_BASE    = 'https://services.leadconnectorhq.com'
const GHL_VERSION = '2023-02-21'

async function ghlGet(path, apiKey) {
  const res = await fetch(`${GHL_BASE}${path}`, {
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      Version:        GHL_VERSION,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GHL ${res.status}: ${text}`)
  }
  return res.json()
}

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' }

  const { locationId, apiKey: qApiKey } = event.queryStringParameters || {}
  const apiKey = qApiKey || process.env.GHL_API_KEY

  if (!locationId) return { statusCode: 400, body: JSON.stringify({ error: 'locationId required' }) }
  if (!apiKey)     return { statusCode: 500, body: JSON.stringify({ error: 'GHL_API_KEY not set' }) }

  try {
    // Step 1 — get all brand boards for the location
    const listData = await ghlGet(`/brand-boards/${locationId}`, apiKey)
    const boards = listData.brandBoards || []

    if (!boards.length) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ colors: [], fonts: [], logos: [] }),
      }
    }

    // Step 2 — use default board, fall back to first
    const board = boards.find(b => b.default) || boards[0]
    const detail = await ghlGet(`/brand-boards/${locationId}/${board._id}`, apiKey)

    // Shape the response
    const colors = (detail.colors || []).map(c => ({
      id:    c._id,
      label: c.label || '',
      hex:   c.hex,
      hexa:  c.hexa,
      rgba:  c.rgba,
    }))

    const fonts = (detail.fonts || []).map(f => ({
      id:       f._id,
      label:    f.label || f.font,
      font:     f.font,
      fallback: f.fallback || '',
    }))

    const logos = (detail.logos || []).map(l => ({
      id:    l._id,
      label: l.label || '',
      url:   l.url,
    }))

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boardId:   detail._id,
        boardName: detail.name,
        colors,
        fonts,
        logos,
      }),
    }

  } catch (err) {
    console.error('[fetch-brand-board] Error:', err.message)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
