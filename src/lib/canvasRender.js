/**
 * canvasRender.js
 * Direct Canvas drawing for email template sections.
 * Used as the final fallback when server-side rendering APIs fail.
 *
 * Each exported function draws a specific section to a canvas and
 * returns a base64 PNG string (no data: prefix).
 */

// ── Helpers ────────────────────────────────────────────────────────────────

/** Load an image through the local proxy to avoid CORS canvas tainting. */
async function loadImg(url) {
  if (!url) return null
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload  = () => resolve(img)
    img.onerror = () => resolve(null)   // fail gracefully
    img.src = `/.netlify/functions/proxy-image?url=${encodeURIComponent(url)}`
  })
}

/** Build a rounded-rectangle path (clockwise). */
function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

/**
 * Draw image with object-fit:cover semantics.
 * focalX/focalY are 0–1 (default 0.5 = center).
 */
function drawCover(ctx, img, x, y, w, h, focalX = 0.5, focalY = 0.5) {
  if (!img) return
  const ia = img.naturalWidth / img.naturalHeight
  const da = w / h
  let sx, sy, sw, sh
  if (ia > da) {
    sh = img.naturalHeight; sw = sh * da
    sx = (img.naturalWidth  - sw) * focalX; sy = 0
  } else {
    sw = img.naturalWidth;  sh = sw / da
    sx = 0; sy = (img.naturalHeight - sh) * focalY
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

/** Word-wrap text to fit maxWidth, return array of lines. */
function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/)
  const lines = []; let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word }
    else line = test
  }
  if (line) lines.push(line)
  return lines
}

// ── Week 4 hero ────────────────────────────────────────────────────────────
// Inset 560×720 card with dark gradient + logo + headline. Total 600×740.

