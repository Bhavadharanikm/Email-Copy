/**
 * VPS screenshot server — drop-in replacement for whatever runs on
 * 2.24.211.60:3001 today.
 *
 * Two differences from the current box:
 *   1. Honours `transparent` -> page.screenshot({ omitBackground }). Without this,
 *      every transparent render in the app skips the VPS and falls back to local
 *      Puppeteer, which is ~5s per image. That is most renders: 20 of 24 render
 *      calls across all templates ask for transparency.
 *   2. Keeps one Chromium warm instead of launching per request. Launch is the
 *      bulk of the current cost.
 *
 * Contract (must not change — netlify/functions/html-to-image.js depends on it):
 *   POST /screenshot
 *   body: { html, width, height, locationId, ghlApiKey, transparent }
 *   200 : { url }
 *   4xx/5xx : { error }
 *
 * Run:
 *   npm i express puppeteer
 *   node server.js            # PORT env var, defaults to 3001
 */

import express from 'express'
import puppeteer from 'puppeteer'

const PORT         = process.env.PORT || 3001
const GHL_BASE     = 'https://services.leadconnectorhq.com'
const GHL_VERSION  = '2021-07-28'
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// ── one warm browser, relaunched if it dies ────────────────────────────────
let browserPromise = null
function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    }).then(b => {
      b.on('disconnected', () => { browserPromise = null })   // relaunch next call
      console.log('[vps] Chromium launched')
      return b
    }).catch(err => { browserPromise = null; throw err })
  }
  return browserPromise
}

// ── GHL Media Library upload (same as the Netlify function) ────────────────
async function uploadToGHL(apiKey, locationId, buffer) {
  const fileName = `email-section-${Date.now()}.png`
  const boundary = '----FormBoundary' + Math.random().toString(36).slice(2)
  const CRLF = '\r\n'
  const head =
    `--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="file"; filename="${fileName}"${CRLF}` +
    `Content-Type: image/png${CRLF}${CRLF}`
  const tail = `${CRLF}--${boundary}--${CRLF}`
  const body = Buffer.concat([Buffer.from(head), buffer, Buffer.from(tail)])

  const res = await fetch(`${GHL_BASE}/medias/upload-file?locationId=${locationId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Version: GHL_VERSION,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`GHL upload failed: ${res.status} ${t.slice(0, 200)}`)
  }
  const data = await res.json()
  const url = data.url || data.fileUrl || data?.data?.url || data?.file?.url || ''
  if (!url) throw new Error(`GHL upload returned no URL: ${JSON.stringify(data)}`)
  return url
}

// ── render ─────────────────────────────────────────────────────────────────
const app = express()
app.use(express.json({ limit: '25mb' }))          // baked HTML can be large

app.get('/health', (_req, res) => res.json({ ok: true, warm: !!browserPromise }))

app.post('/screenshot', async (req, res) => {
  const started = Date.now()
  const { html, width = 600, height = 580, locationId, ghlApiKey, transparent } = req.body || {}

  if (!html)        return res.status(400).json({ error: 'html is required' })
  if (!locationId)  return res.status(400).json({ error: 'locationId is required' })
  if (!ghlApiKey)   return res.status(400).json({ error: 'ghlApiKey is required' })

  let page
  try {
    const browser = await getBrowser()
    page = await browser.newPage()
    await page.setViewport({ width, height, deviceScaleFactor: 2 })
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 20_000 })
    await sleep(400)                               // let fonts / transforms settle

    const buffer = await page.screenshot({
      type: 'png',
      omitBackground: !!transparent,               // <- the missing piece
      clip: { x: 0, y: 0, width, height },
    })

    const url = await uploadToGHL(ghlApiKey, locationId, buffer)
    console.log(`[vps] ok ${width}x${height} transparent=${!!transparent} ${Date.now() - started}ms ${url}`)
    res.json({ url })
  } catch (err) {
    console.error('[vps] error:', err.message)
    res.status(500).json({ error: err.message })
  } finally {
    if (page) await page.close().catch(() => {})   // close the tab, keep the browser
  }
})

app.listen(PORT, () => console.log(`[vps] screenshot server on :${PORT}`))

// keep one browser warm from boot so the first request is not the slow one
getBrowser().catch(err => console.error('[vps] warmup failed:', err.message))
