/**
 * GET /.netlify/functions/fetch-ghl-images
 *
 * ?locationId=XXX              → returns { folders, images } (root level)
 * ?locationId=XXX&folderId=YYY → returns { images } inside that folder
 */

const GHL_BASE    = 'https://services.leadconnectorhq.com'
const GHL_VERSION = '2021-07-28'
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']

async function ghlGet(path, apiKey) {
  const res = await fetch(`${GHL_BASE}${path}`, {
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      Version:        GHL_VERSION,
      'Content-Type': 'application/json',
    },
  })
  return res.json()
}

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' }

  const { locationId, folderId, apiKey: qApiKey } = event.queryStringParameters || {}
  const apiKey = qApiKey || process.env.GHL_API_KEY

  if (!locationId) return { statusCode: 400, body: JSON.stringify({ error: 'locationId required' }) }
  if (!apiKey)     return { statusCode: 500, body: JSON.stringify({ error: 'GHL_API_KEY not set' }) }

  try {
    if (folderId) {
      // ── Fetch subfolders + images inside a specific folder in parallel ──
      const [subFolderData, fileData] = await Promise.all([
        ghlGet(`/medias/files?locationId=${locationId}&type=folder&parentId=${folderId}&limit=100&sortBy=name&sortOrder=asc`, apiKey),
        ghlGet(`/medias/files?locationId=${locationId}&type=file&parentId=${folderId}&limit=200&sortBy=updatedAt&sortOrder=desc`, apiKey),
      ])

      const folders = (subFolderData.files || []).map(f => ({ id: f._id, name: f.name }))
      const images  = (fileData.files || [])
        .filter(f => IMAGE_TYPES.includes(f.contentType))
        .map(f => ({ id: f._id, name: f.name, url: f.url, thumbnailUrl: f.url, contentType: f.contentType }))

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folders, images }),
      }
    }

    // ── Fetch root: folders + root-level images in parallel ────────────
    const [folderData, fileData] = await Promise.all([
      ghlGet(`/medias/files?locationId=${locationId}&type=folder&limit=100&sortBy=name&sortOrder=asc`, apiKey),
      ghlGet(`/medias/files?locationId=${locationId}&type=file&limit=200&sortBy=updatedAt&sortOrder=desc`, apiKey),
    ])

    const folders = (folderData.files || []).map(f => ({
      id:   f._id,
      name: f.name,
    }))

    const images = (fileData.files || [])
      .filter(f => IMAGE_TYPES.includes(f.contentType))
      .map(f => ({ id: f._id, name: f.name, url: f.url, thumbnailUrl: f.url, contentType: f.contentType }))

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folders, images }),
    }

  } catch (err) {
    console.error('[fetch-ghl-images] Error:', err.message)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
