/**
 * brandFonts — a client's own fonts, applied to a finished email or bake document.
 *
 * The fonts come from the brand board sheet ("Email Branding & Components",
 * columns L to P): Eyebrow Font, Title Font, Body Font, Button Font and
 * Font File Link. They ride in the same footerData / clientFooter object the
 * brand colours already travel in, so every template gets them for free.
 *
 * Rather than editing the fonts in each template by hand, applyBrandFonts()
 * runs once over the built HTML. It reads every inline style that sets a
 * font-family, decides which role the text plays, and swaps the family:
 *
 *   button   any <a> tag, or a bold label that never wraps (the baked buttons)
 *   eyebrow  uppercase text up to 18px (the client name, section labels)
 *   title    display faces the templates use for headlines (Lora, Playfair,
 *            Lato, Dancing Script, Times), or bold text 18px and up
 *   body     everything else, including footers and italic subheads
 *
 * A blank cell leaves that role exactly as the template has it. A cell like
 * "Cormorant Garamond (Bold)" also forces that weight; a bare name keeps the
 * template's weight.
 *
 * The <head> gets what the fonts need to load: a Google Fonts link per family
 * (the v1 CSS API, which ignores weights a family lacks and simply returns
 * nothing for a family it doesn't have), or an @font-face from a file in the
 * Font File Link column. Baked images render through Puppeteer, so any font
 * that loads shows in the image; in the inbox only Apple Mail and iOS honour
 * web fonts, and everyone else sees the fallback in the stack (Georgia for
 * serifs, Arial for sans).
 */

const SANS_HINTS = [
  'sans', 'optima', 'lato', 'helvetica', 'arial', 'futura', 'montserrat', 'inter', 'roboto', 'poppins', 'raleway',
  'nunito', 'avenir', 'gill', 'proxima', 'gotham', 'verdana', 'tahoma', 'segoe', 'josefin', 'oswald', 'karla',
  'manrope', 'outfit', 'figtree', 'sora', 'rubik', 'mulish', 'quicksand', 'cabin', 'barlow', 'ubuntu', 'archivo',
  'jost', 'jakarta', 'red hat', 'trebuchet', 'century gothic', 'brandon', 'neue', 'grotesk', 'grotesque', 'gothic',
]
const MONO_HINTS   = ['mono', 'courier', 'consolas', 'menlo']
const SCRIPT_HINTS = ['script', 'dancing', 'pacifico', 'great vibes', 'allura', 'satisfy', 'parisienne', 'sacramento', 'cursive', 'handwriting', 'brush']

const WEIGHT_WORDS = [
  [/\b(extra\s*bold|heavy|black)\b/i, 800], [/\bbold\b/i, 700], [/\b(semi\s*bold|demi)\b/i, 600],
  [/\bmedium\b/i, 500], [/\b(regular|normal|book)\b/i, 400], [/\blight\b/i, 300],
]

