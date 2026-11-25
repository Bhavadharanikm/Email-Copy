/**
 * outlookCheck — flags HTML that Windows Outlook is known to mangle.
 *
 * Outlook on Windows renders with Word. Word ignores display:none on images,
 * ignores CSS sizing on images and ignores @media. Each of these has already
 * reached a client once (CRITIQUE.md entry 18), so the final HTML is scanned
 * at the approve step and every hazard is listed before the push. Nothing is
 * blocked: the list is a warning, and the team decides.
 *
 * Returns [] when the HTML is clean, otherwise short sentences for the UI.
 */

const IMG       = /<img\b[^>]*>/gi
const MSO_OPEN  = '<!--[if !mso]><!-- -->'

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*["']?([^"'\\s>]+)`, 'i'))
  return m ? m[1] : ''
}

export function outlookIssues(html) {
  if (!html) return []
  const s = String(html)
  const issues = []
  let hidden = 0, unsized = 0, tracking = 0, floating = 0
  let m
  IMG.lastIndex = 0
  while ((m = IMG.exec(s))) {
    const tag = m[0]
    const w = attr(tag, 'width'), h = attr(tag, 'height')
    const tiny = (w && Number(w) <= 1) || (h && Number(h) <= 1)
    if (tiny) { tracking++; continue }
    if (/display:\s*none/i.test(tag)) {
      const wrapped = s.slice(Math.max(0, m.index - MSO_OPEN.length), m.index) === MSO_OPEN
      if (!wrapped) hidden++
      continue
    }
    if (/position:\s*absolute/i.test(tag)) { floating++; continue }
    if (!w) unsized++
  }
  if (hidden)  issues.push(`${hidden} hidden image${hidden > 1 ? 's' : ''} would show in Windows Outlook (a second hero, usually). Re-open the Preview so the template re-renders with the Outlook guard.`)
  if (unsized) issues.push(`${unsized} image${unsized > 1 ? 's have' : ' has'} no width attribute, so Windows Outlook shows ${unsized > 1 ? 'them' : 'it'} at full file size (the giant-logo bug). Re-open the Preview to re-render.`)
  if (floating) issues.push(`${floating} image${floating > 1 ? 's are' : ' is'} still live HTML (positioned with CSS), which Windows Outlook cannot lay out. Go back to Preview and run Generate Images so ${floating > 1 ? 'they are' : 'it is'} baked.`)
  void tracking
  return issues
}
