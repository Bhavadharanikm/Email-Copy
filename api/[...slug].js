/**
 * Vercel catch-all adapter for Netlify-format serverless functions.
 * Routes /.netlify/functions/:name → /api/:name (via vercel.json rewrite).
 * Converts Vercel (req, res) ↔ Netlify { event } format.
 */

export const config = {
  api: {
    bodyParser: false,   // read raw body ourselves so Netlify fns can parse it
    responseLimit: false, // allow large payloads (e.g. proxy-image binary)
  },
}

export default async function handler(req, res) {
  const slugArr = Array.isArray(req.query.slug) ? req.query.slug : [req.query.slug]
  const fnName  = slugArr[0]

  if (!fnName) return res.status(404).json({ error: 'Function not found' })

  // Read raw body as Buffer
  const rawBody = await new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end',  () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })

  // Strip the Vercel routing slug from query params before passing to function
  const { slug: _slug, ...queryStringParameters } = req.query

  const event = {
    httpMethod:            req.method,
    path:                  req.url,
    queryStringParameters: queryStringParameters || {},
    headers:               req.headers || {},
    body:                  rawBody.length > 0 ? rawBody.toString('utf-8') : null,
    isBase64Encoded:       false,
  }

  try {
    const mod = await import(`../netlify/functions/${fnName}.js`)
    const netlifyHandler = mod.handler

    if (typeof netlifyHandler !== 'function') {
      return res.status(404).json({ error: `No handler in ${fnName}` })
    }

    const result = await netlifyHandler(event, {})

    const headers = result.headers || {}
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v))
    res.status(result.statusCode || 200)

    if (result.isBase64Encoded) {
      res.send(Buffer.from(result.body, 'base64'))
    } else {
      res.end(result.body ?? '')
    }
  } catch (err) {
    console.error(`[vercel-adapter] ${fnName}:`, err.message)
    res.status(500).json({ error: err.message })
  }
}