/* "Cormorant Garamond (Bold)" → { family: 'Cormorant Garamond', weight: 700 } */
export function parseFontCell(cell) {
  const raw = String(cell || '').trim()
  if (!raw) return null
  let weight = null
  for (const [re, w] of WEIGHT_WORDS) { if (re.test(raw)) { weight = w; break } }
  const family = raw
    .replace(/\([^)]*\)/g, ' ')                       // "(Bold)", "(woff)"
    .replace(/\b(sans-serif|serif|monospace|cursive|woff2?|ttf|otf)\b/gi, ' ')
    .replace(/,.*$/, '')                              // a pasted stack: keep the first name
    .replace(/['"]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!family) return null
  return { family, weight }
}

function genericFor(family) {
  const f = family.toLowerCase()
  if (MONO_HINTS.some(h => f.includes(h)))   return "'Courier New',monospace"
  if (SCRIPT_HINTS.some(h => f.includes(h))) return 'cursive'
  if (SANS_HINTS.some(h => f.includes(h)))   return 'Arial,sans-serif'
  return "Georgia,'Times New Roman',serif"
}

/* The arrow after a button label (→) is outside the character ranges Google
   Fonts serves, so it falls through to the next font in the stack. On the
   Linux bake server "Georgia" maps to a substitute without an arrow and a
   missing-glyph box is drawn instead, so the arrow always gets a sans face
   that has it, on every system. */
const ARROW_FALLBACK = (s) => s.replace(/(?<!sans-serif;">)(&rarr;|→)/g, '<span style="font-family:Arial,Helvetica,sans-serif;">$1</span>')

const stackFor = (family) => `'${family}',${genericFor(family)}`

/* The four roles, each { family, weight, stack } or null when the cell is blank. */
export function brandFontsFrom(fd) {
  if (!fd) return null
  const roles = {
    eyebrow: parseFontCell(fd.eyebrowFont),
    title:   parseFontCell(fd.titleFont),
    body:    parseFontCell(fd.bodyFont),
    button:  parseFontCell(fd.buttonFont),
  }
  let any = false
  for (const k of Object.keys(roles)) {
    if (roles[k]) { roles[k].stack = stackFor(roles[k].family); any = true }
  }
  return any ? roles : null
}

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

/* The client-fonts bucket names files "<base64 client>/<base64 font>--<weight>.ext",
   so a file is matched to its family by the decoded name as well as the raw one. */
function decodeB64(s) {
  try {
    const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4)
    return typeof atob === 'function' ? atob(padded) : Buffer.from(padded, 'base64').toString('utf8')
  } catch { return '' }
}
function fileNames(path) {
  const file = decodeURIComponent(path.split('/').pop() || '')
  const stem = file.replace(/\.[a-z0-9]+$/i, '').split('--')[0]
  return [slug(file), slug(decodeB64(stem))].filter(Boolean)
}

/* Column P: one or more links, separated by spaces, commas or new lines. */
function fileLinks(fd) {
  return String(fd?.fontFileLink || '').split(/[\s,]+/).map(s => s.trim()).filter(s => /^https?:\/\//i.test(s))
}

const FORMATS = { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' }

/* The <link> and @font-face tags that load the brand fonts. */
export function brandFontHead(fonts, fd) {
  if (!fonts) return ''
  const families = [...new Set(Object.values(fonts).filter(Boolean).map(f => f.family))]
  const covered  = new Set()
  const out      = []

  for (const url of fileLinks(fd)) {
    const path = url.split(/[?#]/)[0]
    const ext  = (path.match(/\.(woff2|woff|ttf|otf|css)$/i) || [])[1]?.toLowerCase()
    if (!ext) continue
    if (ext === 'css') { out.push(`<link rel="stylesheet" href="${url}"/>`); continue }
    const names  = fileNames(path)
    const file   = names[0]
    const family = families.find(f => names.some(n => n.includes(slug(f)))) || families.find(f => !covered.has(f))
    if (!family) continue
    const weight = /bold|700/.test(file) ? 700 : /light|300/.test(file) ? 300 : 400
    const style  = /italic|oblique/.test(file) ? 'italic' : 'normal'
    out.push(`<style>@font-face{font-family:'${family}';src:url('${url}') format('${FORMATS[ext]}');font-weight:${weight};font-style:${style};font-display:swap;}</style>`)
    covered.add(family)
  }

  for (const family of families) {
    if (covered.has(family)) continue
    const q = encodeURIComponent(family).replace(/%20/g, '+')
    out.push(`<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=${q}:400,700,400italic,700italic&display=swap"/>`)
  }
  return out.length ? `<!--brand-fonts-->${out.join('')}` : ''
}

const TITLE_FACES = /lora|playfair|lato|dancing|times new roman/i

function roleOf(tag, style) {
  if (tag === 'a') return 'button'
  const fam    = (style.match(/font-family:\s*([^;"]*)/i) || [])[1] || ''
  const size   = parseFloat((style.match(/font-size:\s*([\d.]+)px/i) || [])[1]) || 0
  const wRaw   = (style.match(/font-weight:\s*(\d+|bold)/i) || [])[1]
  const weight = wRaw === 'bold' ? 700 : parseInt(wRaw, 10) || 400
  if (/text-transform:\s*uppercase/i.test(style) && size > 0 && size <= 18) return 'eyebrow'
  /* Baked buttons put their label in a bold span that never wraps, not in a link */
  if (weight >= 600 && /white-space:\s*nowrap/i.test(style) && !/text-transform:\s*uppercase/i.test(style)) return 'button'
  if (TITLE_FACES.test(fam)) return 'title'
  if (weight >= 600 && size >= 18) return 'title'
  return 'body'
}

function restyle(style, font) {
  let s = style.replace(/font-family:\s*[^;"]*;?/i, `font-family:${font.stack};`)
  if (font.weight) {
    s = /font-weight:/i.test(s)
      ? s.replace(/font-weight:\s*[^;"]*;?/i, `font-weight:${font.weight};`)
      : s + (s.endsWith(';') || s === '' ? '' : ';') + `font-weight:${font.weight};`
  }
  return s
}

/* Swap the fonts in every inline style and add what they need to the <head>.
   Returns the HTML untouched when the client has no fonts set. */
export function applyBrandFonts(html, fd) {
  const fonts = brandFontsFrom(fd)
  if (!fonts || !html) return html

  let out = html.replace(/<([a-zA-Z][\w-]*)\b([^<>]*?)\sstyle="([^"]*)"/g, (m, tag, pre, style) => {
    if (!/font-family\s*:/i.test(style)) return m
    const font = fonts[roleOf(tag.toLowerCase(), style)]
    return font ? `<${tag}${pre} style="${restyle(style, font)}"` : m
  })
  out = ARROW_FALLBACK(out)

  if (!out.includes('<!--brand-fonts-->')) {
    const head = brandFontHead(fonts, fd)
    if (head) {
      const at = out.search(/<head[^>]*>/i)
      if (at >= 0) {
        const end = out.indexOf('>', at) + 1
        out = out.slice(0, end) + head + out.slice(end)
      } else {
        out = head + out
      }
    }
  }
  return out
}
