/**
 * Shared Netlify→Vercel request adapter.
 * Converts Vercel (req, res) into the Netlify event format and vice-versa.
 */

export async function runHandler(fn, req, res) {
  // Read raw body
  const rawBody = await new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end',  () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })

  // Strip Vercel routing slug from query params
  const { slug: _slug, ...queryStringParameters } = req.query || {}

  const event = {
    httpMethod:            req.method,
    path:                  req.url,
    queryStringParameters: queryStringParameters || {},
    headers:               req.headers || {},
    body:                  rawBody.length > 0 ? rawBody.toString('utf-8') : null,
    isBase64Encoded:       false,
  }

  try {
    const result = await fn(event, {})
    const headers = result.headers || {}
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v))
    res.status(result.statusCode || 200)
    if (result.isBase64Encoded) {
      res.send(Buffer.from(result.body, 'base64'))
    } else {
      res.end(result.body ?? '')
    }
  } catch (err) {
    console.error('[adapter] handler error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