export async function renderWeek4Hero({ heroImgUrl, logoUrl, headline, focalX = 0.5, focalY = 0.3, scale = 2 }) {
  const W = 600, H = 740
  const canvas = document.createElement('canvas')
  canvas.width = W * scale; canvas.height = H * scale
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)

  const [heroImg, logoImg] = await Promise.all([loadImg(heroImgUrl), loadImg(logoUrl)])

  // White page background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  const cx = 20, cy = 20, cw = 560, ch = 720, cr = 16

  // Clipped inset card
  ctx.save()
  roundedRect(ctx, cx, cy, cw, ch, cr)
  ctx.clip()
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(cx, cy, cw, ch)
  if (heroImg) drawCover(ctx, heroImg, cx, cy, cw, ch, focalX, focalY)

  // Dark gradient overlay (top-heavy)
  const grad = ctx.createLinearGradient(cx, cy, cx, cy + ch)
  grad.addColorStop(0,    'rgba(0,0,0,0.78)')
  grad.addColorStop(0.45, 'rgba(0,0,0,0.38)')
  grad.addColorStop(0.75, 'rgba(0,0,0,0.05)')
  grad.addColorStop(1,    'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.fillRect(cx, cy, cw, ch)
  ctx.restore()

  // Logo — white (inverted)
  let textY = cy + 40
  if (logoImg) {
    const lh = 44
    const lw = Math.min(180, lh * (logoImg.naturalWidth / logoImg.naturalHeight))
    const lx = cx + (cw - lw) / 2
    ctx.save()
    ctx.filter = 'brightness(0) invert(1)'
    ctx.drawImage(logoImg, lx, textY, lw, lh)
    ctx.restore()
    textY += lh + 20
  } else {
    textY += 64
  }

  // Headline text
  if (headline) {
    ctx.fillStyle = '#ffffff'
    ctx.font = `bold 38px Georgia,"Times New Roman",serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    const lines = wrapText(ctx, headline, cw - 96)
    lines.forEach((ln, i) => ctx.fillText(ln, cx + cw / 2, textY + i * (38 * 1.12)))
  }

  return canvas.toDataURL('image/png').split(',')[1]
}

// ── Week 4 stacked card ────────────────────────────────────────────────────
// Back card rotated 5deg behind front card. Includes the outer td padding.

export async function renderWeek4StackedCard({ imgUrl, focalX = 0.5, focalY = 0.5, cardHeight = 460, topPad = 28, botPad = 8, scale = 2 }) {
  const W      = 600
  const sidePad = 72
  const stackH = cardHeight + 48          // matching height+48 from w4StackedImage
  const H      = topPad + stackH + botPad

  const canvas = document.createElement('canvas')
  canvas.width = W * scale; canvas.height = H * scale
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)

  const img = await loadImg(imgUrl)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  // Card inner bounds (24px inset from the stacked container, which starts after topPad)
  const cardX = sidePad + 24
  const cardY = topPad  + 24
  const cardW = W - sidePad * 2 - 48
  const cardH = stackH - 48
  const cardR = 16
  const ccx   = cardX + cardW / 2
  const ccy   = cardY + cardH / 2

  // Back card — rotated 5deg, 45% opacity
  ctx.save()
  ctx.translate(ccx, ccy)
  ctx.rotate(5 * Math.PI / 180)
  ctx.globalAlpha = 0.45
  roundedRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, cardR)
  ctx.clip()
  ctx.fillStyle = '#d4d8dd'
  ctx.fillRect(-cardW / 2, -cardH / 2, cardW, cardH)
  if (img) drawCover(ctx, img, -cardW / 2, -cardH / 2, cardW, cardH, focalX, focalY)
  ctx.restore()

  // Front card — no rotation
  ctx.save()
  ctx.globalAlpha = 1
  roundedRect(ctx, cardX, cardY, cardW, cardH, cardR)
  ctx.clip()
  ctx.fillStyle = '#cccccc'
  ctx.fillRect(cardX, cardY, cardW, cardH)
  if (img) drawCover(ctx, img, cardX, cardY, cardW, cardH, focalX, focalY)
  ctx.restore()

  return canvas.toDataURL('image/png').split(',')[1]
}

// ── Week 3 hero ────────────────────────────────────────────────────────────
// Full-bleed 600×600 with dark gradient + white fade at bottom + logo + italic headline.

export async function renderWeek3Hero({ heroImgUrl, logoUrl, headline, focalX = 0.5, focalY = 0.3, scale = 2 }) {
  const W = 600, H = 600
  const canvas = document.createElement('canvas')
  canvas.width = W * scale; canvas.height = H * scale
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)

  const [heroImg, logoImg] = await Promise.all([loadImg(heroImgUrl), loadImg(logoUrl)])

  ctx.save()
  roundedRect(ctx, 0, 0, W, H, 20)
  ctx.clip()
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, W, H)
  if (heroImg) drawCover(ctx, heroImg, 0, 0, W, H, focalX, focalY)

  // Dark top gradient
  const dg = ctx.createLinearGradient(0, 0, 0, H)
  dg.addColorStop(0, 'rgba(0,0,0,0.72)')
  dg.addColorStop(0.42, 'rgba(0,0,0,0.28)')
  dg.addColorStop(0.65, 'rgba(0,0,0,0)')
  ctx.fillStyle = dg; ctx.fillRect(0, 0, W, H)
  ctx.restore()

  // White fade at bottom
  const wg = ctx.createLinearGradient(0, H - 160, 0, H)
  wg.addColorStop(0, 'rgba(255,255,255,0)')
  wg.addColorStop(1, 'rgba(255,255,255,1)')
  ctx.fillStyle = wg; ctx.fillRect(0, H - 160, W, 160)

  let textY = 40
  if (logoImg) {
    const lh = 44
    const lw = Math.min(180, lh * (logoImg.naturalWidth / logoImg.naturalHeight))
    ctx.save()
    ctx.filter = 'brightness(0) invert(1)'
    ctx.drawImage(logoImg, (W - lw) / 2, textY, lw, lh)
    ctx.restore()
    textY += lh + 14
  } else { textY += 64 }

  if (headline) {
    ctx.fillStyle = '#ffffff'
    ctx.font = `italic 400 34px Georgia,"Times New Roman",serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    const lines = wrapText(ctx, headline, W - 104)
    lines.forEach((ln, i) => ctx.fillText(ln, W / 2, textY + i * (34 * 1.15)))
  }

  return canvas.toDataURL('image/png').split(',')[1]
}

