/**
 * GET /.netlify/functions/fetch-ghl-images?locationId=XXX
 * Returns images from the GHL Media Library for a given location.
 */

const GHL_BASE    = 'https://services.leadconnectorhq.com'
const GHL_VERSION = '2021-07-28'

// SVGs excluded — they don't work as email images
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const locationId = event.queryStringParameters?.locationId
  const apiKey     = event.queryStringParameters?.apiKey || process.env.GHL_API_KEY

  if (!locationId) return { statusCode: 400, body: JSON.stringify({ error: 'locationId required' }) }
  if (!apiKey)     return { statusCode: 500, body: JSON.stringify({ error: 'GHL_API_KEY not set' }) }

  try {
    const res  = await fetch(
      `${GHL_BASE}/medias/files?locationId=${locationId}&type=file&limit=100&sortBy=updatedAt&sortOrder=desc`,
      {
        headers: {
          Authorization:  `Bearer ${apiKey}`,
          Version:        GHL_VERSION,
          'Content-Type': 'application/json',
        },
      }
    )

    const data = await res.json()

    // Filter to images only and shape for the picker
    const images = (data.files || [])
      .filter(f => IMAGE_TYPES.includes(f.contentType))
      .map(f => ({
        id:           f._id,
        name:         f.name,
        url:          f.url,
        thumbnailUrl: f.url,   // GHL CDN URLs work directly as thumbnails
        contentType:  f.contentType,
      }))

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images }),
    }

  } catch (err) {
    console.error('[fetch-ghl-images] Error:', err.message)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
