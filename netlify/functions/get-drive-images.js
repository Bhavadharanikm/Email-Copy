/**
 * GET /.netlify/functions/get-drive-images?folderId=XXX
 * Returns: [{ id, name, url, thumbnailUrl }]
 *
 * TODO: Wire up Google Drive API once GOOGLE_* credentials are provided.
 */

export const handler = async (event) => {
  const { folderId } = event.queryStringParameters || {}

  if (!folderId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'folderId is required' }) }
  }

  try {
    // ── STUB — replace with real Google Drive API call ────────────────────
    // const { google } = await import('googleapis')
    // const auth = new google.auth.GoogleAuth({ ... })
    // const drive = google.drive({ version: 'v3', auth })
    // const res = await drive.files.list({ q: `'${folderId}' in parents and mimeType contains 'image/'` })
    // ────────────────────────────────────────────────────────────────────────

    // Placeholder — returns 6 sample images so the picker renders
    const stub = Array.from({ length: 6 }, (_, i) => ({
      id:           `stub_img_${i + 1}`,
      name:         `Sample Image ${i + 1}.jpg`,
      url:          `https://picsum.photos/seed/${folderId}${i}/800/600`,
      thumbnailUrl: `https://picsum.photos/seed/${folderId}${i}/200/200`,
    }))

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stub),
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
