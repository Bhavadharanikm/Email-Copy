/**
 * GET /.netlify/functions/fetch-template-name?templateId=xxx&locationId=xxx
 * Returns the name/title of a GHL email template by its ID.
 */

const GHL_BASE    = 'https://services.leadconnectorhq.com'
const GHL_VERSION = '2021-07-28'

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const { templateId, locationId, apiKey } = event.queryStringParameters || {}

  if (!templateId || !locationId || !apiKey) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing templateId, locationId, or apiKey' }) }
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    Version:       GHL_VERSION,
  }

  try {
    // Helper to search templates in a specific folder (or top-level if no folderId)
    async function searchInFolder(folderId) {
      const url = folderId
        ? `${GHL_BASE}/emails/public/v2/locations/${locationId}/templates?folderId=${folderId}&limit=50`
        : `${GHL_BASE}/emails/public/v2/locations/${locationId}/templates?limit=50`
      const res = await fetch(url, { headers })
      const data = await res.json()
      return (data.items || []).find(t => t.id === templateId) || null
    }

    // Fetch top-level items — includes both templates AND folders as items
    const topRes  = await fetch(
      `${GHL_BASE}/emails/public/v2/locations/${locationId}/templates?limit=50`,
      { headers }
    )
    const topData = await topRes.json()
    const topItems = topData.items || []

    // Check if the template itself is at top level
    let match = topItems.find(t => t.id === templateId && t.type !== 'folder')
    if (match) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: match.name || 'Untitled' }),
      }
    }

    // Get all folders from top-level items
    const folders = topItems.filter(t => t.type === 'folder')
    console.log(`[fetch-template-name] Searching ${folders.length} folders for ${templateId}`)

    for (const folder of folders) {
      match = await searchInFolder(folder.id)
      if (match) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: match.name || 'Untitled' }),
        }
      }
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Template not found across all folders.' }),
    }

  } catch (err) {
    console.error('[fetch-template-name] Error:', err.message)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