// ── Week 3 stacked side-by-side ────────────────────────────────────────────
// Two rotated cards side-by-side (-3deg / +3deg). 600×420.

export async function renderWeek3Stacked({ img1Url, img2Url, scale = 2 }) {
  const W = 600, H = 420
  const canvas = document.createElement('canvas')
  canvas.width = W * scale; canvas.height = H * scale
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)

  const [img1, img2raw] = await Promise.all([loadImg(img1Url), loadImg(img2Url)])
  const img2 = img2raw || img1

  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H)

  const cw = 272, ch = 372, cr = 20, ty = 24

  const drawCard = (img, lx, angle) => {
    ctx.save()
    ctx.translate(lx + cw / 2, ty + ch / 2)
    ctx.rotate(angle * Math.PI / 180)
    ctx.shadowColor = 'rgba(0,0,0,0.18)'; ctx.shadowBlur = 20
    ctx.shadowOffsetX = angle < 0 ? 4 : -4
    roundedRect(ctx, -cw / 2, -ch / 2, cw, ch, cr)
    ctx.clip()
    ctx.shadowColor = 'transparent'
    ctx.fillStyle = '#cccccc'; ctx.fillRect(-cw / 2, -ch / 2, cw, ch)
    if (img) drawCover(ctx, img, -cw / 2, -ch / 2, cw, ch)
    ctx.restore()
  }

  drawCard(img1, 28,  -3)
  drawCard(img2, 296,  3)

  return canvas.toDataURL('image/png').split(',')[1]
}

// ── Week 2 arch hero ────────────────────────────────────────────────────────
// Photo in arch (top-rounded pill) + bottom gradient + italic text. 600×460.

export async function renderWeek2Hero({ heroImgUrl, headline, midBg = '#ffffff', scale = 2 }) {
  const W = 600, H = 460
  const canvas = document.createElement('canvas')
  canvas.width = W * scale; canvas.height = H * scale
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)

  const heroImg = await loadImg(heroImgUrl)

  ctx.fillStyle = midBg; ctx.fillRect(0, 0, W, H)

  const ax = 36, ay = 0, aw = 528, ah = 460
  const r = aw / 2   // 264 — fully rounds the top into an arch

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(ax, ay + ah)
  ctx.lineTo(ax, ay + r)
  ctx.arcTo(ax, ay, ax + r, ay, r)
  ctx.arcTo(ax + aw, ay, ax + aw, ay + r, r)
  ctx.lineTo(ax + aw, ay + ah)
  ctx.closePath()
  ctx.clip()

  ctx.fillStyle = '#c8c0b5'; ctx.fillRect(ax, ay, aw, ah)
  if (heroImg) drawCover(ctx, heroImg, ax, ay, aw, ah)

  const bg = ctx.createLinearGradient(ax, ay, ax, ay + ah)
  bg.addColorStop(0, 'rgba(0,0,0,0)'); bg.addColorStop(0.5, 'rgba(0,0,0,0)'); bg.addColorStop(1, 'rgba(0,0,0,0.45)')
  ctx.fillStyle = bg; ctx.fillRect(ax, ay, aw, ah)
  ctx.restore()

  if (headline) {
    ctx.fillStyle = '#ffffff'
    ctx.font = `italic 400 24px Georgia,"Times New Roman",serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
    ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 10
    const lines = wrapText(ctx, headline, 300)
    const lh = 24 * 1.25
    const baseY = ay + ah - 32
    lines.forEach((ln, i) => ctx.fillText(ln, W / 2, baseY - (lines.length - 1 - i) * lh))
    ctx.shadowColor = 'transparent'
  }

  return canvas.toDataURL('image/png').split(',')[1]
}
