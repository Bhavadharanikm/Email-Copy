/**
 * GET /.netlify/functions/proxy-image?url=<encoded-url>
 * Fetches a remote image and re-serves it with CORS headers.
 * Used by the client-side html-to-image renderer so canvas captures
 * don't get tainted by cross-origin images.
 */
export const handler = async (event) => {
  const url = event.queryStringParameters?.url
  if (!url) return { statusCode: 400, body: 'Missing url parameter' }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EmailStudio/1.0)' },
    })
    if (!res.ok) return { statusCode: res.status, body: `Upstream error: ${res.status}` }

    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'image/jpeg'

    return {
      statusCode: 200,
      headers: {
        'Content-Type':                contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control':               'public, max-age=3600',
      },
      body:            Buffer.from(buffer).toString('base64'),
      isBase64Encoded: true,
    }
  } catch (err) {
    return { statusCode: 500, body: `Proxy error: ${err.message}` }
  }
}
