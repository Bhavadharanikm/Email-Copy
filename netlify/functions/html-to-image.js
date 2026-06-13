/**
 * POST /.netlify/functions/html-to-image
 * Renders HTML to a PNG and returns a hosted image URL.
 *
 * Priority:
 *   1. html2image.net (fast, external)
 *   2. Puppeteer (local Chromium → upload to GHL Media Library)
 *
 * Body: { html, width?, height?, locationId? }
 * Returns: { url }
 */

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const GHL_BASE    = 'https://services.leadconnectorhq.com'
const GHL_VERSION = '2021-07-28'

// ── html2image.net ────────────────────────────────────────────────────────

async function callHtml2Image(apiKey, html, width, height) {
  const qs = new URLSearchParams({ key: apiKey, type: 'png', width: String(width), height: String(height), zoom: '2' })
  const body = new URLSearchParams({ source: html })
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20_000)
  let res
  try {
    res = await fetch(`https://www.html2image.net/api/api.php?${qs}`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(), signal: controller.signal,
    })
  } finally { clearTimeout(timer) }
  const text = await res.text()
  let data
  try { data = JSON.parse(text) }
  catch { data = { Status: 'ERROR', ErrorCode: 'UNKNOWN_ERROR', Details: text.slice(0, 300) } }
  return { res, data }
}

// ── GHL Media Library upload ──────────────────────────────────────────────

async function uploadToGHL(apiKey, locationId, buffer) {
  const fileName = `email-section-${Date.now()}.png`
  const boundary = '----FormBoundary' + Math.random().toString(36).slice(2)
  const CRLF = '\r\n'
  const headerPart =
    `--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="file"; filename="${fileName}"${CRLF}` +
    `Content-Type: image/png${CRLF}${CRLF}`
  const footerPart = `${CRLF}--${boundary}--${CRLF}`
  const body = Buffer.concat([Buffer.from(headerPart), buffer, Buffer.from(footerPart)])

  const res = await fetch(`${GHL_BASE}/medias/upload-file?locationId=${locationId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, Version: GHL_VERSION, 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  })
  if (!res.ok) { const t = await res.text(); throw new Error(`GHL upload failed: ${res.status} ${t.slice(0, 200)}`) }
  const data = await res.json()
  console.log('[uploadToGHL] Full GHL response:', JSON.stringify(data))
  const url = data.url || data.fileUrl || data?.data?.url || data?.file?.url || ''
  console.log('[uploadToGHL] Returning URL:', url)
  if (!url) throw new Error(`GHL upload returned no URL: ${JSON.stringify(data)}`)
  return url
}

// ── Puppeteer ─────────────────────────────────────────────────────────────

async function callPuppeteer(html, width, height, locationId) {
  const ghlKey    = process.env.GHL_API_KEY
  if (!ghlKey)    throw new Error('GHL_API_KEY not configured for Puppeteer fallback')
  if (!locationId) throw new Error('locationId required for Puppeteer fallback (GHL upload)')

  let puppeteer
  try { puppeteer = (await import('puppeteer')).default }
  catch { throw new Error('Puppeteer not installed — run: npm install puppeteer') }

  console.log('[html-to-image] Launching Puppeteer...')
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width, height, deviceScaleFactor: 2 })
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 20_000 })
    await sleep(400)   // let fonts/transforms settle
    const buffer = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width, height } })
    console.log('[html-to-image] Puppeteer screenshot done, uploading to GHL...')
    const url = await uploadToGHL(ghlKey, locationId, buffer)
    console.log('[html-to-image] GHL upload OK:', url)
    return url
  } finally {
    await browser.close()
  }
}

// ── Handler ───────────────────────────────────────────────────────────────

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  try {
    const { html, width = 600, height = 580, locationId } = JSON.parse(event.body || '{}')
    if (!html) throw new Error('html is required')

    // ── 1. Try html2image.net ────────────────────────────────────────────
    const h2iKey = process.env.HTML2IMAGE_API_KEY
    if (h2iKey) {
      const MAX_RETRIES = 4
      let lastError = null

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        if (attempt > 1) { await sleep(attempt * 800); console.log(`[html-to-image] Retry ${attempt}/${MAX_RETRIES}`) }
        let res, data
        try {
          ;({ res, data } = await callHtml2Image(h2iKey, html, width, height))
        } catch (fetchErr) {
          // Timeout / network error — skip straight to Puppeteer
          console.warn('[html-to-image] html2image.net fetch error:', fetchErr.message)
          break
        }
        if (res.ok && data.Status === 'OK') {
          console.log('[html-to-image] html2image.net OK (attempt', attempt, '):', data.Link)
          return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: data.Link }) }
        }
        lastError = `html2image.net (attempt ${attempt}): ${JSON.stringify(data)}`
        console.warn('[html-to-image]', lastError)
        const details = data?.Details || ''
        const retryable = details.includes('mkdir') || details.includes('File exists') || details.includes('errno=28')
        if (!retryable) break
      }
      console.warn('[html-to-image] html2image.net failed, trying Puppeteer fallback')
    }

    // ── 2. Puppeteer + GHL upload ────────────────────────────────────────
    const url = await callPuppeteer(html, width, height, locationId)
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) }

  } catch (err) {
    console.error('[html-to-image] Error:', err.message)
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message }) }
  }
}
