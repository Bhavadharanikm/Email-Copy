/**
 * outlookSafe — keeps mobile-only images out of Windows Outlook.
 *
 * Some welcome-flow templates carry two heroes: a desktop one and a mobile
 * one hidden with display:none and shown by a media query on small screens.
 * Outlook on Windows renders with Word, which ignores that hiding, so it drew
 * both side by side. Each hidden image is wrapped in a conditional comment
 * that Word skips entirely, and given mso-hide:all as a second guard. Every
 * other client sees exactly what it saw before.
 */
const HIDDEN_IMG = /<img\b[^>]*display:\s*none[^>]*>/gi
const OPEN  = '<!--[if !mso]><!-- -->'
const CLOSE = '<!--<![endif]-->'

export function hideFromOutlook(html) {
  if (!html || !HIDDEN_IMG.test(html)) return html
  HIDDEN_IMG.lastIndex = 0
  return String(html).replace(HIDDEN_IMG, (tag, at, whole) => {
    if (whole.slice(Math.max(0, at - OPEN.length), at) === OPEN) return tag   // already wrapped
    const guarded = /mso-hide/i.test(tag) ? tag : tag.replace(/display:\s*none;?/i, 'display:none;mso-hide:all;')
    return `${OPEN}${guarded}${CLOSE}`
  })
}
