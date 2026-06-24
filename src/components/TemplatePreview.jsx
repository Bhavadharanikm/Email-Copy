/**
 * TemplatePreview — 6 luxury email template designs
 *
 * Content order: headline → subhead → body → closing line → CTA → body block 2
 *
 * Order: Casa · Tropica · Refined · Newsletter · MasterClass · Blueprint
 */
import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { useCampaignStore }  from '../store/campaignStore'
import { useTheme } from '../context/ThemeContext'
import { recommendTemplate, analyzeImageFocal, htmlToImage, fetchFooterData } from '../lib/api'

/* ─────────────────────── shared email-client header ─────────────────────── */
function emailClientHeader({ client, copy }) {
  return `
  <div style="max-width:600px;margin:24px auto 16px;background:#fff;border-radius:8px;border:1px solid #e8e8e8;padding:16px 28px;font-family:Arial,Helvetica,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.06);">
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <tr>
        <td style="color:#aaa;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:5px 0;width:80px;vertical-align:top;">From:</td>
        <td style="padding:5px 0;vertical-align:top;">
          <span style="font-weight:700;color:#1a1a1a;">${client?.name||'Brand'}</span>
          <span style="color:#aaa;font-size:12px;margin-left:8px;">&lt;hello@${(client?.name||'brand').toLowerCase().replace(/\s+/g,'')}.com&gt;</span>
        </td>
      </tr>
      <tr>
        <td style="color:#aaa;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:5px 0;vertical-align:top;">Subject:</td>
        <td style="padding:5px 0;font-weight:600;color:#1a1a1a;vertical-align:top;">${copy.subjectLine||'—'}</td>
      </tr>
      <tr>
        <td style="color:#aaa;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:5px 0;vertical-align:top;">Preview:</td>
        <td style="padding:5px 0;color:#888;vertical-align:top;">${copy.previewText||'—'}</td>
      </tr>
    </table>
  </div>`
}

/* ─── focal-point helper ─────────────────────────────────────────────────── */
// Returns "object-position: X% Y%" string from an image object's focal data
function focalPos(imgObj) {
  const x = imgObj?.focalX ?? 50
  const y = imgObj?.focalY ?? 50
  return `${x}% ${y}%`
}

/* ─── text-on-background contrast helper ────────────────────────────────── */
// Returns '#1a1a1a' (dark) for light backgrounds, '#ffffff' for dark ones.
// Used throughout the 70/20/10 color system.
function textOn(hex) {
  const h = (hex || '').replace('#', '')
  if (h.length < 6) return '#1a1a1a'
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) > 160 ? '#1a1a1a' : '#ffffff'
}
// Muted variant — 60% opacity over transparent
function mutedOn(hex) {
  return textOn(hex) === '#1a1a1a' ? 'rgba(26,26,26,0.62)' : 'rgba(255,255,255,0.62)'
}
// Hairline divider colour
function divOn(hex) {
  return textOn(hex) === '#1a1a1a' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)'
}

/* ─── footer builder ────────────────────────────────────────────────────── */
// Generates a branded footer block for every template.
// footerData comes from the brand board Google Sheet (fetch-footer-data endpoint).
// Falls back gracefully when footerData is null or fields are empty.
function buildFooter(client, footerData = null, options = {}) {
  const fd          = footerData || {}
  const bgRaw       = options.bgOverride || fd.bgColor || options.defaultBg  || '#1c1c1c'
  const btnColor    = fd.buttonColor  || options.defaultBtn || '#b07a50'
  const contactInfo   = fd.contactInfo   || ''
  const contactNumber = fd.contactNumber || ''
  const footerText    = fd.footerText    || ''
  const instagram     = fd.instagramUrl  || ''
  const facebook    = fd.facebookUrl  || ''
  const tiktok      = fd.tiktokUrl    || ''
  const website     = fd.websiteUrl   || ''
  const logoUrl     = client?.logoUrl || ''
  const name        = client?.name    || ''
  const logoColorOpt = fd.logoColor   || 'original'

  // Decide text colour based on bg brightness (simple luminance check)
  // If bg is a light hex colour use dark text, otherwise white
  function isLight(hex) {
    const h = hex.replace('#','')
    if (h.length < 6) return false
    const r = parseInt(h.slice(0,2),16)
    const g = parseInt(h.slice(2,4),16)
    const b = parseInt(h.slice(4,6),16)
    return (0.299*r + 0.587*g + 0.114*b) > 160
  }
  const light    = isLight(bgRaw)
  const textCol  = light ? 'rgba(0,0,0,0.55)'  : 'rgba(255,255,255,0.55)'
  const linkCol  = light ? 'rgba(0,0,0,0.4)'   : 'rgba(255,255,255,0.35)'
  const divCol   = light ? 'rgba(0,0,0,0.08)'  : 'rgba(255,255,255,0.1)'

  // Social icon URLs (GHL CDN circular icons)
  const CDN = 'https://storage.googleapis.com/preview-production-assets/email/img/hl_default_img/social'
  const socialIcons = [
    { url: instagram, icon: `${CDN}/instagram_circle_grey.png`, label: 'Instagram' },
    { url: facebook,  icon: `${CDN}/facebook_circle_grey.png`,  label: 'Facebook'  },
    { url: tiktok,    icon: `${CDN}/tiktok_circle_grey.png`,    label: 'TikTok'    },
    { url: website,   icon: `${CDN}/website_circle_grey.png`,   label: 'Website'   },
  ].filter(s => s.url)

  const socialHtml = socialIcons.length ? `
    <div style="margin:0 0 20px;text-align:center;font-size:0">
      ${socialIcons.map(s =>
        `<a href="${s.url}" target="_blank" rel="noopener" style="display:inline-block;line-height:0;margin:0 7px">
           <img src="${s.icon}" alt="${s.label}" width="36" height="36" style="display:block;width:36px;height:36px;border-radius:50%"/>
         </a>`
      ).join('')}
    </div>` : ''

  const footerLogoFilter = logoColorOpt === 'white' ? 'brightness(0) invert(1)'
    : logoColorOpt === 'black' ? 'brightness(0)'
    : 'none'
  const logoHtml = logoUrl
    ? `<div style="margin:0 0 20px;text-align:center"><img src="${logoUrl}" alt="${name}" style="height:${fd.footerLogoSize || 40}px;width:auto;object-fit:contain;display:inline-block;filter:${footerLogoFilter};opacity:.8"/></div>`
    : `<div style="margin:0 0 20px;font-size:16px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${textCol};font-family:Arial,sans-serif">${name}</div>`

  const contactParts = [
    contactInfo   ? `<a href="mailto:${contactInfo}" style="color:${textCol};text-decoration:none">${contactInfo}</a>` : '',
    contactNumber ? `<a href="tel:${contactNumber.replace(/\s/g,'')}" style="color:${textCol};text-decoration:none">${contactNumber}</a>` : '',
  ].filter(Boolean)
  const contactHtml = contactParts.length
    ? `<div style="font-size:15px;color:${textCol};font-family:Arial,sans-serif;margin-bottom:16px">${contactParts.join(`&nbsp;&nbsp;·&nbsp;&nbsp;`)}</div>`
    : ''

  const footerTextHtml = footerText
    ? `<div style="font-size:14px;color:${linkCol};font-family:Arial,sans-serif;margin-bottom:20px;max-width:440px;margin-left:auto;margin-right:auto;line-height:1.7">${footerText}</div>`
    : ''

  return `
  <!-- Footer -->
  <div style="background:${bgRaw};padding:44px 48px 36px;text-align:center;border-top:1px solid ${divCol}">
    ${logoHtml}
    ${socialHtml}
    ${contactHtml}
    ${footerTextHtml}
    <div style="font-size:13px;color:${linkCol};font-family:Arial,sans-serif;letter-spacing:.08em;margin-top:8px">
      <a href="{{email.view_in_browser_url}}" style="color:${linkCol};text-decoration:underline">View in browser</a>
      &nbsp;·&nbsp;
      <a href="{{email.unsubscribe_link}}" style="color:${linkCol};text-decoration:underline">Unsubscribe</a>
    </div>
  </div>`
}

/* ══════════════════════════════════════════════════════════════════════════
   T1 · REFINED  (Hermès / Design Within Reach)
   Cream · serif · outlined CTA · generous white space
   ══════════════════════════════════════════════════════════════════════════ */
function buildTemplate1({ client, copy, images, footerData }) {
  const heroObj  = images?.[0]; const heroImg = heroObj?.url||''
  const img1Obj  = images?.[1]; const img1    = img1Obj?.url||''
  const img2Obj  = images?.[2]; const img2    = img2Obj?.url||''
  const body     = (copy.bodyText||'').replace(/\n/g,'<br>')
  const logoUrl  = client?.logoUrl||''
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#f5f2ed;font-family:'Georgia',serif;color:#1c1c1c}
  .wrap{max-width:600px;margin:0 auto 48px;background:#faf9f7}
  .topbar{padding:20px 40px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e0dbd3}
  .brand{font-size:13px;letter-spacing:.22em;text-transform:uppercase;font-family:Arial,sans-serif;font-weight:700}
  .brand-r{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#b0aa9f;font-family:Arial,sans-serif}
  .hero{line-height:0}.hero img{width:100%;height:400px;object-fit:cover;display:block}
  .hero-ph{width:100%;height:300px;background:#e0dbd3;display:flex;align-items:center;justify-content:center;color:#b0aa9f;font-size:12px;font-family:Arial,sans-serif}
  .content{padding:52px 48px 40px}
  .eyebrow{font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#9c8f7e;font-family:Arial,sans-serif;margin-bottom:20px}
  h1{font-size:36px;line-height:1.15;font-weight:400;margin-bottom:16px;letter-spacing:-.3px}
  .sub{font-size:17px;line-height:1.65;color:#5c5248;margin-bottom:28px;font-style:italic}
  .text{font-size:15px;line-height:1.9;color:#3d3830;margin-bottom:22px}
  .closing{font-size:15px;line-height:1.8;color:#5c5248;margin-bottom:36px;font-style:italic}
  .cta-w{margin-bottom:40px}
  .cta{display:inline-block;border:1.5px solid #1c1c1c;color:#1c1c1c;padding:14px 44px;font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;text-decoration:none;font-family:Arial,sans-serif}
  .b2{border-top:1px solid #e0dbd3;padding-top:28px}
  .b2t{font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#9c8f7e;font-family:Arial,sans-serif;margin-bottom:12px}
  .b2b{font-size:14px;line-height:1.8;color:#5c5248}
  .pair{display:flex;gap:4px;margin-top:40px}
  .pair img{flex:1;width:50%;height:210px;object-fit:cover;display:block}
  .foot{background:#1c1c1c;padding:24px 40px;text-align:center;font-size:10px;color:#6b6458;font-family:Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase}
  .foot a{color:#6b6458}
</style></head><body>
${emailClientHeader({client,copy})}
<div class="wrap">
  <div class="topbar">
    <div class="brand">${logoUrl ? `<img src="${logoUrl}" alt="${client?.name||''}" style="height:36px;width:auto;object-fit:contain;display:block"/>` : (client?.name||'Brand')}</div>
    <div class="brand-r">Exclusive Collection</div>
  </div>
  <div class="hero">${heroImg?`<img src="${heroImg}" alt="" style="object-position:${focalPos(heroObj)}"/>`:`<div class="hero-ph">Hero image</div>`}</div>
  <div class="content">
    ${copy.subjectLine?`<div class="eyebrow">${copy.subjectLine}</div>`:''}
    <h1>${copy.headlineText||''}</h1>
    ${copy.subhead?`<div class="sub">${copy.subhead}</div>`:''}
    ${copy.bodyText?`<div class="text">${body}</div>`:''}
    ${copy.closingLine?`<div class="closing">${copy.closingLine}</div>`:''}
    ${copy.ctaText?`<div class="cta-w"><a class="cta" href="${copy.ctaUrl||'#'}">${copy.ctaText}</a></div>`:''}
    ${copy.bodyBlock2Title||copy.bodyBlock2?`<div class="b2">${copy.bodyBlock2Title?`<div class="b2t">${copy.bodyBlock2Title}</div>`:''} ${copy.bodyBlock2?`<div class="b2b">${copy.bodyBlock2}</div>`:''}</div>`:''}
  </div>
  ${img1||img2?`<div class="pair">${img1?`<img src="${img1}" alt="" style="object-position:${focalPos(img1Obj)}"/>`:''}${img2?`<img src="${img2}" alt="" style="object-position:${focalPos(img2Obj)}"/>`:''}  </div>`:''}
  ${buildFooter(client, footerData, { defaultBg: '#1c1c1c' })}
</div></body></html>`
}

/* ══════════════════════════════════════════════════════════════════════════
   T3 · NEWSLETTER  (user approved)
   Newspaper masthead · ruled lines · gold badge · editorial serif
   ══════════════════════════════════════════════════════════════════════════ */
function buildTemplate3({ client, copy, images, footerData }) {
  const heroObj  = images?.[0]; const heroImg = heroObj?.url||''
  const img1Obj  = images?.[1]; const img1    = img1Obj?.url||''
  const img2Obj  = images?.[2]; const img2    = img2Obj?.url||''
  const body     = (copy.bodyText||'').replace(/\n/g,'<br>')
  const logoUrl  = client?.logoUrl||''
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#f2ede6;font-family:'Georgia',serif;color:#1a1a1a}
  .wrap{max-width:600px;margin:0 auto 48px;background:#fff;border:1px solid #e0d8cc}
  .mast{border-bottom:3px solid #111;padding:22px 36px;text-align:center}
  .mt{display:flex;align-items:center;gap:10px;margin-bottom:12px}
  .ml{flex:1;height:1px;background:#ddd}
  .mb{font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#b5820e;border:1.5px solid #b5820e;padding:4px 12px;white-space:nowrap;font-family:Arial,sans-serif}
  .mn{font-size:40px;font-weight:700;letter-spacing:-1.5px;color:#111;line-height:1;margin-bottom:8px}
  .mm{display:flex;align-items:center;justify-content:center;gap:14px;font-size:10px;color:#aaa;font-family:Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase}
  .dot{width:3px;height:3px;background:#ccc;border-radius:50%;display:inline-block}
  .hero img{width:100%;height:360px;object-fit:cover;display:block}
  .hero-ph{width:100%;height:240px;background:#f0e8dc;display:flex;align-items:center;justify-content:center;color:#c0b0a0;font-size:12px;font-family:Arial,sans-serif}
  .cap{padding:10px 36px 16px;font-size:11px;color:#aaa;font-style:italic;font-family:Arial,sans-serif;border-bottom:1px solid #f0e8dc}
  .body{padding:32px 36px}
  .stag{font-size:10px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#b5820e;margin-bottom:14px;font-family:Arial,sans-serif}
  h1{font-size:30px;line-height:1.18;font-weight:700;color:#111;margin-bottom:12px}
  .deck{font-size:17px;line-height:1.6;color:#555;font-style:italic;margin-bottom:20px}
  .rule{height:1px;background:#e8e0d4;margin:20px 0}
  .text{font-size:15px;line-height:1.9;color:#333;margin-bottom:18px}
  .closing{font-size:15px;line-height:1.8;color:#5a5048;font-style:italic;margin-bottom:32px;padding:16px 22px;background:#faf6f0;border:1px solid #e8e0d4}
  .cta-w{margin-bottom:32px}
  .cta{display:inline-block;background:#111;color:#fff;padding:14px 36px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;text-decoration:none;font-family:Arial,sans-serif}
  .b2{background:#faf6f0;padding:22px 26px;border-top:2px solid #111;margin-top:8px}
  .b2t{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#111;margin-bottom:10px;font-family:Arial,sans-serif}
  .b2b{font-size:14px;line-height:1.8;color:#555}
  .cinema{display:flex;gap:3px;margin-top:32px}
  .cinema img{flex:1;object-fit:cover;height:210px;display:block}
  .foot{background:#111;text-align:center;padding:22px;font-size:10px;color:#555;font-family:Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase}
  .foot a{color:#555}
</style></head><body>
${emailClientHeader({client,copy})}
<div class="wrap">
  <div class="mast">
    <div class="mt"><div class="ml"></div><div class="mb">✦ Member Edition ✦</div><div class="ml"></div></div>
    <div class="mn">${logoUrl ? `<img src="${logoUrl}" alt="${client?.name||''}" style="height:48px;width:auto;object-fit:contain;display:block;margin:0 auto"/>` : (client?.name||'The Digest')}</div>
    <div class="mm"><span>${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</span><span class="dot"></span><span>Exclusive Update</span></div>
  </div>
  <div class="hero">${heroImg?`<img src="${heroImg}" alt="" style="object-position:${focalPos(heroObj)}"/>`:`<div class="hero-ph">Hero image</div>`}</div>
  ${copy.subjectLine?`<div class="cap">${copy.subjectLine}</div>`:''}
  <div class="body">
    <div class="stag">Featured Story</div>
    <h1>${copy.headlineText||''}</h1>
    ${copy.subhead?`<div class="deck">${copy.subhead}</div>`:''}
    <div class="rule"></div>
    ${copy.bodyText?`<div class="text">${body}</div>`:''}
    ${copy.closingLine?`<div class="closing">${copy.closingLine}</div>`:''}
    ${copy.ctaText?`<div class="cta-w"><a class="cta" href="${copy.ctaUrl||'#'}">${copy.ctaText} →</a></div>`:''}
    ${copy.bodyBlock2Title||copy.bodyBlock2?`<div class="b2">${copy.bodyBlock2Title?`<div class="b2t">${copy.bodyBlock2Title}</div>`:''} ${copy.bodyBlock2?`<div class="b2b">${copy.bodyBlock2}</div>`:''}</div>`:''}
  </div>
  ${img1||img2?`<div class="cinema">${img1?`<img src="${img1}" alt="" style="object-position:${focalPos(img1Obj)}"/>`:''}${img2?`<img src="${img2}" alt="" style="object-position:${focalPos(img2Obj)}"/>`:''}  </div>`:''}
  ${buildFooter(client, footerData, { defaultBg: '#111' })}
</div></body></html>`
}

/* ══════════════════════════════════════════════════════════════════════════
   T4 · TROPICA  (Poolside FM / Palm Report)
   Blush bg · bold magenta masthead · images split side-by-side
   ══════════════════════════════════════════════════════════════════════════ */
function buildTemplate4({ client, copy, images, footerData }) {
  const heroObj  = images?.[0]; const heroImg = heroObj?.url||''
  const img1Obj  = images?.[1]; const img1    = img1Obj?.url||''
  const img2Obj  = images?.[2]; const img2    = img2Obj?.url||''
  const body     = (copy.bodyText||'').replace(/\n/g,'<br>')
  const logoUrl  = client?.logoUrl||''
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#fce8df;font-family:'Georgia',serif;color:#1a1a1a}
  .wrap{max-width:600px;margin:0 auto 48px;background:#fce8df;overflow:hidden}
  .mast{padding:28px 32px 20px;text-align:center}
  .script{font-size:16px;font-style:italic;color:#d4006a;margin-bottom:4px}
  .bold-title{font-size:58px;font-weight:900;line-height:.9;color:#d4006a;letter-spacing:-2px;text-transform:uppercase;font-family:Arial,sans-serif}
  .issue-line{display:flex;align-items:center;gap:10px;margin-top:14px}
  .il{flex:1;height:1.5px;background:#d4006a}
  .issue-txt{font-size:10px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#d4006a;font-family:Arial,sans-serif;white-space:nowrap}
  .split-hero{display:flex;gap:3px}
  .split-hero img{flex:1;width:50%;height:320px;object-fit:cover;display:block}
  .split-hero-single img{width:100%;height:360px;object-fit:cover;display:block}
  .hero-ph{width:100%;height:320px;background:#f0c8b8;display:flex;align-items:center;justify-content:center;color:#d4006a;font-size:12px;font-family:Arial,sans-serif}
  .hl-block{padding:32px 36px 8px;text-align:center}
  .hl-italic{font-size:30px;font-style:italic;font-weight:400;color:#1a1a1a;line-height:1.15;margin-bottom:4px}
  .hl-bold{font-size:30px;font-weight:900;color:#d4006a;line-height:1.1;text-transform:uppercase;font-family:Arial,sans-serif;margin-bottom:16px}
  .sub-txt{font-size:14px;line-height:1.75;color:#4a2a20;text-align:center;max-width:440px;margin:0 auto}
  .sdiv{display:flex;align-items:center;gap:12px;padding:24px 36px}
  .sline{flex:1;height:1.5px;background:#d4006a}
  .stxt{font-size:10px;font-weight:900;letter-spacing:.24em;text-transform:uppercase;color:#d4006a;font-family:Arial,sans-serif}
  .body{padding:0 36px 24px}
  .text{font-size:15px;line-height:1.85;color:#3a1a10;margin-bottom:20px}
  .closing{font-size:15px;line-height:1.8;color:#6a3a28;font-style:italic;margin-bottom:28px}
  .cta-w{margin-bottom:32px}
  .cta{display:inline-block;background:#d4006a;color:#fff;padding:14px 44px;font-size:12px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;text-decoration:none;font-family:Arial,sans-serif}
  .b2-section{background:#fff;padding:28px 36px}
  .b2t{font-size:10px;font-weight:900;letter-spacing:.22em;text-transform:uppercase;color:#d4006a;margin-bottom:12px;font-family:Arial,sans-serif}
  .b2b{font-size:15px;line-height:1.8;color:#333}
  .mag-spread{display:flex;gap:3px;margin-top:28px}
  .mag-spread img{flex:1;object-fit:cover;height:240px;display:block}
  .foot{background:#d4006a;padding:22px 36px;text-align:center;font-size:10px;color:rgba(255,255,255,.55);font-family:Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase}
  .foot a{color:rgba(255,255,255,.45)}
</style></head><body>
${emailClientHeader({client,copy})}
<div class="wrap">
  <div class="mast">
    ${logoUrl
      ? `<div style="margin-bottom:12px"><img src="${logoUrl}" alt="${client?.name||''}" style="height:52px;width:auto;object-fit:contain;display:block;margin:0 auto"/></div>`
      : `<div class="script">${client?.name||'Brand'}</div><div class="bold-title">${(client?.name||'REPORT').toUpperCase()}</div>`
    }
    <div class="issue-line"><div class="il"></div><div class="issue-txt">${copy.subjectLine||'Special Issue'}</div><div class="il"></div></div>
  </div>
  ${heroImg&&img1?`<div class="split-hero"><img src="${heroImg}" alt="" style="object-position:${focalPos(heroObj)}"/><img src="${img1}" alt="" style="object-position:${focalPos(img1Obj)}"/></div>`:heroImg?`<div class="split-hero-single"><img src="${heroImg}" alt="" style="object-position:${focalPos(heroObj)}"/></div>`:`<div class="hero-ph">Hero image</div>`}
  <div class="hl-block">
    <div class="hl-italic">${copy.headlineText||''}</div>
    ${copy.subhead?`<div class="hl-bold">${copy.subhead}</div>`:''}
  </div>
  <div class="sdiv"><div class="sline"></div><div class="stxt">This Week</div><div class="sline"></div></div>
  <div class="body">
    ${copy.bodyText?`<div class="text">${body}</div>`:''}
    ${copy.closingLine?`<div class="closing">${copy.closingLine}</div>`:''}
    ${copy.ctaText?`<div class="cta-w"><a class="cta" href="${copy.ctaUrl||'#'}">${copy.ctaText}</a></div>`:''}
  </div>
  ${copy.bodyBlock2Title||copy.bodyBlock2?`<div class="b2-section">${copy.bodyBlock2Title?`<div class="b2t">${copy.bodyBlock2Title}</div>`:''} ${copy.bodyBlock2?`<div class="b2b">${copy.bodyBlock2}</div>`:''}</div>`:''}
  ${img2?`<div class="mag-spread"><img src="${img2}" alt="" style="object-position:${focalPos(img2Obj)}"/></div>`:''}
  ${buildFooter(client, footerData, { defaultBg: '#d4006a' })}
</div></body></html>`
}

/* ══════════════════════════════════════════════════════════════════════════
   WEEK 2  — arch hero with overlay · structured content order
   hero(logo+hl+img) → subhead → CTA → body → b2title → images → b2body → closing → CTA
   ══════════════════════════════════════════════════════════════════════════ */
function buildTemplateWeek2({ client, copy, images, footerData, isHeroGenerated = false,
  heroScale=1, heroX=0, heroY=0,
  textSize=38, textTop=32, textLeft=24,
  logoColor='original', logoTop=24, logoRight=200, logoSize=40,
  img1Scale=1, img1X=0, img1Y=0,
  img2Scale=1, img2X=0, img2Y=0,
  img3Scale=1, img3X=0, img3Y=0,
}) {
  const heroObj  = images?.[0]; const heroImg = heroObj?.url||''
  const img1Obj  = images?.[1]; const img1    = img1Obj?.url||''
  const img2Obj  = images?.[2]; const img2    = img2Obj?.url||''
  const img3Obj  = images?.[3]; const img3    = img3Obj?.url||''
  const body     = (copy.bodyText||'').replace(/\n/g,'<br>')
  const b2body   = (copy.bodyBlock2||'').replace(/\n/g,'<br>')
  const logoUrl  = client?.logoUrl||''
  const pageBg     = footerData?.bgColor      || '#1e2a4a'
  const midBg      = '#fffffe'
  const accentClr  = footerData?.buttonColor || '#d4006a'
  const secondaryClr = footerData?.secondaryColor || accentClr
  const logoFilter = logoColor === 'white' ? 'brightness(0) invert(1)' : logoColor === 'black' ? 'brightness(0)' : 'none'

  const WHITE_BG = 'background-color:#ffffff;background-image:linear-gradient(to top,#ffffff 0%,#ffffff 100%)'
  const PAGE_BG  = `background-color:${pageBg};background-image:linear-gradient(to top,${pageBg} 0%,${pageBg} 100%)`

  const logoOverlay = logoUrl
    ? `<img src="${logoUrl}" alt="${client?.name||''}" style="display:inline-block;height:${logoSize}px;width:auto;max-width:${logoSize * 6}px;filter:${logoFilter};"/>`
    : `<div style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#1a1a1a;margin-bottom:10px;">${client?.name||''}</div>`

  return `<!DOCTYPE html><html lang="en" style="color-scheme:light"><head><meta charset="UTF-8"/>
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<style>
  :root{color-scheme:light;supported-color-schemes:light}
  *{box-sizing:border-box;margin:0;padding:0}
  body{${PAGE_BG};color:#1a1a1a;}
  table{border-collapse:collapse;}
  u + .body .gmailfix { background-color:#ffffff!important; background-image:linear-gradient(to top,#ffffff 0%,#ffffff 100%)!important; }
  u + .body .gmailfix-page { background-color:${pageBg}!important; background-image:linear-gradient(to top,${pageBg} 0%,${pageBg} 100%)!important; }
  u + .body .gmailtext-dark  { color:#1a1a1a!important; }
  u + .body .gmailtext-muted { color:#555!important; }
  @media (prefers-color-scheme:dark){
    html,body{ ${PAGE_BG}; color:#1a1a1a!important; }
    .gmailfix { background-color:#ffffff!important; background-image:linear-gradient(to top,#ffffff 0%,#ffffff 100%)!important; }
    .gmailfix-page { background-color:${pageBg}!important; background-image:linear-gradient(to top,${pageBg} 0%,${pageBg} 100%)!important; }
    .gmailtext-dark  { color:#1a1a1a!important; }
    .gmailtext-muted { color:#555!important; }
  }
</style></head><body class="body" style="${PAGE_BG};margin:0;padding:0;font-family:Arial,sans-serif;color:#1a1a1a!important;">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="${pageBg}" style="${PAGE_BG};border-collapse:collapse;">
<tr><td align="center" class="gmailfix-page" style="padding:32px 0;${PAGE_BG};">
<table width="600" cellpadding="0" cellspacing="0" class="gmailfix" bgcolor="#ffffff" style="width:600px;max-width:600px;${WHITE_BG};border-collapse:collapse;border-radius:20px;overflow:hidden;">
<tr><td class="gmailfix" style="${WHITE_BG};">

  <!-- LOGO HEADER (always above arch) -->
  <div style="padding:${logoTop}px 32px 18px;text-align:center;${WHITE_BG};">${logoOverlay}</div>

  <!-- HERO: generated composite PNG (logo+arch+text baked in) or CSS fallback for preview -->
  ${isHeroGenerated
    ? `<div style="line-height:0;font-size:0;${WHITE_BG};"><img src="${heroImg}" alt="" width="600" style="width:100%;display:block;max-width:600px;"/></div>`
    : `<div style="position:relative;line-height:0;font-size:0;padding:0 36px;${WHITE_BG};height:580px;overflow:hidden;">
    ${heroImg
      ? `<img src="${heroImg}" alt="" style="width:100%;height:580px;object-fit:cover;display:block;border-radius:999px 999px 0 0;object-position:calc(50% + ${heroX}px) calc(50% + ${heroY}px);transform:scale(${heroScale});transform-origin:50% 50%;"/>`
      : `<div style="width:100%;height:580px;background:#f0c8b8;border-radius:999px 999px 0 0;text-align:center;color:${accentClr};font-size:12px;font-family:Arial,sans-serif;line-height:580px;">Hero image</div>`}
    <div style="position:absolute;top:0;left:36px;right:36px;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0) 0%,rgba(0,0,0,0) 50%,rgba(0,0,0,0.45) 100%);border-radius:999px 999px 0 0;">
      <table width="100%" height="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;height:100%;border-collapse:collapse;">
        <tr><td valign="bottom" align="center" style="vertical-align:bottom;text-align:center;padding:0 ${textLeft}px ${textTop}px;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:${textSize}px;font-weight:700;color:#fff;line-height:1.12;text-shadow:0 2px 10px rgba(0,0,0,.3);display:inline-block;max-width:360px;">${copy.headlineText||''}</div>
        </td></tr>
      </table>
    </div>
  </div>`}

  <!-- SUBHEAD -->
  ${copy.subhead ? `<div style="padding:28px 48px 4px;text-align:center;${WHITE_BG};"><div style="font-family:Georgia,serif;font-size:20px;font-weight:400;font-style:italic;color:#878787;line-height:1.5;">${copy.subhead}</div></div>` : ''}

  <!-- CTA -->
  ${copy.ctaText ? `<div style="padding:24px 48px 28px;text-align:center;${WHITE_BG};"><a href="${copy.ctaUrl||'#'}" style="display:inline-block;background:${accentClr};color:#fff!important;padding:14px 40px;font-size:16px;font-weight:600;letter-spacing:.06em;text-decoration:none!important;font-family:Arial,sans-serif;border-radius:50px;">${copy.ctaText}</a></div>` : ''}

  <!-- LONG IMAGE (img1) -->
  ${img1 ? `<div style="line-height:0;font-size:0;padding:0 36px 16px;${WHITE_BG};"><div style="overflow:hidden;border-radius:8px;height:260px;"><img src="${img1}" alt="" style="width:100%;height:260px;object-fit:cover;display:block;object-position:${focalPos(img1Obj)};transform:translate(${img1X}px,${img1Y}px) scale(${img1Scale});transform-origin:center center;"/></div></div>` : ''}

  <!-- BODY BLOCK -->
  ${copy.bodyText ? `<div style="padding:24px 48px 32px;${WHITE_BG};"><div style="font-size:18px;line-height:1.8;color:#878787!important;margin-bottom:18px;font-family:Arial,sans-serif;">${body}</div></div>` : ''}

  <!-- STRIP IMAGES (img2 + img3) — table layout, no flex -->
  ${img2 ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;${WHITE_BG};">
    <tr><td style="padding:0 36px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;line-height:0;font-size:0;">
        <tr>
          ${img2 ? `<td width="49%" style="padding-right:4px;vertical-align:top;"><div style="overflow:hidden;border-radius:6px;height:220px;"><img src="${img2}" alt="" width="100%" style="width:100%;height:220px;object-fit:cover;display:block;object-position:${focalPos(img2Obj)};transform:translate(${img2X}px,${img2Y}px) scale(${img2Scale});transform-origin:center center;"/></div></td>` : ''}
          ${img3 ? `<td width="49%" style="padding-left:4px;vertical-align:top;"><div style="overflow:hidden;border-radius:6px;height:220px;"><img src="${img3}" alt="" width="100%" style="width:100%;height:220px;object-fit:cover;display:block;object-position:${focalPos(img3Obj)};transform:translate(${img3X}px,${img3Y}px) scale(${img3Scale});transform-origin:center center;"/></div></td>` : ''}
        </tr>
      </table>
    </td></tr>
  </table>` : ''}

  <!-- BODY BLOCK 2: title + body2 + closing + CTA -->
  ${(copy.bodyBlock2Title || copy.bodyBlock2 || copy.closingLine) ? `
  <div style="${WHITE_BG};padding:8px 36px 0;">
    <div style="${WHITE_BG};border-radius:10px;padding:16px 20px;">
      ${copy.bodyBlock2Title ? `<div style="font-size:14px;font-weight:700;font-family:Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:${accentClr}!important;margin-bottom:6px;text-align:left;">${copy.bodyBlock2Title}</div>` : ''}
      ${copy.bodyBlock2 ? `<div style="font-size:18px;line-height:1.8;color:#878787!important;margin-bottom:18px;font-family:Arial,sans-serif;">${b2body}</div>` : ''}
      ${copy.closingLine ? `<div style="font-size:17px;line-height:1.7;color:#878787!important;font-style:italic;margin-bottom:24px;font-family:Georgia,serif;">${copy.closingLine}</div>` : ''}
    </div>
    ${copy.ctaText ? `<div style="padding:16px 0 36px;text-align:center;"><a href="${copy.ctaUrl||'#'}" style="display:inline-block;background:${accentClr};color:#fff!important;padding:14px 40px;font-size:16px;font-weight:600;letter-spacing:.06em;text-decoration:none!important;font-family:Arial,sans-serif;border-radius:50px;">${copy.ctaText}</a></div>` : ''}
  </div>` : ''}

  ${buildFooter(client, footerData, { defaultBg: '#d4006a' })}
</td></tr></table></td></tr></table></body></html>`
}

/* ══════════════════════════════════════════════════════════════════════════
   WEEK 3  ·  Full-bleed hero + white-fade + stacked cards
   Inspired by Wander / Endless Stays editorial style
   ══════════════════════════════════════════════════════════════════════════ */
function buildTemplateWeek3({ client, copy, images, footerData, isHeroGenerated = false,
  heroScale=1, heroX=0, heroY=0,
  textSize=40, textTop=14, textLeft=52,
  logoColor='white', logoTop=40, logoRight=36, logoSize=44,
  img1Scale=1, img1X=0, img1Y=0,
  img2Scale=1, img2X=0, img2Y=0,
  img3Scale=1, img3X=0, img3Y=0,
}) {
  const heroObj  = images?.[0]; const heroImg = heroObj?.url||''
  const img1Obj  = images?.[1]; const img1    = img1Obj?.url||''
  const img2Obj  = images?.[2]; const img2    = img2Obj?.url||''
  const img3Obj  = images?.[3]; const img3    = img3Obj?.url||''
  const img4Obj  = images?.[4]; const img4    = img4Obj?.url||''
  const img5Obj  = images?.[5]; const img5    = img5Obj?.url||''
  const body     = (copy.bodyText||'').replace(/\n/g,'<br>')
  const b2body   = (copy.bodyBlock2||'').replace(/\n/g,'<br>')
  const logoUrl  = client?.logoUrl||''
  const pageBg     = footerData?.bgColor || '#f5f4f2'
  const cardBg     = '#fffffe'
  const accentClr  = footerData?.buttonColor || '#1a1a1a'
  const secondaryClr = footerData?.secondaryColor || accentClr
  const logoFilter = logoColor === 'white' ? 'brightness(0) invert(1)' : logoColor === 'black' ? 'brightness(0)' : 'none'

  const PAGE_BG  = `background-color:${pageBg};background-image:linear-gradient(to top,${pageBg} 0%,${pageBg} 100%)`
  const WHITE_BG = PAGE_BG
  const OUTER_BG = 'background-color:#ffffff;background-image:linear-gradient(to top,#ffffff 0%,#ffffff 100%)'

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${client?.name||''}" style="height:${logoSize}px;width:auto;max-width:${logoSize * 5}px;display:inline-block;filter:${logoFilter};"/>`
    : `<span style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#fff;">${client?.name||''}</span>`

  // Stacked image section: generated PNG (email-safe) or CSS preview (browser)
  // Right card falls back to img1 if img2 isn't selected
  const card2Src = img2 || img1
  const card2Obj = img2 ? img2Obj : img1Obj

  const stackedSection = isHeroGenerated && img4
    ? `<tr><td class="gmailfix" style="padding:32px 0 8pt;text-align:center;${WHITE_BG};line-height:0;font-size:0;">
        <img src="${img4}" alt="" width="600" style="width:600px;max-width:100%;display:inline-block;"/>
      </td></tr>`
    : img1
      ? `<tr><td class="gmailfix" style="padding:32px 0 8px;text-align:center;${WHITE_BG};line-height:0;font-size:0;">
          <div style="position:relative;width:600px;height:420px;${WHITE_BG};">
            <div style="position:absolute;left:28px;top:24px;width:272px;height:372px;border-radius:20px;transform:rotate(-3deg);transform-origin:center center;box-shadow:4px 0 20px rgba(0,0,0,0.18);overflow:hidden;z-index:1;">
              <img src="${img1}" alt="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:${focalPos(img1Obj)};transform:translate(${img1X}px,${img1Y}px) scale(${img1Scale});transform-origin:center center;"/>
            </div>
            <div style="position:absolute;left:296px;top:24px;width:272px;height:372px;border-radius:20px;transform:rotate(3deg);transform-origin:center center;box-shadow:-4px 0 20px rgba(0,0,0,0.18);overflow:hidden;z-index:2;">
              <img src="${card2Src}" alt="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:${focalPos(card2Obj)};transform:translate(${img2X}px,${img2Y}px) scale(${img2Scale});transform-origin:center center;"/>
            </div>
          </div>
        </td></tr>`
      : ''

  return `<!DOCTYPE html><html lang="en" style="color-scheme:light"><head><meta charset="UTF-8"/>
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&display=swap"/>
<style>
  :root{color-scheme:light;supported-color-schemes:light}
  *{box-sizing:border-box;margin:0;padding:0}
  body{${OUTER_BG};color:#1a1a1a;}
  table{border-collapse:collapse;}
  u + .body .gmailfix { background-color:${pageBg}!important; background-image:linear-gradient(to top,${pageBg} 0%,${pageBg} 100%)!important; }
  u + .body .gmailfix-page { background-color:#ffffff!important; background-image:linear-gradient(to top,#ffffff 0%,#ffffff 100%)!important; }
  u + .body .gmailtext-dark  { color:#1a1a1a!important; }
  u + .body .gmailtext-muted { color:#555!important; }
  @media (prefers-color-scheme:dark){
    html,body{ ${OUTER_BG}; color:#1a1a1a!important; }
    .gmailfix { background-color:${pageBg}!important; background-image:linear-gradient(to top,${pageBg} 0%,${pageBg} 100%)!important; }
    .gmailfix-page { background-color:#ffffff!important; background-image:linear-gradient(to top,#ffffff 0%,#ffffff 100%)!important; }
    .gmailtext-dark  { color:#1a1a1a!important; }
    .gmailtext-muted { color:#555!important; }
  }
</style></head><body class="body" style="${OUTER_BG};margin:0;padding:0;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;${OUTER_BG};border-collapse:collapse;">
<tr><td align="center" class="gmailfix-page" style="padding:24px 0 48px;${OUTER_BG};">

  <table width="600" cellpadding="0" cellspacing="0" border="0" class="gmailfix" bgcolor="${pageBg}" style="width:600px;max-width:600px;${WHITE_BG};border-collapse:collapse;border-radius:20px;overflow:hidden;">

    <!-- ── HERO ── -->
    ${isHeroGenerated
      ? `<tr><td style="line-height:0;font-size:0;padding:0;border-radius:20px 20px 0 0;overflow:hidden;">
          <img src="${heroImg}" alt="" width="600" style="width:100%;display:block;max-width:600px;border-radius:20px 20px 0 0;"/>
        </td></tr>`
      : `<tr><td style="position:relative;line-height:0;font-size:0;padding:0;height:600px;overflow:hidden;background:#1a1a1a;border-radius:20px 20px 0 0;">
          ${heroImg ? `<img src="${heroImg}" alt="" style="position:absolute;top:${Math.min(0,Math.max(600*(1-heroScale),-(600*(heroScale-1)/2)+heroY))}px;left:${Math.min(0,Math.max(600*(1-heroScale),-(600*(heroScale-1)/2)+heroX))}px;width:${600*heroScale}px;height:${600*heroScale}px;object-fit:cover;display:block;border-radius:20px 20px 0 0;"/>` : `<div style="width:100%;height:600px;background:#2a2a2a;border-radius:20px 20px 0 0;"></div>`}
          <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0.7) 0%,rgba(0,0,0,0.25) 40%,rgba(0,0,0,0) 62%);border-radius:20px 20px 0 0;">
            <div style="text-align:center;padding:${logoTop}px 48px 0;">${logoHtml}</div>
            <div style="text-align:center;padding:${textTop}px ${textLeft}px 0;">
              <div style="font-family:'Playfair Display',Georgia,serif;font-size:${textSize}px;font-weight:600;line-height:1.12;color:#fff;text-shadow:0 2px 20px rgba(0,0,0,0.4);">${copy.headlineText||''}</div>
            </div>
          </div>
          <div style="position:absolute;bottom:0;left:0;right:0;height:160px;background:linear-gradient(to bottom,${pageBg}00,${pageBg});pointer-events:none;"></div>
        </td></tr>`}

    <!-- ── SUBHEAD + CTA ── -->
    <tr><td class="gmailfix" style="padding:${isHeroGenerated ? '40px' : '10px'} 52px 36px;text-align:center;${WHITE_BG};">
      ${copy.subhead ? `<div style="font-family:Georgia,serif;font-size:18px;font-style:italic;color:#878787!important;line-height:1.6;margin-bottom:32px;max-width:460px;margin-left:auto;margin-right:auto;">${copy.subhead}</div>` : ''}
      ${copy.ctaText ? `<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td style="background:${accentClr};border-radius:100px;"><a href="${copy.ctaUrl||'#'}" style="display:inline-block;padding:16px 40px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#fff!important;text-decoration:none!important;letter-spacing:.04em;white-space:nowrap;">${copy.ctaText} &rarr;</a></td></tr></table>` : ''}
    </td></tr>

    <!-- ── DIVIDER ── -->
    <tr><td class="gmailfix" style="padding:0 48px;${WHITE_BG};">
      <div style="height:1px;width:100%;background:rgba(0,0,0,0.1);font-size:0;line-height:0;"></div>
    </td></tr>

    <!-- ── IMAGE ── -->
    ${stackedSection}

    <!-- ── BODY TEXT ── -->
    <tr><td class="gmailfix" style="padding:36px 52px 24px;${WHITE_BG};text-align:center;">
      ${copy.bodyText ? `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.9;color:#878787!important;max-width:460px;margin-left:auto;margin-right:auto;">${body}</div>` : ''}
    </td></tr>

    <!-- ── DIVIDER 2 ── -->
    <tr><td class="gmailfix" style="padding:0 48px;${WHITE_BG};">
      <div style="height:1px;width:100%;background:rgba(0,0,0,0.1);font-size:0;line-height:0;"></div>
    </td></tr>

    <!-- ── BODY BLOCK 2 TITLE + IMAGE + TEXT ── -->
    ${copy.bodyBlock2Title ? `
    <tr><td class="gmailfix" style="padding:36px 52px 0;${WHITE_BG};text-align:center;">
      <div style="font-family:Arial,sans-serif;font-size:16px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${secondaryClr}!important;margin-bottom:0;">${copy.bodyBlock2Title}</div>
    </td></tr>` : ''}

    ${isHeroGenerated && img5
      ? `<tr><td class="gmailfix" style="padding:0;line-height:0;font-size:0;text-align:center;${WHITE_BG};"><img src="${img5}" alt="" width="600" style="display:block;width:600px;max-width:100%;"/></td></tr>`
      : (img3 || img1) ? `
    <tr><td class="gmailfix" style="padding:20px 40px 0;${WHITE_BG};line-height:0;font-size:0;text-align:center;">
      <div style="display:inline-block;width:100%;max-width:520px;height:320px;border-radius:14px;overflow:hidden;">
        <img src="${img3 || img1}" alt="" width="520" style="width:100%;height:320px;object-fit:cover;display:block;object-position:${focalPos(img3 ? img3Obj : img1Obj)};transform:translate(${img3X}px,${img3Y}px) scale(${img3Scale});transform-origin:center center;"/>
      </div>
    </td></tr>` : ''}

    ${(copy.bodyBlock2 || copy.closingLine) ? `
    <tr><td class="gmailfix" style="padding:28px 52px 0;${WHITE_BG};text-align:center;">
      ${copy.bodyBlock2 ? `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.9;color:#878787!important;margin-bottom:18px;max-width:460px;margin-left:auto;margin-right:auto;">${b2body}</div>` : ''}
      ${copy.closingLine ? `<div style="font-family:Georgia,serif;font-size:15px;font-style:italic;color:#878787!important;margin-bottom:28px;">${copy.closingLine}</div>` : ''}
    </td></tr>` : ''}

    <!-- ── REPEAT CTA ── -->
    ${copy.ctaText ? `
    <tr><td class="gmailfix" style="padding:8px 52px 44px;text-align:center;${WHITE_BG};">
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td style="background:${accentClr};border-radius:100px;"><a href="${copy.ctaUrl||'#'}" style="display:inline-block;padding:16px 40px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#fff!important;text-decoration:none!important;letter-spacing:.04em;white-space:nowrap;">${copy.ctaText} &rarr;</a></td></tr></table>
    </td></tr>` : ''}

    <tr><td class="gmailfix" style="padding:0;line-height:0;font-size:0;${WHITE_BG};">${buildFooter(client, footerData, { defaultBg: pageBg })}</td></tr>
  </table>

</td></tr>
</table>
</body></html>`
}

/* ══════════════════════════════════════════════════════════════════════════
   T5 · CASA  (WatchHouse + Scottsdale Plaza)
   Cream · terracotta border · centered brand · alternating sections
   ══════════════════════════════════════════════════════════════════════════ */
function buildTemplate5({ client, copy, images, footerData }) {
  const heroObj  = images?.[0]; const heroImg = heroObj?.url||''
  const img1Obj  = images?.[1]; const img1    = img1Obj?.url||''
  const img2Obj  = images?.[2]; const img2    = img2Obj?.url||''
  const body     = (copy.bodyText||'').replace(/\n/g,'<br>')
  const logoUrl  = client?.logoUrl||''
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#c4512a;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#1a1a1a}
  .wrap{max-width:560px;margin:0 auto 48px;background:#f5f0e6;overflow:hidden}
  .header{padding:32px 40px 24px;text-align:center;border-bottom:1px solid #e0d4c0}
  .brand{font-size:26px;font-weight:800;letter-spacing:-.5px;color:#1a1a1a;margin-bottom:4px}
  .date-stamp{font-size:11px;color:#a09078;letter-spacing:.12em;text-transform:uppercase}
  .hl-block{padding:36px 44px 28px;text-align:center}
  h1{font-size:32px;line-height:1.18;font-weight:800;letter-spacing:-.4px;color:#1a1a1a;margin-bottom:14px}
  .sub{font-size:16px;line-height:1.65;color:#6a5a48;max-width:420px;margin:0 auto}
  .img-block{padding:0 20px;background:#f5f0e6}
  .img-block img{width:100%;border-radius:4px;display:block;object-fit:cover;height:280px}
  .img-ph{width:100%;height:240px;background:#e0d4c0;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#a09078;font-size:12px}
  .body{padding:28px 44px;background:#f5f0e6}
  .label{font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#c4512a;margin-bottom:16px}
  .text{font-size:15px;line-height:1.9;color:#3a3028;margin-bottom:20px;text-align:left}
  .closing{font-size:15px;line-height:1.8;color:#6a5a48;margin-bottom:32px;text-align:left}
  .cta-w{text-align:center;margin-bottom:0}
  .cta{display:inline-block;background:#1a1a1a;color:#f5f0e6;padding:14px 44px;border-radius:3px;font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;text-decoration:none}
  .div{height:1px;background:#e0d4c0;margin:28px 40px}
  .b2{background:#f5f0e6;padding:0 44px 28px}
  .b2t{font-size:14px;font-weight:800;color:#1a1a1a;margin-bottom:8px}
  .b2b{font-size:14px;line-height:1.75;color:#6a5a48}
  .community{background:#1a1a1a;padding:36px 44px;text-align:center}
  .comm-title{font-size:24px;font-weight:800;color:#fff;line-height:1.25;margin-bottom:12px}
  .comm-sub{font-size:14px;color:rgba(255,255,255,.6);line-height:1.7;margin-bottom:24px}
  .comm-cta{display:inline-block;border:1.5px solid #fff;color:#fff;padding:13px 40px;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;text-decoration:none}
  .foot{background:#f5f0e6;border-top:1px solid #e0d4c0;padding:22px 40px;text-align:center;font-size:11px;color:#a09078;letter-spacing:.08em}
  .foot a{color:#a09078}
</style></head><body>
${emailClientHeader({client,copy})}
<div class="wrap">
  <div class="header">
    ${logoUrl ? `<img src="${logoUrl}" alt="${client?.name||''}" style="height:44px;width:auto;object-fit:contain;display:block;margin:0 auto 6px"/>` : `<div class="brand">${client?.name||'Brand'}</div>`}
    <div class="date-stamp">${new Date().toLocaleDateString('en-US',{day:'2-digit',month:'2-digit',year:'2-digit'})}</div>
  </div>
  <div class="hl-block">
    ${copy.subjectLine?`<div class="label">${copy.subjectLine}</div>`:''}
    <h1>${copy.headlineText||''}</h1>
    ${copy.subhead?`<div class="sub">${copy.subhead}</div>`:''}
  </div>
  <div class="img-block">${heroImg?`<img src="${heroImg}" alt="" style="object-position:${focalPos(heroObj)}"/>`:`<div class="img-ph">Hero image</div>`}</div>
  <div class="body">
    ${copy.bodyText?`<div class="text">${body}</div>`:''}
    ${copy.closingLine?`<div class="closing">${copy.closingLine}</div>`:''}
    ${copy.ctaText?`<div class="cta-w"><a class="cta" href="${copy.ctaUrl||'#'}">${copy.ctaText}</a></div>`:''}
  </div>
  ${img1?`<div style="background:#f5f0e6;padding:0 20px 24px"><img src="${img1}" alt="" style="width:100%;height:220px;object-fit:cover;display:block;border-radius:4px;object-position:${focalPos(img1Obj)}"/></div>`:''}
  ${copy.bodyBlock2Title||copy.bodyBlock2?`<div class="div"></div><div class="b2">${copy.bodyBlock2Title?`<div class="b2t">${copy.bodyBlock2Title}</div>`:''} ${copy.bodyBlock2?`<div class="b2b">${copy.bodyBlock2}</div>`:''}</div>`:''}
  <div class="community">
    <div class="comm-title">Join the ${client?.name||'Brand'} community.</div>
    <div class="comm-sub">Stay connected and be the first to know about exclusive offers.</div>
    <a class="comm-cta" href="#">Learn More</a>
  </div>
  ${buildFooter(client, footerData, { defaultBg: '#1a1a1a' })}
</div></body></html>`
}

/* ══════════════════════════════════════════════════════════════════════════
   T12 · GETAWAY  (Getaway cabin email)
   Beige bg · top nav · italic serif headline on hero · orange pill CTA
   Dark forest-green lower section · 3-image grid · yellow pill CTA
   ══════════════════════════════════════════════════════════════════════════ */
function buildTemplate12({ client, copy, images, footerData, heroScale=1, heroX=0, heroY=0, textSize=34, textTop=32, textLeft=36, logoColor='original', logoTop=24, logoRight=36, logoSize=70 }) {
  const heroObj  = images?.[0]; const heroImg = heroObj?.url||''
  const img1Obj  = images?.[1]; const img1    = img1Obj?.url||''
  const img2Obj  = images?.[2]; const img2    = img2Obj?.url||''
  const body     = (copy.bodyText||'').replace(/\n/g,'<br>')
  const logoUrl  = client?.logoUrl||''
  const creamBg  = footerData?.bgColor || '#f5f0e8'
  const logoFilter = logoColor === 'white' ? 'brightness(0) invert(1)' : logoColor === 'black' ? 'brightness(0)' : 'none'

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#e8e5e0;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#1a1a1a}
  .wrap{max-width:600px;margin:0 auto 48px;background:${creamBg}}
  /* nav */
  .nav{padding:14px 24px;display:flex;align-items:center;justify-content:space-between;background:#f5f0e8}
  .nav-links{display:flex;gap:18px}
  .nav-links a{font-size:12px;color:#666;text-decoration:none}
  .nav-brand{font-size:24px;font-weight:700;color:#1a1a1a;font-family:'Georgia',serif;font-style:italic;letter-spacing:-.3px}
  /* hero — Canva-style: image-wrap clips image, overlays sit on top unclipped */
  .hero{position:relative;height:560px;line-height:0}
  .hero-img-wrap{position:absolute;top:0;left:0;right:0;bottom:0;overflow:hidden}
  .hero-img-wrap img{position:absolute;width:${heroScale*100}%;height:${heroScale*100}%;min-width:100%;min-height:100%;object-fit:cover;display:block;left:50%;top:50%;transform:translate(calc(-50% + ${heroX}px),calc(-50% + ${heroY}px))}
  .hero-ph{width:100%;height:560px;background:#2a4a2a;display:flex;align-items:center;justify-content:center;color:#5a8a5a;font-size:12px}
  .hero-text{position:absolute;top:${textTop}px;left:${textLeft}px;right:36px;z-index:2}
  .hero-logo-text{font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#fff;margin-bottom:12px;display:block}
  .hero-hl{font-size:${textSize}px;font-weight:400;color:#fff;line-height:1.15;font-family:'Georgia',serif;font-style:italic;text-shadow:0 2px 16px rgba(0,0,0,.3);max-width:260px}
  /* cream content */
  .content{padding:44px 56px;text-align:center;background:${creamBg}}
  .text{font-size:15px;line-height:1.85;color:#3a3028;margin-bottom:16px}
  .closing{font-size:14px;color:#777;font-style:italic;margin-bottom:32px}
  .cta-w{margin-bottom:0}
  .cta{display:inline-block;background:#e05a28;color:#fff;padding:15px 52px;border-radius:50px;font-size:15px;font-weight:700;text-decoration:none}
  /* dark section */
  .dark{background:#2d4a30;padding:44px 0;text-align:center;overflow:hidden}
  .dark-head{font-size:27px;font-weight:700;color:#fff;font-family:'Georgia',serif;margin-bottom:28px;padding:0 36px}
  .grid3{display:flex;gap:6px;margin-bottom:28px;margin-left:-12px;margin-right:-12px}
  .grid3 img{flex:1;width:33.33%;height:230px;object-fit:cover;display:block;border-radius:10px}
  .grid3-ph{flex:1;height:230px;background:#1a3a1a;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#4a7a4a;font-size:11px}
  .dark-body{font-size:15px;line-height:1.75;color:rgba(255,255,255,.75);margin-bottom:28px;max-width:440px;margin-left:auto;margin-right:auto;padding:0 36px}
  .dark-cta{display:inline-block;background:#f0c040;color:#1a1a1a;padding:15px 52px;border-radius:50px;font-size:15px;font-weight:800;text-decoration:none}
  /* social */
  .social{padding:22px;text-align:center;background:#2d4a30;border-top:1px solid rgba(255,255,255,.08)}
  .soc{display:inline-block;width:30px;height:30px;border-radius:50%;border:1.5px solid rgba(255,255,255,.3);color:rgba(255,255,255,.5);font-size:12px;line-height:28px;text-align:center;margin:0 4px;font-family:Arial,sans-serif;text-decoration:none}
  /* footer */
  .foot{background:${creamBg};padding:20px 36px;text-align:center;font-size:11px;color:#aaa;letter-spacing:.06em}
  .foot a{color:#aaa}
</style></head><body>
<div class="wrap">
  <div class="hero">
    <div class="hero-img-wrap">${heroImg?`<img src="${heroImg}" alt="" style="object-position:${focalPos(heroObj)}"/>`:`<div class="hero-ph">Hero image</div>`}</div>
    <div style="position:absolute;top:${logoTop}px;right:${logoRight}px;z-index:2;">
      ${logoUrl ? `<img src="${logoUrl}" alt="${client?.name||''}" style="display:block;height:${logoSize}px;width:auto;max-width:240px;filter:${logoFilter};"/>` : `<span class="hero-logo-text">${client?.name||''}</span>`}
    </div>
    <div class="hero-text">
      <div class="hero-hl">${copy.headlineText||''}</div>
    </div>
  </div>
  <div class="content">
    ${copy.subhead?`<div class="text" style="font-weight:600;margin-bottom:20px">${copy.subhead}</div>`:''}
    ${copy.bodyText?`<div class="text">${body}</div>`:''}
    ${copy.closingLine?`<div class="closing">${copy.closingLine}</div>`:''}
    ${copy.ctaText?`<div class="cta-w"><a class="cta" href="${copy.ctaUrl||'#'}">${copy.ctaText}</a></div>`:''}
  </div>
  <div class="dark">
    ${copy.bodyBlock2Title?`<div class="dark-head">${copy.bodyBlock2Title}</div>`:''}
    <div class="grid3">
      ${heroImg&&img1&&img2
        ?`<img src="${heroImg}" alt="" style="object-position:${focalPos(heroObj)}"/><img src="${img1}" alt="" style="object-position:${focalPos(img1Obj)}"/><img src="${img2}" alt="" style="object-position:${focalPos(img2Obj)}"/>`
        :img1&&img2
          ?`<img src="${img1}" alt="" style="object-position:${focalPos(img1Obj)}"/><img src="${img2}" alt="" style="object-position:${focalPos(img2Obj)}"/><div class="grid3-ph">·</div>`
          :img1
            ?`<img src="${img1}" alt="" style="object-position:${focalPos(img1Obj)}"/><div class="grid3-ph">·</div><div class="grid3-ph">·</div>`
            :`<div class="grid3-ph">·</div><div class="grid3-ph">·</div><div class="grid3-ph">·</div>`}
    </div>
    ${copy.bodyBlock2?`<div class="dark-body">${copy.bodyBlock2}</div>`:''}
    ${copy.ctaText?`<a class="dark-cta" href="${copy.ctaUrl||'#'}">${copy.ctaText}</a>`:''}
  </div>
  ${buildFooter(client, footerData, { defaultBg: '#f5f0e8' })}
</div></body></html>`
}

/* ══════════════════════════════════════════════════════════════════════════
   T14 · FOREST  (AllTrails National Forest email)
   Dark forest green throughout · top bar · rounded hero · white bold hl
   Green pill CTA · 1+2 mosaic grid · partner section · action list rows
   ══════════════════════════════════════════════════════════════════════════ */
function buildTemplate14({ client, copy, images, footerData }) {
  const heroObj  = images?.[0]; const heroImg = heroObj?.url||''
  const img1Obj  = images?.[1]; const img1    = img1Obj?.url||''
  const img2Obj  = images?.[2]; const img2    = img2Obj?.url||''
  const body     = (copy.bodyText||'').replace(/\n/g,'<br>')
  const logoUrl  = client?.logoUrl||''

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#162a1e;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#fff}
  .wrap{max-width:600px;margin:0 auto 48px;background:#162a1e}
  /* top bar */
  .topbar{padding:16px 24px;display:flex;align-items:center;justify-content:space-between}
  .tb-brand{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:700;color:#fff}
  .tb-icon{width:20px;height:20px}
  .tb-right{font-size:12px;color:rgba(255,255,255,.55);letter-spacing:.04em}
  /* hero — rounded corners */
  .hero{padding:0 20px 28px;line-height:0}
  .hero img{width:100%;height:320px;object-fit:cover;display:block;border-radius:12px}
  .hero-ph{width:100%;height:280px;background:#0a1a10;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#2a5a2a;font-size:12px}
  /* headline */
  .hl-section{padding:0 24px 28px}
  .hl{font-size:42px;font-weight:800;color:#fff;line-height:1.05;letter-spacing:-.6px;margin-bottom:18px}
  .sub{font-size:16px;line-height:1.7;color:rgba(255,255,255,.65);margin-bottom:24px}
  .cta{display:inline-block;background:#5ab85a;color:#fff;padding:13px 32px;border-radius:50px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:.02em}
  /* mosaic */
  .mosaic{display:flex;gap:4px;padding:0 20px 32px;height:210px}
  .mos-main{flex:1;line-height:0}
  .mos-main img{width:100%;height:100%;object-fit:cover;display:block;border-radius:8px}
  .mos-main-ph{width:100%;height:100%;background:#0a2010;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#2a5a2a;font-size:11px}
  .mos-stack{width:46%;display:flex;flex-direction:column;gap:4px}
  .mos-stack img{width:100%;flex:1;object-fit:cover;display:block;border-radius:8px;min-height:0}
  .mos-stack-ph{flex:1;background:#0a2010;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#2a5a2a;font-size:11px}
  /* partner section */
  .partner{padding:28px 24px;border-top:1px solid rgba(255,255,255,.1)}
  .partner-badge{display:flex;align-items:center;gap:10px;margin-bottom:16px}
  .partner-icon{width:32px;height:32px;background:rgba(255,255,255,.08);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:15px}
  .partner-name{font-size:12px;font-weight:700;color:rgba(255,255,255,.7);letter-spacing:.04em}
  .partner-hl{font-size:24px;font-weight:800;color:#fff;margin-bottom:14px;line-height:1.2}
  .partner-body{font-size:15px;line-height:1.8;color:rgba(255,255,255,.6);margin-bottom:20px}
  .callout{font-size:14px;font-weight:700;color:#fff;margin-bottom:16px}
  /* action list */
  .action{display:flex;align-items:center;justify-content:space-between;padding:16px 0;border-bottom:1px solid rgba(255,255,255,.1)}
  .action:last-child{border-bottom:none}
  .action-title{font-size:16px;font-weight:700;color:#fff;margin-bottom:3px}
  .action-sub{font-size:13px;color:rgba(255,255,255,.45)}
  .action-arr{font-size:18px;color:rgba(255,255,255,.35)}
  /* closing CTA */
  .cta-row{padding:24px}
  /* footer */
  .foot{border-top:1px solid rgba(255,255,255,.08);padding:22px 24px;text-align:center;font-size:11px;color:rgba(255,255,255,.25);letter-spacing:.06em}
  .foot a{color:rgba(255,255,255,.25)}
</style></head><body>
${emailClientHeader({client,copy})}
<div class="wrap">
  <div class="topbar">
    <div class="tb-brand">
      ${logoUrl
        ? `<img src="${logoUrl}" alt="${client?.name||''}" style="height:32px;width:auto;object-fit:contain;display:block;filter:brightness(0) invert(1)"/>`
        : `<svg class="tb-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="10,2 18,17 2,17" fill="#5ab85a"/></svg>${client?.name||'Brand'}`
      }
    </div>
    <div class="tb-right">${copy.subjectLine||''}</div>
  </div>
  <div class="hero">${heroImg?`<img src="${heroImg}" alt="" style="object-position:${focalPos(heroObj)}"/>`:`<div class="hero-ph">Hero image</div>`}</div>
  <div class="hl-section">
    <div class="hl">${copy.headlineText||''}</div>
    ${copy.subhead?`<div class="sub">${copy.subhead}</div>`:''}
    ${copy.ctaText?`<a class="cta" href="${copy.ctaUrl||'#'}">${copy.ctaText}</a>`:''}
  </div>
  ${img1||img2?`
  <div class="mosaic">
    <div class="mos-main">${img1?`<img src="${img1}" alt="" style="object-position:${focalPos(img1Obj)}"/>`:`<div class="mos-main-ph">Image</div>`}</div>
    <div class="mos-stack">
      ${img2?`<img src="${img2}" alt="" style="object-position:${focalPos(img2Obj)}"/>`:`<div class="mos-stack-ph">Image</div>`}
      ${heroImg&&img1&&img2?`<img src="${heroImg}" alt="" style="object-position:${focalPos(heroObj)}"/>`:`<div class="mos-stack-ph">Image</div>`}
    </div>
  </div>`:''}
  <div class="partner">
    <div class="partner-badge">
      <div class="partner-icon">✦</div>
      <div class="partner-name">${client?.name||'Brand'} · Exclusive</div>
    </div>
    ${copy.bodyBlock2Title?`<div class="partner-hl">${copy.bodyBlock2Title}</div>`:''}
    ${copy.bodyText?`<div class="partner-body">${body}</div>`:''}
    ${copy.closingLine?`<div class="partner-body" style="font-style:italic">${copy.closingLine}</div>`:''}
    ${copy.bodyBlock2?`<div class="callout">Ways to get involved:</div>
    <div class="action"><div><div class="action-title">Visit</div><div class="action-sub">${copy.bodyBlock2}</div></div><div class="action-arr">→</div></div>
    <div class="action"><div><div class="action-title">Explore</div><div class="action-sub">${copy.subhead||''}</div></div><div class="action-arr">→</div></div>
    <div class="action"><div><div class="action-title">Connect</div><div class="action-sub">${client?.name||'Brand'} community</div></div><div class="action-arr">→</div></div>`:
    `<div class="action"><div><div class="action-title">Explore</div><div class="action-sub">${copy.subhead||''}</div></div><div class="action-arr">→</div></div>
    <div class="action"><div><div class="action-title">Discover</div><div class="action-sub">${client?.name||'Brand'}</div></div><div class="action-arr">→</div></div>`}
  </div>
  ${copy.ctaText?`<div class="cta-row"><a class="cta" href="${copy.ctaUrl||'#'}">${copy.ctaText}</a></div>`:''}
  ${buildFooter(client, footerData, { defaultBg: '#0d1f14' })}
</div></body></html>`
}

/* ══════════════════════════════════════════════════════════════════════════
   T7 · HERO HEADER  (Logo + full-bleed hero image + text overlay + wave)
   ══════════════════════════════════════════════════════════════════════════ */
/* ── Header bar styles (1–4) ─────────────────────────────────────── */
function buildHeaderBar(style, client) {
  const logoUrl   = client?.logoUrl || ''
  const brandName = client?.name    || 'Brand'
  const logo      = logoUrl
    ? `<img src="${logoUrl}" alt="${brandName}" style="height:56px;width:auto;object-fit:contain;position:relative;z-index:1"/>`
    : `<span style="position:relative;z-index:1;font-size:14px;letter-spacing:.28em;text-transform:uppercase;color:#fff;font-family:Arial,sans-serif;font-weight:700">${brandName}</span>`

  if (style === 1) {
    // Mountain — dark navy with layered geometric mountain silhouettes
    return `
    <div style="position:relative;line-height:0;overflow:hidden;background:#1e2e45">
      <svg viewBox="0 0 640 120" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%" preserveAspectRatio="none">
        <!-- Sky background -->
        <rect width="640" height="120" fill="#1e2e45"/>
        <!-- Far mountains (lightest) -->
        <polygon points="0,120 0,80 60,30 120,75 180,25 240,70 300,20 360,68 420,22 480,72 540,18 600,65 640,30 640,120" fill="rgba(255,255,255,0.07)"/>
        <!-- Mid mountains -->
        <polygon points="0,120 0,90 80,45 160,85 240,40 320,80 400,38 480,82 560,42 640,78 640,120" fill="rgba(255,255,255,0.10)"/>
        <!-- Near mountains (darkest overlay) -->
        <polygon points="0,120 0,100 100,62 200,95 300,58 400,92 500,55 600,88 640,68 640,120" fill="rgba(30,46,69,0.6)"/>
      </svg>
      <!-- Logo overlaid in centre -->
      <div style="position:absolute;top:18px;left:0;right:0;display:flex;justify-content:center;align-items:center;z-index:2">
        ${logoUrl
          ? `<img src="${logoUrl}" alt="${brandName}" style="height:52px;width:auto;object-fit:contain;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.5))"/>`
          : `<span style="font-size:14px;letter-spacing:.28em;text-transform:uppercase;color:#fff;font-family:Arial,sans-serif;font-weight:700;text-shadow:0 1px 6px rgba(0,0,0,0.5)">${brandName}</span>`
        }
      </div>
    </div>`
  }

  if (style === 2) {
    // Forest — clean deep green bar, logo centred, no decorations
    return `
    <div style="background:#2d5a27;padding:22px 40px;display:flex;align-items:center;justify-content:center">
      ${logo}
    </div>`
  }

  if (style === 3) {
    // Ocean/Water — dark brown with decorative lines (existing style)
    return `
    <div style="background:#3d2314;padding:22px 40px;display:flex;align-items:center;justify-content:center;position:relative">
      <div style="position:absolute;top:50%;left:24px;width:22%;height:1px;background:rgba(255,255,255,0.35)"></div>
      <div style="position:absolute;top:50%;right:24px;width:22%;height:1px;background:rgba(255,255,255,0.35)"></div>
      ${logo}
    </div>`
  }

  // style === 4 — Desert — warm terracotta with dune silhouette
  return `
  <div style="background:#b5622a;padding:0 0 0 0;position:relative;overflow:hidden">
    <div style="padding:22px 40px;display:flex;align-items:center;justify-content:center;position:relative;z-index:2">
      ${logo}
    </div>
    <svg viewBox="0 0 640 36" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%" preserveAspectRatio="none">
      <path d="M0,36 L0,22 Q80,2 160,18 Q240,34 320,16 Q400,0 480,18 Q560,34 640,20 L640,36 Z" fill="rgba(255,255,255,0.09)"/>
      <path d="M0,36 L0,28 Q100,10 200,26 Q300,40 400,22 Q500,6 640,28 L640,36 Z" fill="rgba(255,255,255,0.06)"/>
    </svg>
  </div>`
}

// imgBox accepts either a plain URL string or an image object {url, focalX, focalY}
function imgBox(imgOrUrl, w, h, label='Image', radius='0') {
  const url = typeof imgOrUrl === 'string' ? imgOrUrl : imgOrUrl?.url
  const pos = typeof imgOrUrl === 'string' ? '50% 50%' : focalPos(imgOrUrl)
  return url
    ? `<img src="${url}" alt="" style="width:${w};height:${h}px;object-fit:cover;display:block;border-radius:${radius};object-position:${pos}"/>`
    : `<div style="width:${w};height:${h}px;background:#e0dbd4;border-radius:${radius};display:flex;align-items:center;justify-content:center;font-size:12px;color:#aaa;font-family:Arial,sans-serif">${label}</div>`
}

// buildImageSection accepts full image objects (with focalX/focalY) so centering is automatic
function buildImageSection(imageStyle, sub1Obj, sub2Obj, sub3Obj, sub4Obj, theme = {}) {
  const sub1Img = sub1Obj?.url || (typeof sub1Obj === 'string' ? sub1Obj : '')
  const sub2Img = sub2Obj?.url || (typeof sub2Obj === 'string' ? sub2Obj : '')
  const bg  = theme.bg  || '#ffffff'
  const fav = theme.fav || '#b07a50'
  if (imageStyle === 1) {
    // Style 1 — Spacious 2×2 grid with rounded corners
    const imgs = [sub1Obj, sub2Obj, sub3Obj, sub4Obj]
    if (imgs.every(i => !i)) return ''
    return `
  <!-- Spacious 2x2 grid -->
  <div style="background:${bg};padding:8px 20px 36px">
    <div style="display:flex;gap:10px;margin-bottom:10px">
      <div style="flex:1;overflow:hidden;border-radius:14px">${imgBox(imgs[0], '100%', 195, 'Image 1', '14px')}</div>
      <div style="flex:1;overflow:hidden;border-radius:14px">${imgBox(imgs[1], '100%', 195, 'Image 2', '14px')}</div>
    </div>
    <div style="display:flex;gap:10px">
      <div style="flex:1;overflow:hidden;border-radius:14px">${imgBox(imgs[2], '100%', 195, 'Image 3', '14px')}</div>
      <div style="flex:1;overflow:hidden;border-radius:14px">${imgBox(imgs[3], '100%', 195, 'Image 4', '14px')}</div>
    </div>
  </div>`
  }

  if (imageStyle === 2) {
    if (!sub1Img && !sub2Img) return ''
    return `
  <!-- Polaroid collage -->
  <div style="background:${bg};padding:40px 32px 36px">
    <div style="display:flex;align-items:flex-start;justify-content:center;gap:24px">
      <div style="background:#fff;padding:10px 10px 36px;box-shadow:0 4px 20px rgba(0,0,0,0.18);flex:1;max-width:260px;transform:rotate(-4deg);margin-top:20px">
        ${sub1Img ? `<img src="${sub1Img}" alt="" style="display:block;width:100%;height:190px;object-fit:cover;object-position:${focalPos(sub1Obj)}"/>` : `<div style="width:100%;height:190px;background:#ddd;display:flex;align-items:center;justify-content:center;font-size:12px;color:#aaa;font-family:Arial,sans-serif">Image</div>`}
      </div>
      <div style="background:#fff;padding:10px 10px 36px;box-shadow:0 4px 20px rgba(0,0,0,0.18);flex:1;max-width:260px;transform:rotate(3deg)">
        ${sub2Img ? `<img src="${sub2Img}" alt="" style="display:block;width:100%;height:190px;object-fit:cover;object-position:${focalPos(sub2Obj)}"/>` : `<div style="width:100%;height:190px;background:#ddd;display:flex;align-items:center;justify-content:center;font-size:12px;color:#aaa;font-family:Arial,sans-serif">Image</div>`}
      </div>
    </div>
    <div style="margin-top:28px;text-align:center;font-family:'Dancing Script',cursive,'Brush Script MT',cursive;font-size:32px;color:${fav};line-height:1.2">Favorite<br>Memories</div>
  </div>`
  }

  if (imageStyle === 3) {
    if (!sub1Img && !sub2Img) return ''
    return `
  <!-- Overlapping tilted photos -->
  <div style="background:${bg};padding:48px 40px 48px;text-align:center">
    <div style="position:relative;height:260px;display:flex;align-items:center;justify-content:center">
      <div style="position:absolute;left:30px;top:10px;width:260px;height:220px;transform:rotate(-8deg);border-radius:6px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,0.22)">
        ${sub1Img ? `<img src="${sub1Img}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;object-position:${focalPos(sub1Obj)}"/>` : `<div style="width:100%;height:100%;background:#ccc;display:flex;align-items:center;justify-content:center;font-size:12px;color:#aaa;font-family:Arial,sans-serif">Image 1</div>`}
      </div>
      <div style="position:absolute;right:30px;top:10px;width:260px;height:220px;transform:rotate(7deg);border-radius:6px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.28)">
        ${sub2Img ? `<img src="${sub2Img}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;object-position:${focalPos(sub2Obj)}"/>` : `<div style="width:100%;height:100%;background:#ccc;display:flex;align-items:center;justify-content:center;font-size:12px;color:#aaa;font-family:Arial,sans-serif">Image 2</div>`}
      </div>
    </div>
  </div>`
  }

  // Style 4 — Circle backdrop + tilted photo card
  if (!sub1Img) return ''
  return `
  <!-- Circle background + tilted photo card -->
  <div style="background:${bg};padding:32px 0 40px;display:flex;justify-content:center;align-items:center;position:relative;overflow:hidden">
    <div style="position:absolute;width:380px;height:380px;border-radius:50%;background:rgba(217,228,234,0.35);top:50%;left:50%;transform:translate(-50%,-50%)"></div>
    <div style="position:relative;z-index:1;transform:rotate(-4deg);background:#fff;padding:10px;border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,0.22);width:300px">
      <img src="${sub1Img}" alt="" style="width:100%;height:300px;object-fit:cover;display:block;border-radius:8px;object-position:${focalPos(sub1Obj)}"/>
    </div>
  </div>`
}

function buildTemplateHero({ client, copy, images, headerStyle = 3, imageStyle = 2, footerData }) {
  const heroObj  = images?.[0]
  const sub1Obj  = images?.[1]
  const sub2Obj  = images?.[2]
  const sub3Obj  = images?.[3]
  const sub4Obj  = images?.[4]
  const heroImg  = heroObj?.url || ''
  const logoUrl  = client?.logoUrl  || ''
  const headline = copy.headlineText || ''
  const subhead  = copy.subhead      || ''
  const ctaText  = copy.ctaText      || ''
  const ctaUrl   = copy.ctaUrl       || '#'
  const body     = (copy.bodyText    || '').replace(/\n/g, '<br>')
  const b2title  = copy.bodyBlock2Title || ''
  const b2body   = (copy.bodyBlock2  || '').replace(/\n/g, '<br>')
  const closing  = copy.closingLine  || ''

  // Per-style colour theme applied to the body section below the hero
  const theme = {
    1: { bg: '#1e2e45', text: '#f0ece4', subtext: 'rgba(240,236,228,0.75)', cta: '#c9a84c', ctaText: '#1e2e45', wave: '#1e2e45', fav: '#c9a84c' },
    2: { bg: '#ffffff', text: '#2d2d2d', subtext: '#555',                   cta: '#2d5a27', ctaText: '#fff',    wave: '#ffffff', fav: '#b07a50' },
    3: { bg: '#ffffff', text: '#2d2d2d', subtext: '#555',                   cta: '#3d2314', ctaText: '#fff',    wave: '#ffffff', fav: '#b07a50' },
    4: { bg: '#2e1208', text: '#f5ede6', subtext: 'rgba(245,237,230,0.75)', cta: '#b5622a', ctaText: '#fff',    wave: '#2e1208', fav: '#d4956a' },
  }[headerStyle] || { bg: '#ffffff', text: '#2d2d2d', subtext: '#555', cta: '#3d2314', ctaText: '#fff', wave: '#ffffff', fav: '#b07a50' }

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;900&family=Dancing+Script:wght@600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#f5f5f5;font-family:'Georgia',serif}
  .wrap{max-width:640px;margin:0 auto;background:${theme.bg}}
  /* ── logo bar ── */
  .logo-bar{
    background:#3d2314;
    padding:22px 40px;
    display:flex;align-items:center;justify-content:center;
    position:relative;
  }
  .logo-bar::before,.logo-bar::after{
    content:'';position:absolute;top:50%;
    width:22%;height:1px;background:rgba(255,255,255,0.35);
  }
  .logo-bar::before{left:24px}
  .logo-bar::after{right:24px}
  .logo-bar img{height:64px;width:auto;object-fit:contain;position:relative;z-index:1}
  .logo-bar .brand-text{
    font-size:15px;letter-spacing:.28em;text-transform:uppercase;
    color:#fff;font-family:Arial,sans-serif;font-weight:700;
    position:relative;z-index:1;
  }
  /* ── hero ── */
  .hero-wrap{position:relative;line-height:0}
  .hero-wrap img{width:100%;height:580px;object-fit:cover;display:block}
  .hero-ph{width:100%;height:580px;background:#c8b8a2;display:flex;align-items:center;justify-content:center;color:#8a7a68;font-family:Arial,sans-serif;font-size:13px}
  /* overlay */
  .hero-overlay{
    position:absolute;top:0;left:0;right:0;bottom:0;
    background:linear-gradient(to bottom, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.35) 100%);
    display:flex;flex-direction:column;align-items:center;justify-content:space-between;
    padding:28px 40px 52px;text-align:center;box-sizing:border-box;
  }
  .hero-logo{
    height:36px;width:auto;max-width:120px;object-fit:contain;
    filter:drop-shadow(0 1px 6px rgba(0,0,0,0.5));
  }
  .hero-logo-text{
    font-size:14px;letter-spacing:.28em;text-transform:uppercase;
    color:#fff;font-family:Arial,sans-serif;font-weight:700;
    text-shadow:0 1px 8px rgba(0,0,0,0.6);
  }
  .hero-headline{
    font-size:34px;font-weight:900;line-height:1.2;
    color:#fff;font-family:'Playfair Display',Georgia,serif;
    text-shadow:0 2px 20px rgba(0,0,0,0.7);
    letter-spacing:-0.3px;
  }
  /* wave */
  .wave-wrap{position:absolute;bottom:-1px;left:0;right:0;line-height:0}
  .wave-wrap svg{display:block;width:100%}
  /* ── subhead + CTA block ── */
  .sub-cta{padding:36px 48px 32px;text-align:center}
  .subhead{
    font-size:18px;line-height:1.6;color:#2d2d2d;
    font-family:'Georgia',serif;margin-bottom:28px;
  }
  .cta-btn{
    display:inline-block;
    padding:14px 36px;
    background:#3d2314;color:#fff;
    font-family:Arial,sans-serif;font-size:15px;font-weight:700;
    text-decoration:none;border-radius:6px;
    letter-spacing:.04em;
  }
  /* ── body text ── */
  .body-block{padding:0 48px 32px;font-size:15px;line-height:1.75;color:#333;font-family:'Georgia',serif}
  .body-block p{margin-bottom:16px}
  .b2title{font-size:15px;font-weight:700;color:#1a1a1a;margin-bottom:8px;font-family:'Georgia',serif}
  /* ── polaroid gallery ── */
  .gallery-wrap{
    padding:40px 32px 36px;
    background:#faf9f7;
  }
  .gallery-row{
    display:flex;align-items:flex-start;justify-content:center;gap:24px;
  }
  .polaroid{
    background:#fff;
    padding:10px 10px 36px;
    box-shadow:0 4px 20px rgba(0,0,0,0.18);
    flex:1;max-width:260px;
  }
  .polaroid img{display:block;width:100%;height:190px;object-fit:cover}
  .polaroid-ph{width:100%;height:190px;background:#ddd;display:flex;align-items:center;justify-content:center;font-size:12px;color:#aaa;font-family:Arial,sans-serif}
  .p1{transform:rotate(-4deg);margin-top:20px}
  .p2{transform:rotate(3deg)}
  .fav-label{
    margin-top:28px;text-align:center;
    font-family:'Dancing Script',cursive,'Brush Script MT',cursive;
    font-size:32px;color:#b07a50;line-height:1.2;
  }
  /* ── closing block ── */
  .closing-block{padding:36px 48px 32px;text-align:center}
  .b2-title{font-size:17px;font-weight:700;color:#1a1a1a;font-family:'Georgia',serif;margin-bottom:18px}
  .b2-body{font-size:15px;line-height:1.75;color:#333;font-family:'Georgia',serif;margin-bottom:24px;text-align:left}
  .closing-line{font-size:15px;line-height:1.7;color:#333;font-family:'Georgia',serif;margin-bottom:28px;text-align:left}
  /* footer */
  .foot{background:#3d2314;padding:20px 40px;text-align:center;font-size:10px;color:#a08070;font-family:Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase}
  .foot a{color:#a08070}
</style></head><body>
${emailClientHeader({ client, copy })}
<div class="wrap">

  <!-- Hero image + overlay (logo top, headline bottom) -->
  <div class="hero-wrap">
    ${heroImg
      ? `<img src="${heroImg}" alt="" style="width:100%;height:580px;object-fit:cover;display:block;object-position:${focalPos(heroObj)}"/>`
      : `<div class="hero-ph">Hero image will appear here</div>`
    }
    <div class="hero-overlay" style="
      position:absolute;top:0;left:0;right:0;bottom:0;box-sizing:border-box;
      display:flex;flex-direction:column;align-items:center;padding:28px 40px 52px;text-align:center;
      justify-content:space-between;
      background:${
        headerStyle === 1 ? 'linear-gradient(to bottom, rgba(30,46,69,0.55) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.4) 100%)' :
        headerStyle === 2 ? 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.28) 45%, rgba(0,0,0,0.1) 75%, rgba(0,0,0,0) 100%)' :
        headerStyle === 4 ? 'linear-gradient(to bottom, rgba(181,98,42,0.5) 0%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.45) 100%)' :
        'linear-gradient(to bottom, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.45) 100%)'
      }">
      ${logoUrl
        ? `<img src="${logoUrl}" alt="${client?.name||''}" style="height:44px;width:auto;max-width:160px;object-fit:contain;display:block;filter:drop-shadow(0 1px 6px rgba(0,0,0,0.5))"/>`
        : `<span style="font-size:14px;letter-spacing:.28em;text-transform:uppercase;color:#fff;font-family:Arial,sans-serif;font-weight:700;text-shadow:0 1px 8px rgba(0,0,0,0.6)">${client?.name||''}</span>`
      }
      ${headline ? `<div style="font-size:34px;font-weight:900;line-height:1.2;color:#fff;font-family:'Playfair Display',Georgia,serif;text-shadow:0 2px 20px rgba(0,0,0,0.7);letter-spacing:-0.3px;text-align:center;padding:0 8px${headerStyle === 2 ? ';margin-bottom:60px' : ''}">${headline}</div>` : ''}
    </div>
    <!-- Wave / tree cutout at bottom -->
    <div class="wave-wrap">
      ${headerStyle === 1
        ? `<svg viewBox="0 0 640 60" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"><path d="M0,60 L0,30 C80,55 160,10 240,32 C320,54 400,8 480,28 C560,48 610,15 640,26 L640,60 Z" fill="${theme.wave}"/><path d="M0,30 C80,55 160,10 240,32 C320,54 400,8 480,28 C560,48 610,15 640,26" fill="none" stroke="#ffffff" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg>`
        : headerStyle === 2
        ? `<svg viewBox="0 0 640 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style="overflow:visible"><path d="M0,30 Q320,120 640,30 L640,100 L0,100 Z" fill="${theme.wave}"/></svg>`
        : headerStyle === 4
        ? ``
        : `<svg viewBox="0 0 640 40" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"><path d="M0,20 C80,40 160,0 240,20 C320,40 400,0 480,20 C560,40 620,10 640,20 L640,40 L0,40 Z" fill="${theme.wave}"/></svg>`
      }
    </div>
  </div>

  <!-- Subhead + first CTA — themed background -->
  ${(subhead || ctaText) ? `
  <div style="background:${theme.bg};padding:36px 48px 40px;text-align:center">
    ${subhead ? `<p style="font-size:18px;line-height:1.6;color:${theme.text};font-family:'Georgia',serif;margin-bottom:28px">${subhead}</p>` : ''}
    ${ctaText ? `<a href="${ctaUrl}" style="display:inline-block;padding:14px 36px;background:${theme.cta};color:${theme.ctaText};font-family:Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;border-radius:6px;letter-spacing:.04em">${ctaText} →</a>` : ''}
  </div>` : ''}

  <!-- Body, images, closing — themed bg (white for Desert, theme color for others) -->
  <div style="background:${headerStyle === 4 ? '#ffffff' : theme.bg};padding-bottom:8px">

    <!-- Body text -->
    ${body ? `
    <div style="padding:36px 48px 32px;font-size:15px;line-height:1.75;color:${headerStyle === 4 ? '#555' : theme.subtext};font-family:'Georgia',serif">
      <p>${body}</p>
    </div>` : ''}

    ${buildImageSection(imageStyle, sub1Obj, sub2Obj, sub3Obj, sub4Obj, headerStyle === 4 ? { ...theme, bg: '#ffffff' } : theme)}

    <!-- Closing block -->
    ${(b2title || b2body || closing || ctaText) ? `
    <div style="padding:36px 48px 32px;text-align:center">
      ${b2title ? `<p style="font-size:17px;font-weight:700;color:${headerStyle === 4 ? '#2d2d2d' : theme.text};font-family:'Georgia',serif;margin-bottom:18px">${b2title}</p>` : ''}
      ${b2body  ? `<p style="font-size:15px;line-height:1.75;color:${headerStyle === 4 ? '#555' : theme.subtext};font-family:'Georgia',serif;margin-bottom:24px;text-align:left">${b2body}</p>` : ''}
      ${closing ? `<p style="font-size:15px;line-height:1.7;color:${headerStyle === 4 ? '#555' : theme.subtext};font-family:'Georgia',serif;margin-bottom:28px;text-align:left">${closing}</p>` : ''}
      ${ctaText ? `<a href="${ctaUrl}" style="display:inline-block;padding:14px 36px;background:${theme.cta};color:${theme.ctaText};font-family:Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;border-radius:6px;letter-spacing:.04em">${ctaText} →</a>` : ''}
    </div>` : ''}

  </div>

  ${buildFooter(client, footerData, { defaultBg: theme.bg === '#ffffff' ? '#3d2314' : theme.bg })}

</div></body></html>`
}

/* ══════════════════════════════════════════════════════════════════════════
   WEEK 1 — Getaway HTML skeleton + 70 / 20 / 10 brand colours
   Exact same nested-table / gmail_fix / blockSides structure as reference.
   Image slices replaced with real HTML text blocks.

   BG Color (70%)       = bg70  → page canvas, content sections
   Secondary Color (20%)= sec20 → header bar + footer band
   Button Color (10%)   = btn10 → CTA buttons + eyebrow accent only
   ══════════════════════════════════════════════════════════════════════════ */
function buildTemplateWeek1({ client, copy, images, footerData, heroScale=1, heroX=0, heroY=0, textSize=22, textTop=110, textLeft=48, logoColor='original', logoTop=36, logoRight=220, logoSize=56 }) {
  const heroObj  = images?.[0]
  const img1Obj  = images?.[1]
  const img2Obj  = images?.[2]
  const img3Obj  = images?.[3]
  const heroImg  = heroObj?.url || ''
  const img1     = img1Obj?.url || ''
  const img2     = img2Obj?.url || ''
  const img3     = img3Obj?.url || ''
  const body     = (copy.bodyText   || '').replace(/\n/g, '<br>')
  const b2body   = (copy.bodyBlock2 || '').replace(/\n/g, '<br>')
  const logoUrl  = client?.logoUrl  || ''
  const name     = client?.name     || 'Brand'

  // ── 70 / 20 / 10 palette ─────────────────────────────────────────────
  // pageBg = fixed neutral — ONLY the preview/page wrapper outside the email
  // bg70   = client brand BG color — fills content sections inside the 600px column
  // sec20  = accent band (section header + image strip)
  // btn10  = CTA buttons + eyebrow only
  const fd     = footerData || {}
  const pageBg = '#f5f2ec'              // always neutral outside the email
  const bg70   = fd.bgColor        || '#f5f0e8'
  const sec20  = fd.secondaryColor || '#2d4a35'
  const btn10  = fd.buttonColor    || '#e85d26'

  const onSec  = textOn(sec20)
  const muSec  = mutedOn(sec20)
  const onBtn  = textOn(btn10)
  const muBg   = mutedOn(bg70)
  const onBg   = textOn(bg70)
  const muBg2  = textOn(bg70) === '#1a1a1a' ? 'rgba(26,26,26,0.7)' : 'rgba(255,255,255,0.7)'

  // ── social icons ──────────────────────────────────────────────────────
  const CDN = 'https://storage.googleapis.com/preview-production-assets/email/img/hl_default_img/social'
  const socials = [
    { url: fd.facebookUrl,  img: `${CDN}/facebook_circle_grey.png`,  label: 'Facebook'  },
    { url: fd.instagramUrl, img: `${CDN}/instagram_circle_grey.png`, label: 'Instagram' },
    { url: fd.tiktokUrl,    img: `${CDN}/tiktok_circle_grey.png`,    label: 'TikTok'    },
  ].filter(s => s.url)

  // ── logo overlay ──────────────────────────────────────────────────────────
  const w1LogoFilter = logoColor === 'white' ? 'brightness(0) invert(1)' : logoColor === 'black' ? 'brightness(0)' : 'none'
  const logoOverlay = logoUrl
    ? `<img src="${logoUrl}" alt="${name}" border="0" style="display:block;height:${logoSize}px;width:auto;max-width:240px;filter:${w1LogoFilter};"/>`
    : `<span style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#fff;">${name}</span>`

  const hasB2 = !!(copy.bodyBlock2Title || b2body || copy.closingLine)
  // How many images for strip
  const stripImgs = [img1, img2, img3].filter(Boolean)

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title></title>
  <meta name="format-detection" content="telephone=no">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <style type="text/css">
    * { margin-top:0;margin-bottom:0;padding:0;border:none;outline:none;-webkit-text-size-adjust:none; }
    body { margin:0!important;padding:0!important;width:100%!important;-webkit-text-size-adjust:100%!important;-ms-text-size-adjust:100%!important;-webkit-font-smoothing:antialiased!important;background-color:${pageBg}!important; }
    img { border:0!important;display:block!important;outline:none!important; }
    table { border-collapse:collapse;mso-table-lspace:0px;mso-table-rspace:0px; }
    td { border-collapse:collapse;mso-line-height-rule:exactly; }
    a { text-decoration:none; }
    .ExternalClass { width:100%;line-height:100%; }
    a[x-apple-data-detectors] { color:inherit!important;text-decoration:none!important;font-size:inherit!important;font-family:inherit!important;font-weight:inherit!important;line-height:inherit!important; }
    @media only screen and (max-width:600px) {
      .gmail_fix { width:100%!important;min-width:320px!important; }
      .mobile_cta { width:75%!important;max-width:75%!important; }
    }
    @media only screen and (max-width:520px) {
      .mobile_img  { width:100%!important;height:auto!important; }
      .blockSides  { width:20px!important; }
      .col3        { width:100%!important;display:block!important; }
      .txt_12 { font-size:12px!important;line-height:16px!important; }
      .txt_14 { font-size:14px!important;line-height:20px!important; }
      .txt_18 { font-size:18px!important;line-height:24px!important; }
      .txt_22 { font-size:22px!important;line-height:28px!important; }
      .txt_26 { font-size:26px!important;line-height:32px!important; }
    }
  </style>
  <!--[if mso]><style>body,table,td,a,span{font-family:Arial,sans-serif!important}</style><![endif]-->
  <!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${pageBg};">

  <!-- Preheader (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:${pageBg};">${copy.previewText || ''}&#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847;</div>

  <!-- ===== BLOCK: Hero ===== -->
  <!-- Full-width image, gradient at top, logo + small headline overlaid -->
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="${pageBg}">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" class="gmail_fix">
        <tr>
          <td style="padding:0;font-size:0;line-height:0;position:relative;background:${sec20};height:560px;">
            <!-- Pan/zoom wrapper clips the image -->
            <div style="position:absolute;top:0;left:0;right:0;bottom:0;overflow:hidden;">
              ${heroImg
                ? `<img src="${heroImg}" border="0" alt="" style="position:absolute;width:${heroScale*100}%;height:${heroScale*100}%;min-width:100%;min-height:100%;object-fit:cover;display:block;left:50%;top:50%;transform:translate(calc(-50% + ${heroX}px),calc(-50% + ${heroY}px));">`
                : `<div style="width:100%;height:100%;background:${sec20};"></div>`}
            </div>
            <!-- Gradient overlay -->
            <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:linear-gradient(to bottom,rgba(0,0,0,0.55) 0%,rgba(0,0,0,0.18) 45%,rgba(0,0,0,0.0) 100%);pointer-events:none;"></div>
            <!-- Logo -->
            <div style="position:absolute;top:${logoTop}px;right:${logoRight}px;z-index:2;">${logoOverlay}</div>
            <!-- Headline -->
            <div style="position:absolute;top:${textTop}px;left:${textLeft}px;right:48px;z-index:2;">
              <div style="font-family:Arial,sans-serif;font-size:${textSize}px;line-height:1.3;font-weight:800;color:#ffffff;text-shadow:0 1px 10px rgba(0,0,0,0.5);letter-spacing:-0.2px;text-align:center;" class="txt_18">${copy.headlineText || ''}</div>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
  <!-- end BLOCK: Hero -->

  <!-- ===== BLOCK: subhead + CTA + body (bg70) ===== -->
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="${pageBg}">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" class="gmail_fix">
        <tr>
          <td bgcolor="${bg70}">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td width="60" class="blockSides">&nbsp;</td>
                <td align="center">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td height="48">&nbsp;</td></tr>

                    ${copy.subhead ? `<tr>
                      <td align="center" style="font-family:Arial,sans-serif;font-size:17px;line-height:27px;font-weight:700;color:${onBg};padding-bottom:22px;" class="txt_14">${copy.subhead}</td>
                    </tr>` : ''}

                    ${copy.ctaText ? `<tr>
                      <td align="center" style="padding-bottom:28px;">
                        <table cellpadding="0" cellspacing="0" class="mobile_cta">
                          <tr>
                            <td bgcolor="${btn10}" align="center" style="border-radius:30px;">
                              <a href="${copy.ctaUrl || '#'}" target="_blank" style="display:inline-block;padding:15px 44px;font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:${onBtn};text-decoration:none;border-radius:30px;letter-spacing:.04em;">${copy.ctaText}</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>` : ''}

                    ${body ? `<tr>
                      <td align="left" style="font-family:Arial,sans-serif;font-size:15px;line-height:26px;font-weight:400;color:${muBg2};padding-bottom:48px;" class="txt_14">${body}</td>
                    </tr>` : ''}

                  </table>
                </td>
              <td width="60" class="blockSides">&nbsp;</td></tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
  <!-- end BLOCK: subhead + CTA + body -->

  ${(copy.bodyBlock2Title || stripImgs.length || b2body || copy.closingLine) ? `
  <!-- ===== BLOCK: sec20 band — title + images + body2 + closing + CTA ===== -->
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="${pageBg}">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" class="gmail_fix">
        <tr>
          <td bgcolor="${sec20}">
            <table width="100%" cellpadding="0" cellspacing="0">

              ${copy.bodyBlock2Title ? `<tr>
                <td align="center" style="padding:44px 48px 36px;">
                  <div style="font-family:Arial,sans-serif;font-size:26px;line-height:34px;font-weight:800;color:${onSec};letter-spacing:-0.3px;" class="txt_22">${copy.bodyBlock2Title}</div>
                </td>
              </tr>` : ''}

              ${stripImgs.length ? `<tr>
                <td align="center" style="padding:10px 0 40px;position:relative;">
                  ${stripImgs.length === 1 ? `
                    <img src="${stripImgs[0]}" width="520" border="0" style="width:87%;height:280px;object-fit:cover;display:block;border-radius:14px;margin:0 auto;object-position:${focalPos(img1Obj)};box-shadow:0 8px 32px rgba(0,0,0,0.35);" alt="">
                  ` : stripImgs.length === 2 ? `
                    <div style="position:relative;height:260px;width:100%;">
                      <img src="${stripImgs[0]}" border="0" style="position:absolute;left:40px;top:16px;width:44%;height:220px;object-fit:cover;border-radius:12px;transform:rotate(-3deg);box-shadow:0 6px 20px rgba(0,0,0,0.35);object-position:${focalPos(img1Obj)};" alt="">
                      <img src="${stripImgs[1]}" border="0" style="position:absolute;right:40px;top:0;width:44%;height:220px;object-fit:cover;border-radius:12px;transform:rotate(3deg);box-shadow:0 6px 20px rgba(0,0,0,0.35);object-position:${focalPos(img2Obj)};" alt="">
                    </div>
                  ` : `
                    <div style="position:relative;height:280px;width:100%;">
                      <img src="${stripImgs[0]}" border="0" style="position:absolute;left:20px;top:24px;width:38%;height:240px;object-fit:cover;border-radius:12px;transform:rotate(-5deg);box-shadow:0 6px 24px rgba(0,0,0,0.4);object-position:${focalPos(img1Obj)};" alt="">
                      <img src="${stripImgs[1]}" border="0" style="position:absolute;left:50%;top:10px;width:38%;height:240px;object-fit:cover;border-radius:12px;transform:translateX(-50%);box-shadow:0 8px 28px rgba(0,0,0,0.45);object-position:${focalPos(img2Obj)};" alt="">
                      <img src="${stripImgs[2]}" border="0" style="position:absolute;right:20px;top:24px;width:38%;height:240px;object-fit:cover;border-radius:12px;transform:rotate(5deg);box-shadow:0 6px 24px rgba(0,0,0,0.4);object-position:${focalPos(img3Obj)};" alt="">
                    </div>
                  `}
                </td>
              </tr>` : ''}

              ${(b2body || copy.closingLine || copy.ctaText) ? `<tr>
                <td>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td width="60" class="blockSides">&nbsp;</td>
                      <td align="center">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr><td height="8">&nbsp;</td></tr>

                          ${b2body ? `<tr>
                            <td align="center" style="font-family:Arial,sans-serif;font-size:15px;line-height:26px;font-weight:400;color:#ffffff;padding-bottom:20px;" class="txt_14">${b2body}</td>
                          </tr>` : ''}

                          ${copy.closingLine ? `<tr>
                            <td align="center" style="font-family:Arial,sans-serif;font-size:14px;line-height:22px;font-weight:700;color:#ffffff;padding-bottom:28px;" class="txt_12">${copy.closingLine}</td>
                          </tr>` : ''}

                          ${copy.ctaText ? `<tr>
                            <td align="center" style="padding-bottom:48px;">
                              <table cellpadding="0" cellspacing="0" class="mobile_cta">
                                <tr>
                                  <td bgcolor="${btn10}" align="center" style="border-radius:30px;">
                                    <a href="${copy.ctaUrl || '#'}" target="_blank" style="display:inline-block;padding:15px 44px;font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:${onBtn};text-decoration:none;border-radius:30px;letter-spacing:.04em;">${copy.ctaText}</a>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>` : ''}

                        </table>
                      </td>
                    <td width="60" class="blockSides">&nbsp;</td></tr>
                  </table>
                </td>
              </tr>` : ''}

            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
  <!-- end BLOCK: sec20 band -->` : ''}

  <!-- ===== BLOCK: Social ===== -->
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="${pageBg}">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" class="gmail_fix">
        <tr>
          <td bgcolor="${bg70}" align="center" style="padding:28px 40px 10px;">
            ${socials.length ? `<table cellpadding="0" cellspacing="0" align="center">
              <tr>
                ${socials.map((s, i) => `${i > 0 ? '<td width="12">&nbsp;</td>' : ''}<td><a href="${s.url}" target="_blank"><img src="${s.img}" width="28" height="28" border="0" style="display:block;border-radius:50%;" alt="${s.label}"></a></td>`).join('')}
              </tr>
            </table>` : ''}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
  <!-- end BLOCK: Social -->

  <!-- ===== BLOCK: Fine Print + Footer ===== -->
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="${pageBg}">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" class="gmail_fix">
        <tr>
          <td bgcolor="${bg70}" align="center" style="padding:12px 80px 32px;" class="paddingsides_20">
            ${fd.footerText ? `<p style="font-family:Arial,sans-serif;font-size:11px;line-height:17px;color:${muBg};margin-bottom:16px;">${fd.footerText}</p>` : ''}
            <p style="font-family:Arial,sans-serif;font-size:11px;line-height:18px;color:${muBg};margin-bottom:4px;">
              <a href="{{email.view_in_browser_url}}" style="color:${muBg};text-decoration:underline;">View in browser</a>
              &nbsp;&nbsp;·&nbsp;&nbsp;
              <a href="{{email.unsubscribe_link}}" style="color:${muBg};text-decoration:underline;">Unsubscribe</a>
            </p>
            ${fd.contactInfo ? `<p style="font-family:Arial,sans-serif;font-size:11px;line-height:18px;color:${muBg};margin-top:6px;">${fd.contactInfo}</p>` : ''}
            <p style="font-family:Arial,sans-serif;font-size:11px;line-height:18px;color:${muBg};margin-top:6px;font-weight:700;letter-spacing:.1em;">${name}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
  <!-- end BLOCK: Fine Print -->

</body>
</html>`
}

/* ══════════════════════════════════════════════════════════════════════════
   WEEK 4 · Three property cards (Wander-style)
   White cards · stacked same-image effect · serif title · pill CTA
   ══════════════════════════════════════════════════════════════════════════ */

function w4StackedImage(imgUrl, imgObj, height = 460) {
  if (!imgUrl) return ''
  const fp = imgObj?.focalX != null ? `${imgObj.focalX}% ${imgObj.focalY}%` : '50% 50%'
  // Extra padding so rotated corners aren't clipped
  return `
  <div style="position:relative;height:${height + 48}px;padding:24px;">
    <!-- Back card: offset + rotated so it peeks clearly on all 4 sides -->
    <div style="position:absolute;top:24px;left:24px;right:24px;bottom:24px;border-radius:16px;overflow:hidden;transform:rotate(5deg);transform-origin:center;background:#d4d8dd;">
      <img src="${imgUrl}" alt="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:${fp};opacity:0.45;display:block;"/>
    </div>
    <!-- Front card -->
    <div style="position:absolute;top:24px;left:24px;right:24px;bottom:24px;border-radius:16px;overflow:hidden;z-index:1;">
      <img src="${imgUrl}" alt="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:${fp};display:block;"/>
    </div>
  </div>`
}

function w4Card({ imgUrl, imgObj, bodyText, isLast }) {
  const body = (bodyText||'').replace(/\n/g,'<br>')
  const W = 'background-color:#ffffff;background-image:linear-gradient(to top,#ffffff 0%,#ffffff 100%)'
  return `
    <tr><td class="gmailfix" style="padding:28px 72px 8px;${W};line-height:0;font-size:0;">
      ${w4StackedImage(imgUrl, imgObj)}
    </td></tr>
    ${body ? `
    <tr><td class="gmailfix" style="padding:24px 52px ${isLast ? '40px' : '32px'};${W};text-align:center;">
      <p style="font-family:Arial,sans-serif;font-size:17px;color:#878787;line-height:1.85;margin:0;">${body}</p>
    </td></tr>` : ''}`
}

function buildTemplateWeek4({ client, copy, images, footerData, isHeroGenerated = false,
  heroScale=1, heroX=0, heroY=0,
  textSize=38, textTop=20, textLeft=48,
  logoColor='white', logoTop=40, logoRight=36, logoSize=44,
}) {
  // images[0] = hero (or hero PNG when generated), images[1-3] = card photos
  // images[4] = card1 stacked PNG (when generated), images[5] = card2 stacked PNG (when generated)
  const heroObj = images?.[0]; const heroImg = heroObj?.url||''
  const img1Obj = images?.[1]; const img1 = img1Obj?.url || heroImg
  const img2Obj = images?.[2]; const img2 = img2Obj?.url || heroImg
  const img3Obj = images?.[3]; const img3 = img3Obj?.url || heroImg
  const eff1Obj = img1Obj?.url ? img1Obj : heroObj
  const eff2Obj = img2Obj?.url ? img2Obj : heroObj
  const eff3Obj = img3Obj?.url ? img3Obj : heroObj
  const card1PngUrl = images?.[4]?.url || null
  const card2PngUrl = images?.[5]?.url || null

  const pageBg    = footerData?.bgColor || '#f5f4f2'
  const logoUrl   = client?.logoUrl||''
  const name      = client?.name||''
  const location  = name
  const accent    = footerData?.buttonColor || '#1a1a1a'
  const secondary = footerData?.secondaryColor || accent
  const logoFilter = logoColor === 'white' ? 'brightness(0) invert(1)' : logoColor === 'black' ? 'brightness(0)' : 'none'

  const WHITE_BG = 'background-color:#ffffff;background-image:linear-gradient(to top,#ffffff 0%,#ffffff 100%)'
  const PAGE_BG  = `background-color:${pageBg};background-image:linear-gradient(to top,${pageBg} 0%,${pageBg} 100%)`

  // Logo — white version for dark hero overlay, dark version for cards below
  const logoHeroHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${name}" style="height:${logoSize}px;width:auto;max-width:${logoSize * 5}px;display:inline-block;filter:${logoFilter};"/>`
    : `<span style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#fff;">${name}</span>`

  const cards = [
    { imgUrl:img1, imgObj:eff1Obj, bodyText:copy.bodyText||'' },
    { imgUrl:img2, imgObj:eff2Obj, bodyText:copy.bodyBlock2||'' },
    { imgUrl:img3, imgObj:eff3Obj, bodyText:copy.closingLine||copy.bodyText||'', isLast:true },
  ]

  return `<!DOCTYPE html><html lang="en" style="color-scheme:light"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<style>
  :root{color-scheme:light;supported-color-schemes:light}
  *{box-sizing:border-box;margin:0;padding:0}
  body{${PAGE_BG};color:#1a1a1a;}
  table{border-collapse:collapse;}
  u + .body .gmailfix { background-color:#ffffff!important; background-image:linear-gradient(to top,#ffffff 0%,#ffffff 100%)!important; }
  u + .body .gmailfix-page { background-color:${pageBg}!important; background-image:linear-gradient(to top,${pageBg} 0%,${pageBg} 100%)!important; }
  u + .body .gmailtext-dark  { color:#1a1a1a!important; }
  u + .body .gmailtext-muted { color:#555!important; }
  @media (prefers-color-scheme:dark){
    html,body{ ${PAGE_BG}; color:#1a1a1a!important; }
    .gmailfix { background-color:#ffffff!important; background-image:linear-gradient(to top,#ffffff 0%,#ffffff 100%)!important; }
    .gmailfix-page { background-color:${pageBg}!important; background-image:linear-gradient(to top,${pageBg} 0%,${pageBg} 100%)!important; }
    .gmailtext-dark  { color:#1a1a1a!important; }
    .gmailtext-muted { color:#555!important; }
  }
</style>
</head><body class="body" style="${PAGE_BG};margin:0;padding:0;">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="${pageBg}" style="${PAGE_BG};">
<tr><td align="center" class="gmailfix-page" style="padding:32px 0;${PAGE_BG};">
  <table width="600" cellpadding="0" cellspacing="0" class="gmailfix" bgcolor="#ffffff" style="width:600px;max-width:600px;${WHITE_BG};border-radius:20px;overflow:hidden;">

    <!-- ── HERO: padded inset image + dark gradient + logo + headline ── -->
    ${isHeroGenerated
      ? `<tr><td style="padding:0;line-height:0;font-size:0;"><img src="${heroImg}" alt="" width="600" style="display:block;width:600px;"/></td></tr>`
      : `<tr><td class="gmailfix" style="padding:20px 20px 0;${WHITE_BG};line-height:0;font-size:0;">
      <div style="position:relative;width:560px;height:720px;overflow:hidden;border-radius:16px;background:#1a1a1a;">
        ${heroImg ? `<img src="${heroImg}" alt="" style="position:absolute;top:${Math.min(0,Math.max(720*(1-heroScale),-(720*(heroScale-1)/2)+heroY))}px;left:${Math.min(0,Math.max(560*(1-heroScale),-(560*(heroScale-1)/2)+heroX))}px;width:${560*heroScale}px;height:${720*heroScale}px;object-fit:cover;display:block;"/>` : ''}
        <!-- dark gradient top-down -->
        <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0.78) 0%,rgba(0,0,0,0.38) 45%,rgba(0,0,0,0.05) 75%,rgba(0,0,0,0) 100%);">
          <div style="text-align:center;padding-top:${logoTop}px;">${logoHeroHtml}</div>
          <div style="text-align:center;padding:${textTop}px ${textLeft}px 0;">
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:${textSize}px;font-weight:700;line-height:1.12;color:#fff;">${copy.headlineText||''}</div>
          </div>
        </div>
      </div>
    </td></tr>`}

    <!-- ── Subhead + CTA after hero ── -->
    ${copy.subhead ? `
    <tr><td class="gmailfix" style="padding:32px 64px 4px;text-align:center;${WHITE_BG};">
      <p style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-style:italic;line-height:1.7;color:#878787;margin:0;">${copy.subhead}</p>
    </td></tr>` : ''}
    ${copy.ctaText ? `
    <tr><td class="gmailfix" style="padding:24px 48px 8px;text-align:center;${WHITE_BG};">
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>
        <td style="background:${accent};border-radius:999px;">
          <a href="${copy.ctaUrl||'#'}" style="display:inline-block;padding:15px 40px;font-family:Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:.04em;color:#fff!important;text-decoration:none!important;">${copy.ctaText} &rarr;</a>
        </td>
      </tr></table>
    </td></tr>` : ''}
    <tr><td class="gmailfix" style="padding:32px 40px 0;${WHITE_BG};"><div style="height:1px;background:#e5e5e5;font-size:0;line-height:0;"></div></td></tr>

    <!-- Card 1: full width -->
    ${isHeroGenerated && card1PngUrl
      ? `<tr><td style="padding:0;line-height:0;font-size:0;"><img src="${card1PngUrl}" alt="" width="600" style="display:block;width:600px;"/></td></tr>
         ${cards[0].bodyText ? `<tr><td class="gmailfix" style="padding:24px 52px 32px;${WHITE_BG};text-align:center;"><p style="font-family:Arial,sans-serif;font-size:17px;color:#878787;line-height:1.85;margin:0;">${cards[0].bodyText.replace(/\n/g,'<br>')}</p></td></tr>` : ''}`
      : w4Card(cards[0])}

    <!-- Divider -->
    <tr><td class="gmailfix" style="padding:0 40px;${WHITE_BG};"><div style="height:1px;background:#ebebeb;font-size:0;line-height:0;"></div></td></tr>

    <!-- Card 2: bodyBlock2Title + image + bodyBlock2 + closingLine + CTA -->
    ${copy.bodyBlock2Title ? `
    <tr><td class="gmailfix" style="padding:32px 52px 8px;${WHITE_BG};text-align:center;">
      <p style="font-family:Georgia,'Times New Roman',serif;font-size:25px;font-weight:700;color:${secondary};line-height:1.3;margin:0;">${copy.bodyBlock2Title}</p>
    </td></tr>` : ''}
    ${isHeroGenerated && card2PngUrl
      ? `<tr><td style="padding:0;line-height:0;font-size:0;"><img src="${card2PngUrl}" alt="" width="600" style="display:block;width:600px;"/></td></tr>`
      : `<tr><td class="gmailfix" style="padding:16px 72px 8px;${WHITE_BG};line-height:normal;">${w4StackedImage(cards[1].imgUrl, cards[1].imgObj, 520)}</td></tr>`}
    ${copy.bodyBlock2 ? `
    <tr><td class="gmailfix" style="padding:20px 52px 0;${WHITE_BG};text-align:center;">
      <p style="font-family:Arial,sans-serif;font-size:17px;color:#878787;line-height:1.85;margin:0;">${(copy.bodyBlock2).replace(/\n/g,'<br>')}</p>
    </td></tr>` : ''}
    ${copy.closingLine ? `
    <tr><td class="gmailfix" style="padding:20px 52px 0;${WHITE_BG};text-align:center;">
      <p style="font-family:Georgia,'Times New Roman',serif;font-size:18px;font-style:italic;color:#878787;line-height:1.7;margin:0;">${copy.closingLine}</p>
    </td></tr>` : ''}
    ${copy.ctaText ? `
    <tr><td class="gmailfix" style="padding:24px 48px 44px;text-align:center;${WHITE_BG};">
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>
        <td style="background:${accent};border-radius:999px;">
          <a href="${copy.ctaUrl||'#'}" style="display:inline-block;padding:15px 40px;font-family:Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:.04em;color:#fff!important;text-decoration:none!important;">${copy.ctaText} &rarr;</a>
        </td>
      </tr></table>
    </td></tr>` : ''}

    <tr><td style="padding:0;line-height:0;font-size:0;">${buildFooter(client, footerData, { defaultBg: '#1a1a1a' })}</td></tr>
  </table>
</td></tr>
</table>
</body></html>`
}

/* ══════════════════════════════════════════════════════════════════════════
   WEEK 5  ·  Editorial full-bleed hero (Free People style) + property grid
   Two font styles: italic serif intro + bold caps headline overlaid on image
   White card background · 2×2 property grid
   ══════════════════════════════════════════════════════════════════════════ */
function buildTemplateWeek5({ client, copy, images, footerData, isHeroGenerated = false,
  heroScale=1, heroX=0, heroY=0,
  textSize=52, textTop=32, textLeft=36,
  logoColor='white', logoTop=28, logoRight=36, logoSize=40,
  img1Scale=1, img1X=0, img1Y=0,
  img2Scale=1, img2X=0, img2Y=0,
  img3Scale=1, img3X=0, img3Y=0,
  img4Scale=1, img4X=0, img4Y=0,
}) {
  const heroObj = images?.[0]; const heroImg = heroObj?.url || ''
  const img1Obj = images?.[1]; const img1    = img1Obj?.url || ''
  const img2Obj = images?.[2]; const img2    = img2Obj?.url || ''
  const img3Obj = images?.[3]; const img3    = img3Obj?.url || ''
  const img4Obj = images?.[4]; const img4    = img4Obj?.url || ''
  const body    = (copy.bodyText  || '').replace(/\n/g, '<br>')
  const b2body  = (copy.bodyBlock2|| '').replace(/\n/g, '<br>')
  const logoUrl = client?.logoUrl || ''
  const name    = client?.name    || ''
  const accent    = footerData?.buttonColor || '#1a1a1a'
  const secondary = footerData?.secondaryColor || accent
  const pageBg    = footerData?.bgColor || '#f5f4f2'
  const cardBg    = '#fffffe'
  const logoFilter = logoColor === 'white' ? 'brightness(0) invert(1)' : logoColor === 'black' ? 'brightness(0)' : 'none'

  const WHITE_BG = 'background-color:#ffffff;background-image:linear-gradient(to top,#ffffff 0%,#ffffff 100%)'
  const PAGE_BG  = `background-color:${pageBg};background-image:linear-gradient(to top,${pageBg} 0%,${pageBg} 100%)`

  // Logo for dark overlay
  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${name}" style="height:${logoSize}px;width:auto;max-width:160px;display:inline-block;filter:${logoFilter};"/>`
    : `<span style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#fff;">${name}</span>`

  // Two-font editorial headline split:
  // first word & last word → italic serif | middle words → bold caps Arial
  const hw5 = (copy.headlineText || '').trim().split(/\s+/).filter(Boolean)
  const hw5First = hw5.length >= 2 ? hw5[0] : ''
  const hw5Last  = hw5.length >= 3 ? hw5[hw5.length - 1] : ''
  const hw5Main  = hw5.length >= 3 ? hw5.slice(1, -1).join(' ') : hw5.length === 2 ? hw5[1] : hw5[0] || ''

  // 2×2 grid — uses the 4 selected images; falls back gracefully if fewer
  const gridImgs = [
    { obj: img1Obj, url: img1 },
    { obj: img2Obj, url: img2 },
    { obj: img3Obj, url: img3 },
    { obj: img4Obj, url: img4 || img1 },
  ]
  const hasGrid = img1 || img2

  const gridCell = (imgObj, imgUrl, label) => imgUrl
    ? `<img src="${imgUrl}" alt="" style="width:100%;height:220px;object-fit:cover;display:block;border-radius:12px;object-position:${focalPos(imgObj)};"/>`
    : `<div style="width:100%;height:220px;background:#e8e4de;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#aaa;font-family:Arial,sans-serif;">${label}</div>`

  // Two-font headline treatment:
  // copy.subjectLine → small italic serif intro (like "the")
  // copy.headlineText → LARGE bold caps sans-serif (like "EVERYWHERE")
  const heroHeroBlock = `
    <!-- Logo: top-right -->
    <div style="position:absolute;top:${logoTop}px;right:${logoRight}px;z-index:3;">${logoHtml}</div>
    <!-- Two-font headline: centred in lower half of image -->
    <div style="position:absolute;left:0;right:0;top:${textTop}%;padding:0 ${textLeft}px;">
      ${copy.subjectLine
        ? `<div style="font-family:Georgia,'Times New Roman',serif;font-size:${Math.round(textSize*0.5)}px;font-style:italic;font-weight:400;color:#fff;line-height:1.1;margin-bottom:4px;text-shadow:0 2px 16px rgba(0,0,0,.35);">${copy.subjectLine}</div>`
        : ''}
      <div style="font-family:Arial,'Helvetica Neue',sans-serif;font-size:${textSize}px;font-weight:900;text-transform:uppercase;color:#fff;line-height:.95;letter-spacing:-2px;text-shadow:0 2px 24px rgba(0,0,0,.25);">${copy.headlineText||''}</div>
    </div>
    <!-- Eyebrow label bottom-centre -->
    ${copy.ctaText ? `
    <div style="position:absolute;bottom:36px;left:0;right:0;text-align:center;">
      <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.8);text-shadow:0 1px 8px rgba(0,0,0,.4);">${copy.ctaText.toUpperCase()}</div>
    </div>` : ''}`

  return `<!DOCTYPE html><html lang="en" style="color-scheme:light"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,700;1,400&display=swap" rel="stylesheet"/>
<style>
  :root{color-scheme:light;supported-color-schemes:light}
  *{box-sizing:border-box;margin:0;padding:0}
  body{${PAGE_BG};color:#1a1a1a;}
  table{border-collapse:collapse;}
  u + .body .gmailfix { background-color:#ffffff!important; background-image:linear-gradient(to top,#ffffff 0%,#ffffff 100%)!important; }
  u + .body .gmailfix-page { background-color:${pageBg}!important; background-image:linear-gradient(to top,${pageBg} 0%,${pageBg} 100%)!important; }
  u + .body .gmailtext-dark  { color:#1a1a1a!important; }
  u + .body .gmailtext-muted { color:#555!important; }
  @media (prefers-color-scheme:dark){
    html,body{ ${PAGE_BG}; color:#1a1a1a!important; }
    .gmailfix { background-color:#ffffff!important; background-image:linear-gradient(to top,#ffffff 0%,#ffffff 100%)!important; }
    .gmailfix-page { background-color:${pageBg}!important; background-image:linear-gradient(to top,${pageBg} 0%,${pageBg} 100%)!important; }
    .gmailtext-dark  { color:#1a1a1a!important; }
    .gmailtext-muted { color:#555!important; }
  }
</style></head>
<body class="body" style="${PAGE_BG};margin:0;padding:0;">

<table width="100%" cellpadding="0" cellspacing="0" bgcolor="${pageBg}" style="${PAGE_BG};border-collapse:collapse;">
<tr><td align="center" class="gmailfix-page" style="padding:24px 0 48px;${PAGE_BG};">

  <table width="600" cellpadding="0" cellspacing="0" class="gmailfix" bgcolor="#ffffff" style="width:600px;max-width:600px;${WHITE_BG};border-collapse:collapse;border-radius:20px;overflow:hidden;">

    <!-- ── HERO: same inset card as Week 4 ── -->
    ${isHeroGenerated
      ? `<tr><td style="padding:0;line-height:0;font-size:0;"><img src="${heroImg}" alt="" width="600" style="display:block;width:600px;"/></td></tr>`
      : `<tr><td class="gmailfix" style="padding:20px 20px 0;${WHITE_BG};line-height:0;font-size:0;">
      <div style="position:relative;width:560px;height:680px;overflow:hidden;border-radius:0;background:#1a1a1a;">
        ${heroImg ? `<img src="${heroImg}" alt="" style="position:absolute;top:${Math.min(0,Math.max(680*(1-heroScale),-(680*(heroScale-1)/2)+heroY))}px;left:${Math.min(0,Math.max(560*(1-heroScale),-(560*(heroScale-1)/2)+heroX))}px;width:${560*heroScale}px;height:${680*heroScale}px;object-fit:cover;display:block;"/>` : ''}
        <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0.55) 0%,rgba(0,0,0,0.25) 40%,rgba(0,0,0,0.45) 100%);">
          <div style="text-align:center;padding-top:${logoTop}px;">${logoHtml}</div>
          <div style="position:absolute;left:${textLeft}px;right:${textLeft}px;top:${textTop}%;">
            ${hw5First ? `<div style="font-family:'Lora',serif;font-size:${Math.round(textSize*0.8)}px;font-style:italic;font-weight:400;color:#fff;line-height:1;text-shadow:0 2px 12px rgba(0,0,0,.3);margin-bottom:2px;">${hw5First}</div>` : ''}
            <div style="font-family:'Lora',serif;font-size:${textSize}px;font-weight:700;text-transform:uppercase;color:#fff;line-height:1.0;text-shadow:0 2px 20px rgba(0,0,0,.25);">${hw5Main}${hw5Last ? ` <span style="font-family:'Lora',serif;font-style:italic;font-weight:400;text-transform:none;font-size:${Math.round(textSize*0.9)}px;">${hw5Last}</span>` : ''}</div>
          </div>
        </div>
      </div>
    </td></tr>`}

    <!-- ── Subhead (preview text) ── -->
    ${copy.subhead ? `
    <tr><td class="gmailfix" style="padding:32px 52px 8px;text-align:center;${WHITE_BG};">
      <p style="font-family:Georgia,'Times New Roman',serif;font-size:17px;font-style:italic;line-height:1.65;color:#878787!important;margin:0;">${copy.subhead}</p>
    </td></tr>` : ''}

    <!-- ── CTA (below preview text) ── -->
    ${copy.ctaText ? `
    <tr><td class="gmailfix" style="padding:20px 52px 8px;text-align:center;${WHITE_BG};">
      <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;"><tr>
        <td style="background:${accent}!important;border-radius:100px;">
          <a href="${copy.ctaUrl||'#'}" style="display:inline-block;padding:16px 40px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#fff!important;text-decoration:none!important;letter-spacing:.03em;white-space:nowrap;">${copy.ctaText} &rarr;</a>
        </td>
      </tr></table>
    </td></tr>` : ''}

    <!-- ── Body text ── -->
    ${copy.bodyText ? `
    <tr><td class="gmailfix" style="padding:32px 52px 24px;text-align:center;${WHITE_BG};">
      <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.85;color:#878787!important;margin:0;">${body}</p>
    </td></tr>` : ''}

    <!-- ── Divider ── -->
    <tr><td class="gmailfix" style="padding:0 48px;${WHITE_BG};">
      <div style="height:1px;background:rgba(0,0,0,0.08);font-size:0;line-height:0;"></div>
    </td></tr>

    <!-- ── Body block 2 title (above grid) ── -->
    ${copy.bodyBlock2Title ? `
    <tr><td class="gmailfix" style="padding:32px 52px 0;text-align:center;${WHITE_BG};">
      <p style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;color:${secondary}!important;line-height:1.25;margin:0;">${copy.bodyBlock2Title}</p>
    </td></tr>` : ''}

    <!-- ── Zigzag 4-image grid ──────────────────────────────────────────
         Row 1: [narrow 38%] | [wide 62%]
         Row 2: [wide  62%]  | [narrow 38%]
         Creates a visual zigzag as the eye moves down the email.
    ─────────────────────────────────────────────────────────────────── -->
    ${hasGrid
      ? isHeroGenerated && img4
        ? `<tr><td class="gmailfix" style="padding:28px 0 0;${WHITE_BG};line-height:0;font-size:0;text-align:center;"><img src="${img4}" alt="" width="600" style="display:block;width:600px;max-width:100%;"/></td></tr>`
        : `<tr><td class="gmailfix" style="padding:28px 0 0;${WHITE_BG};">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;border-collapse:collapse;">
        <!-- Row 1 -->
        <tr>
          <td width="297" style="width:297px;vertical-align:top;line-height:0;font-size:0;">
            ${gridImgs[0].url
              ? `<div style="overflow:hidden;width:297px;height:262px;"><img src="${gridImgs[0].url}" alt="" width="297" style="width:297px;height:262px;object-fit:cover;display:block;object-position:${focalPos(gridImgs[0].obj)};transform:translate(${img1X}px,${img1Y}px) scale(${img1Scale});transform-origin:center center;"/></div>`
              : `<div style="width:297px;height:262px;background:#e8e4de;"></div>`}
          </td>
          <td width="6" style="width:6px;line-height:0;font-size:0;"></td>
          <td width="297" style="width:297px;vertical-align:top;line-height:0;font-size:0;">
            ${gridImgs[1].url
              ? `<div style="overflow:hidden;width:297px;height:262px;"><img src="${gridImgs[1].url}" alt="" width="297" style="width:297px;height:262px;object-fit:cover;display:block;object-position:${focalPos(gridImgs[1].obj)};transform:translate(${img2X}px,${img2Y}px) scale(${img2Scale});transform-origin:center center;"/></div>`
              : `<div style="width:297px;height:262px;background:#e8e4de;"></div>`}
          </td>
        </tr>
        <!-- Row gap -->
        <tr><td colspan="3" height="6" style="height:6px;line-height:0;font-size:0;"></td></tr>
        <!-- Row 2 -->
        <tr>
          <td width="297" style="width:297px;vertical-align:top;line-height:0;font-size:0;">
            ${gridImgs[3].url
              ? `<div style="overflow:hidden;width:297px;height:262px;"><img src="${gridImgs[3].url}" alt="" width="297" style="width:297px;height:262px;object-fit:cover;display:block;object-position:${focalPos(gridImgs[3].obj)};transform:translate(${img4X}px,${img4Y}px) scale(${img4Scale});transform-origin:center center;"/></div>`
              : `<div style="width:297px;height:262px;background:#e8e4de;"></div>`}
          </td>
          <td width="6" style="width:6px;line-height:0;font-size:0;"></td>
          <td width="297" style="width:297px;vertical-align:top;line-height:0;font-size:0;">
            ${gridImgs[2].url
              ? `<div style="overflow:hidden;width:297px;height:262px;"><img src="${gridImgs[2].url}" alt="" width="297" style="width:297px;height:262px;object-fit:cover;display:block;object-position:${focalPos(gridImgs[2].obj)};transform:translate(${img3X}px,${img3Y}px) scale(${img3Scale});transform-origin:center center;"/></div>`
              : `<div style="width:297px;height:262px;background:#e8e4de;"></div>`}
          </td>
        </tr>
      </table>
    </td></tr>`
      : ''}

    <!-- ── Body block 2 + closing ── -->
    ${copy.bodyBlock2 ? `
    <tr><td class="gmailfix" style="padding:${copy.bodyBlock2Title ? '14px' : '32px'} 52px 0;text-align:center;${WHITE_BG};">
      <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.85;color:#878787!important;margin:0;">${b2body}</p>
    </td></tr>` : ''}

    ${copy.closingLine ? `
    <tr><td class="gmailfix" style="padding:20px 52px 0;text-align:center;${WHITE_BG};">
      <p style="font-family:Georgia,'Times New Roman',serif;font-size:15px;font-style:italic;color:#878787!important;line-height:1.7;margin:0;">${copy.closingLine}</p>
    </td></tr>` : ''}

    <!-- ── Repeat CTA ── -->
    ${copy.ctaText ? `
    <tr><td class="gmailfix" style="padding:28px 52px 44px;text-align:center;${WHITE_BG};">
      <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;"><tr>
        <td style="background:${accent}!important;border-radius:100px;">
          <a href="${copy.ctaUrl||'#'}" style="display:inline-block;padding:16px 40px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#fff!important;text-decoration:none!important;letter-spacing:.03em;white-space:nowrap;">${copy.ctaText} &rarr;</a>
        </td>
      </tr></table>
    </td></tr>` : ''}

    <tr><td style="padding:0;line-height:0;font-size:0;">${buildFooter(client, footerData, { defaultBg: '#1a1a1a' })}</td></tr>
  </table>

</td></tr>
</table>
</body></html>`
}

/* ─────────────────────────── Week 6 ────────────────────────────────────── */
function buildTemplateWeek6({ client, copy, images, footerData, isHeroGenerated = false,
  heroScale=1, heroX=0, heroY=0,
  textSize=46, textTop=32, textLeft=36,
  logoColor='original', logoTop=28, logoRight=40, logoSize=32,
  img1Scale=1, img1X=0, img1Y=0,
  img2Scale=1, img2X=0, img2Y=0,
  img3Scale=1, img3X=0, img3Y=0,
}) {
  const heroObj = images?.[0]; const heroImg = heroObj?.url || ''
  const img1Obj = images?.[1]; const img1    = img1Obj?.url || ''
  const img2Obj = images?.[2]; const img2    = img2Obj?.url || ''
  const img3Obj = images?.[3]; const img3    = img3Obj?.url || ''
  const img4Obj = images?.[4]; const img4    = img4Obj?.url || ''
  const body    = (copy.bodyText  || '').replace(/\n/g, '<br>')
  const b2body  = (copy.bodyBlock2|| '').replace(/\n/g, '<br>')
  const logoUrl = client?.logoUrl || ''
  const name    = client?.name    || ''
  const accent    = footerData?.buttonColor || '#1a1a1a'
  const secondary = footerData?.secondaryColor || accent
  const pageBg    = footerData?.bgColor || '#edf1f7'
  const cardBg    = '#fffffe'
  const logoFilter = logoColor === 'white' ? 'brightness(0) invert(1)' : logoColor === 'black' ? 'brightness(0)' : 'none'

  const WHITE_BG = 'background-color:#ffffff;background-image:linear-gradient(to top,#ffffff 0%,#ffffff 100%)'
  const PAGE_BG  = `background-color:${pageBg};background-image:linear-gradient(to top,${pageBg} 0%,${pageBg} 100%)`

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${name}" style="height:${logoSize}px;width:auto;max-width:150px;display:inline-block;filter:${logoFilter};"/>`
    : `<span style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#1a1a1a;">${name}</span>`

  // Headline: all words except last → bold serif | last word → italic serif emphasis
  const hw6 = (copy.headlineText || '').trim().split(/\s+/).filter(Boolean)
  const hw6Body = hw6.length > 1 ? hw6.slice(0, -1).join(' ') : hw6[0] || ''
  const hw6Last = hw6.length > 1 ? hw6[hw6.length - 1] : ''

  const hasGrid = img1 || img2 || img3

  return `<!DOCTYPE html><html lang="en" style="color-scheme:light"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,700;1,400&display=swap" rel="stylesheet"/>
<style>
  :root{color-scheme:light;supported-color-schemes:light}
  *{box-sizing:border-box;margin:0;padding:0}
  body{${PAGE_BG};color:#1a1a1a;}
  table{border-collapse:collapse;}
  u + .body .gmailfix { background-color:#ffffff!important; background-image:linear-gradient(to top,#ffffff 0%,#ffffff 100%)!important; }
  u + .body .gmailfix-page { background-color:${pageBg}!important; background-image:linear-gradient(to top,${pageBg} 0%,${pageBg} 100%)!important; }
  u + .body .gmailtext-dark  { color:#1a1a1a!important; }
  u + .body .gmailtext-muted { color:#555!important; }
  @media (prefers-color-scheme:dark){
    html,body{ ${PAGE_BG}; color:#1a1a1a!important; }
    .gmailfix { background-color:#ffffff!important; background-image:linear-gradient(to top,#ffffff 0%,#ffffff 100%)!important; }
    .gmailfix-page { background-color:${pageBg}!important; background-image:linear-gradient(to top,${pageBg} 0%,${pageBg} 100%)!important; }
    .gmailtext-dark  { color:#1a1a1a!important; }
    .gmailtext-muted { color:#555!important; }
  }
</style></head>
<body class="body" style="${PAGE_BG};margin:0;padding:0;">

<table width="100%" cellpadding="0" cellspacing="0" bgcolor="${pageBg}" style="${PAGE_BG};border-collapse:collapse;">
<tr><td align="center" class="gmailfix-page" style="padding:24px 0 48px;${PAGE_BG};">

  <table width="600" cellpadding="0" cellspacing="0" class="gmailfix" bgcolor="#ffffff" style="width:600px;max-width:600px;${WHITE_BG};border-collapse:collapse;border-radius:20px;overflow:hidden;">

    <!-- ── Header + Hero: header baked into PNG when generated ── -->
    ${isHeroGenerated
      ? `<tr><td style="padding:0;line-height:0;font-size:0;"><img src="${heroImg}" alt="" width="600" style="display:block;width:600px;"/></td></tr>`
      : `
    <tr><td class="gmailfix" style="padding:0 0 20px;${WHITE_BG};">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>
          <td style="padding:${logoTop}px 0 0 ${logoRight}px;vertical-align:top;">${logoHtml}</td>
          <td style="text-align:right;vertical-align:middle;padding-right:40px;">
            ${copy.ctaText ? `<a href="${copy.ctaUrl||'#'}" style="font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:#1a1a1a!important;text-decoration:underline;letter-spacing:.01em;">${copy.ctaText} ›</a>` : ''}
          </td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="padding:0;overflow:hidden;line-height:0;font-size:0;">
        <div style="position:relative;width:600px;height:740px;overflow:hidden;">
          ${heroImg
            ? `<img src="${heroImg}" alt="" style="position:absolute;top:-30px;left:-30px;width:660px;height:800px;object-fit:cover;object-position:calc(50% + ${heroX}px) calc(50% + ${heroY}px);filter:blur(36px) saturate(1.4) brightness(0.82);transform:scale(${Math.max(1.12, heroScale)});display:block;"/>`
            : `<div style="position:absolute;inset:0;background:linear-gradient(160deg,#7ab5d8,#6ba87a);"></div>`}

          <!-- Inset image card -->
          <div style="position:absolute;left:28px;top:22px;right:28px;">
            <div style="position:relative;width:544px;height:480px;overflow:hidden;border-radius:20px;box-shadow:0 6px 40px rgba(0,0,0,0.3);border:2px solid rgba(255,255,255,0.55);">
              ${heroImg ? `<img src="${heroImg}" alt="" style="position:absolute;top:${Math.min(0,Math.max(480*(1-heroScale),-(480*(heroScale-1)/2)+heroY))}px;left:${Math.min(0,Math.max(544*(1-heroScale),-(544*(heroScale-1)/2)+heroX))}px;width:${544*heroScale}px;height:${480*heroScale}px;object-fit:cover;display:block;"/>` : ''}
              <div style="position:absolute;top:0;left:0;right:0;height:72%;background:linear-gradient(to bottom,rgba(0,0,0,0.52) 0%,rgba(0,0,0,0.16) 65%,rgba(0,0,0,0) 100%);"></div>
              <div style="position:absolute;top:0;left:0;right:0;padding:${textTop}px ${textLeft}px 0;line-height:normal;font-size:initial;text-align:center;">
                <div style="font-family:'Lora',serif;font-size:${textSize}px;font-weight:700;color:#fff;line-height:1.08;text-shadow:0 2px 16px rgba(0,0,0,.3);">
                  ${hw6Body}${hw6Last ? ` <span style="font-family:'Lora',serif;font-style:italic;font-weight:400;font-size:${Math.round(textSize*1.17)}px;">${hw6Last}</span>` : ''}
                </div>
              </div>
            </div>
          </div>

          <!-- Subhead on gradient — positioned just above CTA -->
          ${copy.subhead ? `
          <div style="position:absolute;top:548px;left:44px;right:44px;text-align:center;line-height:normal;font-size:initial;">
            <p style="font-family:'Lora',serif;font-size:17px;font-style:italic;line-height:1.6;color:#fff;margin:0;text-shadow:0 1px 8px rgba(0,0,0,.25);">${copy.subhead}</p>
          </div>` : ''}

          <!-- CTA on gradient + arrow below -->
          ${copy.ctaText ? `
          <div style="position:absolute;top:610px;left:0;right:0;text-align:center;line-height:normal;font-size:initial;">
            <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;display:inline-table;"><tr>
              <td style="background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.85)!important;border-radius:100px;">
                <a href="${copy.ctaUrl||'#'}" style="display:inline-block;padding:14px 44px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#fff!important;text-decoration:none!important;letter-spacing:.03em;white-space:nowrap;">${copy.ctaText}</a>
              </td>
            </tr></table>
            <div style="margin-top:10px;line-height:0;font-size:0;text-align:center;">
              <div style="display:inline-block;width:1px;height:28px;background:rgba(255,255,255,0.65);vertical-align:top;"></div>
              <div style="width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:6px solid rgba(255,255,255,0.65);margin:0 auto;"></div>
            </div>
          </div>` : ''}
        </div>
      </td></tr>`}

    <!-- ── Body text (on white, below gradient) ── -->
    ${copy.bodyText ? `
    <tr><td class="gmailfix" style="padding:20px 52px 8px;text-align:center;${WHITE_BG};">
      <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.9;color:#878787!important;margin:0;">${body}</p>
    </td></tr>` : ''}

    <!-- ── Divider ── -->
    <tr><td class="gmailfix" style="padding:0 40px;${WHITE_BG};">
      <div style="height:1px;background:rgba(0,0,0,0.08);font-size:0;line-height:0;"></div>
    </td></tr>

    <!-- ── Body block 2 title (below divider, above grid) ── -->
    ${copy.bodyBlock2Title ? `
    <tr><td class="gmailfix" style="padding:32px 52px 16px;text-align:center;${WHITE_BG};">
      <p style="font-family:'Lora',serif;font-size:20px;font-weight:700;color:${secondary}!important;line-height:1.25;margin:0;">${copy.bodyBlock2Title}</p>
    </td></tr>` : ''}

    <!-- ── Image grid: 2-up top row + 1 full-width bottom ── -->
    ${hasGrid
      ? isHeroGenerated && img4
        ? `<tr><td class="gmailfix" style="padding:0;line-height:0;font-size:0;text-align:center;${WHITE_BG};"><img src="${img4}" alt="" width="600" style="display:block;width:600px;max-width:100%;"/></td></tr>`
        : `<tr><td class="gmailfix" style="padding:32px 20px 0;${WHITE_BG};">

      ${(img1 || img2) ? `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>
          <td style="width:50%;padding-right:6px;vertical-align:top;line-height:0;font-size:0;">
            ${img1
              ? `<div style="overflow:hidden;border-radius:12px;height:240px;"><img src="${img1}" alt="" style="width:100%;height:240px;object-fit:cover;display:block;object-position:${focalPos(img1Obj)};transform:translate(${img1X}px,${img1Y}px) scale(${img1Scale});transform-origin:center center;"/></div>`
              : `<div style="width:100%;height:240px;background:#e0e4ea;border-radius:12px;"></div>`}
          </td>
          <td style="width:50%;padding-left:6px;vertical-align:top;line-height:0;font-size:0;">
            ${img2
              ? `<div style="overflow:hidden;border-radius:12px;height:240px;"><img src="${img2}" alt="" style="width:100%;height:240px;object-fit:cover;display:block;object-position:${focalPos(img2Obj)};transform:translate(${img2X}px,${img2Y}px) scale(${img2Scale});transform-origin:center center;"/></div>`
              : `<div style="width:100%;height:240px;background:#e0e4ea;border-radius:12px;"></div>`}
          </td>
        </tr>
      </table>` : ''}

      ${img3 ? `
      <div style="padding-top:12px;line-height:0;font-size:0;">
        <div style="overflow:hidden;border-radius:12px;height:300px;"><img src="${img3}" alt="" style="width:100%;height:300px;object-fit:cover;display:block;object-position:${focalPos(img3Obj)};transform:translate(${img3X}px,${img3Y}px) scale(${img3Scale});transform-origin:center center;"/></div>
      </div>` : ''}

    </td></tr>`
      : ''}

    <!-- ── Body block 2 text ── -->
    ${copy.bodyBlock2 ? `
    <tr><td class="gmailfix" style="padding:32px 52px 0;text-align:center;${WHITE_BG};">
      <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.85;color:#878787!important;margin:0;">${b2body}</p>
    </td></tr>` : ''}

    <!-- ── Closing line ── -->
    ${copy.closingLine ? `
    <tr><td class="gmailfix" style="padding:20px 52px 0;text-align:center;${WHITE_BG};">
      <p style="font-family:'Lora',serif;font-size:15px;font-style:italic;color:#878787!important;line-height:1.7;margin:0;">${copy.closingLine}</p>
    </td></tr>` : ''}

    <!-- ── Final CTA ── -->
    ${copy.ctaText ? `
    <tr><td class="gmailfix" style="padding:28px 52px 44px;text-align:center;${WHITE_BG};">
      <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;"><tr>
        <td style="border:2px solid ${accent}!important;border-radius:100px;">
          <a href="${copy.ctaUrl||'#'}" style="display:inline-block;padding:14px 44px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:${accent}!important;text-decoration:none!important;letter-spacing:.03em;white-space:nowrap;">${copy.ctaText}</a>
        </td>
      </tr></table>
    </td></tr>` : `<tr><td class="gmailfix" style="padding:20px 0;${WHITE_BG};font-size:0;line-height:0;"></td></tr>`}

    <tr><td style="padding:0;line-height:0;font-size:0;">${buildFooter(client, footerData, { defaultBg: '#1a1a1a' })}</td></tr>
  </table>

</td></tr>
</table>
</body></html>`
}

/* ══════════════════════════════════════════════════════════════════════════
   WEEK 4 v2 — same layout as Week 4, with gradient-illusion dark-mode fix
   Uses background-image gradient on white areas so Gmail/iOS can't invert them
   ══════════════════════════════════════════════════════════════════════════ */
function buildTemplateWeek4v2({ client, copy, images, footerData, isHeroGenerated = false,
  heroScale=1, heroX=0, heroY=0,
  textSize=38, textTop=20, textLeft=48,
  logoColor='white', logoTop=40, logoRight=36, logoSize=44,
}) {
  const heroObj = images?.[0]; const heroImg = heroObj?.url||''
  const img1Obj = images?.[1]; const img1 = img1Obj?.url || heroImg
  const img2Obj = images?.[2]; const img2 = img2Obj?.url || heroImg
  const img3Obj = images?.[3]; const img3 = img3Obj?.url || heroImg
  const eff1Obj = img1Obj?.url ? img1Obj : heroObj
  const eff2Obj = img2Obj?.url ? img2Obj : heroObj
  const eff3Obj = img3Obj?.url ? img3Obj : heroObj
  const card1PngUrl = images?.[4]?.url || null
  const card2PngUrl = images?.[5]?.url || null

  const pageBg    = footerData?.bgColor || '#f5f4f2'
  const logoUrl   = client?.logoUrl||''
  const name      = client?.name||''
  const accent    = footerData?.buttonColor || '#1a1a1a'
  const secondary = footerData?.secondaryColor || accent
  const logoFilter = logoColor === 'white' ? 'brightness(0) invert(1)' : logoColor === 'black' ? 'brightness(0)' : 'none'

  const logoHeroHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${name}" style="height:${logoSize}px;width:auto;max-width:${logoSize * 5}px;display:inline-block;filter:${logoFilter};"/>`
    : `<span style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#fff;">${name}</span>`

  const cards = [
    { imgUrl:img1, imgObj:eff1Obj, bodyText:copy.bodyText||'' },
    { imgUrl:img2, imgObj:eff2Obj, bodyText:copy.bodyBlock2||'' },
    { imgUrl:img3, imgObj:eff3Obj, bodyText:copy.closingLine||copy.bodyText||'', isLast:true },
  ]

  // Gradient values — #ffffff gradient "tricks" Gmail/iOS into treating white as a graphic layer
  const WHITE_BG = 'background-color:#ffffff;background-image:linear-gradient(to top,#ffffff 0%,#ffffff 100%)'
  const PAGE_BG  = `background-color:${pageBg};background-image:linear-gradient(to top,${pageBg} 0%,${pageBg} 100%)`

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<style>
  :root{color-scheme:light;supported-color-schemes:light}
  *{box-sizing:border-box;margin:0;padding:0}
  body{${PAGE_BG};color:#1a1a1a;}
  table{border-collapse:collapse;}
  /* Gmail body hack — intercepts Gmail's rewritten .body class */
  u + .body .gmailfix {
    background-color:#ffffff!important;
    background-image:linear-gradient(to top,#ffffff 0%,#ffffff 100%)!important;
  }
  u + .body .gmailfix-page {
    background-color:${pageBg}!important;
    background-image:linear-gradient(to top,${pageBg} 0%,${pageBg} 100%)!important;
  }
  u + .body .gmailtext-dark  { color:#1a1a1a!important; }
  u + .body .gmailtext-muted { color:#555!important; }
  u + .body .gmailtext-sec   { color:${secondary}!important; }
  @media (prefers-color-scheme:dark){
    .gmailfix {
      background-color:#ffffff!important;
      background-image:linear-gradient(to top,#ffffff 0%,#ffffff 100%)!important;
    }
    .gmailfix-page {
      background-color:${pageBg}!important;
      background-image:linear-gradient(to top,${pageBg} 0%,${pageBg} 100%)!important;
    }
    .gmailtext-dark  { color:#1a1a1a!important; }
    .gmailtext-muted { color:#555!important; }
    .gmailtext-sec   { color:${secondary}!important; }
  }
</style>
</head><body class="body" style="${PAGE_BG};margin:0;padding:0;color:#1a1a1a;">
<table width="100%" cellpadding="0" cellspacing="0" class="gmailfix-page" style="${PAGE_BG};">
<tr><td align="center" class="gmailfix-page" style="padding:32px 0;${PAGE_BG};">
  <table width="600" cellpadding="0" cellspacing="0" bgcolor="#ffffff" class="gmailfix" style="width:600px;max-width:600px;${WHITE_BG};border-radius:20px;overflow:hidden;">

    <!-- ── HERO ── -->
    ${isHeroGenerated
      ? `<tr><td style="padding:0;line-height:0;font-size:0;"><img src="${heroImg}" alt="" width="600" style="display:block;width:600px;"/></td></tr>`
      : `<tr><td class="gmailfix" style="padding:20px 20px 0;${WHITE_BG};line-height:0;font-size:0;">
      <div style="position:relative;width:560px;height:720px;overflow:hidden;border-radius:16px;background:#1a1a1a;">
        ${heroImg ? `<img src="${heroImg}" alt="" style="position:absolute;top:${Math.min(0,Math.max(720*(1-heroScale),-(720*(heroScale-1)/2)+heroY))}px;left:${Math.min(0,Math.max(560*(1-heroScale),-(560*(heroScale-1)/2)+heroX))}px;width:${560*heroScale}px;height:${720*heroScale}px;object-fit:cover;display:block;"/>` : ''}
        <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0.78) 0%,rgba(0,0,0,0.38) 45%,rgba(0,0,0,0.05) 75%,rgba(0,0,0,0) 100%);">
          <div style="text-align:center;padding-top:${logoTop}px;">${logoHeroHtml}</div>
          <div style="text-align:center;padding:${textTop}px ${textLeft}px 0;">
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:${textSize}px;font-weight:700;line-height:1.12;color:#fff;">${copy.headlineText||''}</div>
          </div>
        </div>
      </div>
    </td></tr>`}

    <!-- ── Subhead + CTA ── -->
    ${copy.subhead ? `
    <tr><td class="gmailfix" style="padding:32px 64px 4px;text-align:center;${WHITE_BG};">
      <p class="gmailtext-muted" style="font-family:Georgia,'Times New Roman',serif;font-size:17px;font-style:italic;line-height:1.7;color:#878787;margin:0;">${copy.subhead}</p>
    </td></tr>` : ''}
    ${copy.ctaText ? `
    <tr><td class="gmailfix" style="padding:24px 48px 8px;text-align:center;${WHITE_BG};">
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>
        <td style="background:${accent};border-radius:999px;">
          <a href="${copy.ctaUrl||'#'}" style="display:inline-block;padding:15px 40px;font-family:Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:.04em;color:#fff!important;text-decoration:none!important;">${copy.ctaText} &rarr;</a>
        </td>
      </tr></table>
    </td></tr>` : ''}
    <tr><td class="gmailfix" style="padding:32px 40px 0;${WHITE_BG};"><div style="height:1px;background:#e5e5e5;font-size:0;line-height:0;"></div></td></tr>

    <!-- ── Card 1 ── -->
    ${isHeroGenerated && card1PngUrl
      ? `<tr><td style="padding:0;line-height:0;font-size:0;"><img src="${card1PngUrl}" alt="" width="600" style="display:block;width:600px;"/></td></tr>
         ${cards[0].bodyText ? `<tr><td class="gmailfix" style="padding:24px 52px 32px;${WHITE_BG};text-align:center;"><p class="gmailtext-muted" style="font-family:Arial,sans-serif;font-size:14px;color:#878787;line-height:1.85;margin:0;">${cards[0].bodyText.replace(/\n/g,'<br>')}</p></td></tr>` : ''}`
      : `<tr><td class="gmailfix" style="padding:28px 72px 8px;${WHITE_BG};line-height:0;font-size:0;">${w4StackedImage(cards[0].imgUrl,cards[0].imgObj)}</td></tr>
         ${cards[0].bodyText ? `<tr><td class="gmailfix" style="padding:24px 52px 32px;${WHITE_BG};text-align:center;"><p class="gmailtext-muted" style="font-family:Arial,sans-serif;font-size:14px;color:#878787;line-height:1.85;margin:0;">${cards[0].bodyText.replace(/\n/g,'<br>')}</p></td></tr>` : ''}`}

    <!-- ── Divider ── -->
    <tr><td class="gmailfix" style="padding:0 40px;${WHITE_BG};"><div style="height:1px;background:#ebebeb;font-size:0;line-height:0;"></div></td></tr>

    <!-- ── Card 2 ── -->
    ${copy.bodyBlock2Title ? `
    <tr><td class="gmailfix" style="padding:32px 52px 8px;${WHITE_BG};text-align:center;">
      <p class="gmailtext-sec" style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:${secondary};line-height:1.3;margin:0;">${copy.bodyBlock2Title}</p>
    </td></tr>` : ''}
    ${isHeroGenerated && card2PngUrl
      ? `<tr><td style="padding:0;line-height:0;font-size:0;"><img src="${card2PngUrl}" alt="" width="600" style="display:block;width:600px;"/></td></tr>`
      : `<tr><td class="gmailfix" style="padding:16px 72px 8px;${WHITE_BG};line-height:normal;">${w4StackedImage(cards[1].imgUrl,cards[1].imgObj,520)}</td></tr>`}
    ${copy.bodyBlock2 ? `
    <tr><td class="gmailfix" style="padding:20px 52px 0;${WHITE_BG};text-align:center;">
      <p class="gmailtext-muted" style="font-family:Arial,sans-serif;font-size:14px;color:#878787;line-height:1.85;margin:0;">${(copy.bodyBlock2).replace(/\n/g,'<br>')}</p>
    </td></tr>` : ''}
    ${copy.closingLine ? `
    <tr><td class="gmailfix" style="padding:20px 52px 0;${WHITE_BG};text-align:center;">
      <p class="gmailtext-muted" style="font-family:Georgia,'Times New Roman',serif;font-size:15px;font-style:italic;color:#878787;line-height:1.7;margin:0;">${copy.closingLine}</p>
    </td></tr>` : ''}
    ${copy.ctaText ? `
    <tr><td class="gmailfix" style="padding:24px 48px 44px;text-align:center;${WHITE_BG};">
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>
        <td style="background:${accent};border-radius:999px;">
          <a href="${copy.ctaUrl||'#'}" style="display:inline-block;padding:15px 40px;font-family:Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:.04em;color:#fff!important;text-decoration:none!important;">${copy.ctaText} &rarr;</a>
        </td>
      </tr></table>
    </td></tr>` : ''}

    <tr><td style="padding:0;line-height:0;font-size:0;">${buildFooter(client, footerData, { defaultBg: '#1a1a1a' })}</td></tr>
  </table>
</td></tr>
</table>
</body></html>`
}

/* ─────────────────────────── registry ──────────────────────────────────── */
const TEMPLATES = [
  { id:10, label:'⭐ Week 2',    build:buildTemplateWeek2 },
  { id:11, label:'⭐ Week 3',    build:buildTemplateWeek3 },
  { id:12, label:'⭐ Week 4',    build:buildTemplateWeek4 },
  { id:13, label:'⭐ Week 5',    build:buildTemplateWeek5 },
  { id:14, label:'⭐ Week 6',    build:buildTemplateWeek6 },
  { id:15, label:'⭐ Week 4 v2', build:buildTemplateWeek4v2 },
]

/* ─────────────────────────── component ─────────────────────────────────── */
export default function TemplatePreview({ pulseGenBtn = false }) {
  const [active, setActive] = useState(0)
  const [zoom,   setZoom]   = useState(1)
  const { theme } = useTheme()
  const dark = theme === 'dark'

  const { selectedClient, generatedCopy, selectedImages, setRenderedHtml, imageGenHtml, setImageGenHtml, headerStyle, imageStyle, aiReasoning, aiRecommendDone, clientFooter, setClientFooter, setTemplateLabel, locationId } = useCampaignStore(s => ({
    selectedClient:   s.selectedClient,
    generatedCopy:    s.generatedCopy,
    selectedImages:   s.selectedImages,
    setRenderedHtml:  s.setRenderedHtml,
    imageGenHtml:     s.imageGenHtml,
    setImageGenHtml:  s.setImageGenHtml,
    headerStyle:      s.headerStyle,
    imageStyle:       s.imageStyle,
    aiReasoning:      s.aiReasoning,
    aiRecommendDone:  s.aiRecommendDone,
    clientFooter:     s.clientFooter,
    setClientFooter:  s.setClientFooter,
    setTemplateLabel: s.setTemplateLabel,
    locationId:       s.locationId,
  }))

  const tpl = TEMPLATES[active]

  // Sync selected template label to store so ApprovalPanel can use it for naming
  useEffect(() => {
    if (tpl?.label) setTemplateLabel(tpl.label.replace(/^[⭐🖼]\s*/, '').trim())
  }, [active])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Hero editor — all week templates ─────────────────────────────────────────
  const isEditable = [10, 11, 12, 13, 14].includes(tpl?.id)
  const [heroScale,   setHeroScale]   = useState(1)
  const [heroX,       setHeroX]       = useState(0)
  const [heroY,       setHeroY]       = useState(0)
  const [textSize,    setTextSize]    = useState(34)
  const [textTop,     setTextTop]     = useState(32)
  const [textLeft,    setTextLeft]    = useState(36)
  const [logoColor,        setLogoColor]        = useState('original') // 'original' | 'white' | 'black'
  const [footerLogoColor, setFooterLogoColor]  = useState('original') // 'original' | 'white' | 'black'
  const [footerLogoSize,  setFooterLogoSize]   = useState(40)
  const [logoTop,     setLogoTop]     = useState(24)
  const [logoRight,   setLogoRight]   = useState(36)
  const [logoSize,    setLogoSize]    = useState(70)
  const [editorSection, setEditorSection] = useState(null) // 'image' | 'headline' | 'logo' | null
  const [editorOpen,    setEditorOpen]    = useState(true)
  const [img1Scale, setImg1Scale] = useState(1)
  const [img1X,     setImg1X]     = useState(0)
  const [img1Y,     setImg1Y]     = useState(0)
  const [img2Scale, setImg2Scale] = useState(1)
  const [img2X,     setImg2X]     = useState(0)
  const [img2Y,     setImg2Y]     = useState(0)
  const [img3Scale, setImg3Scale] = useState(1)
  const [img3X,     setImg3X]     = useState(0)
  const [img3Y,     setImg3Y]     = useState(0)
  const [img4Scale, setImg4Scale] = useState(1)
  const [img4X,     setImg4X]     = useState(0)
  const [img4Y,     setImg4Y]     = useState(0)

  // Reset slider defaults when switching between editable templates
  useEffect(() => {
    if (!isEditable) return
    setHeroScale(1); setHeroX(0); setHeroY(0)
    setImg1Scale(1); setImg1X(0); setImg1Y(0)
    setImg2Scale(1); setImg2X(0); setImg2Y(0)
    setImg3Scale(1); setImg3X(0); setImg3Y(0)
    setImg4Scale(1); setImg4X(0); setImg4Y(0)
    if (tpl?.id === 10) { setTextSize(38); setTextTop(32);  setTextLeft(24);  setLogoColor('original'); setLogoTop(32); setLogoRight(200); setLogoSize(40) }
    if (tpl?.id === 11) { setTextSize(40); setTextTop(14);  setTextLeft(52);  setLogoColor('white');    setLogoTop(40); setLogoRight(36);  setLogoSize(44) }
    if (tpl?.id === 12) { setTextSize(38); setTextTop(20);  setTextLeft(48);  setLogoColor('white');    setLogoTop(40); setLogoRight(36);  setLogoSize(44) }
    if (tpl?.id === 13) { setTextSize(52); setTextTop(32);  setTextLeft(36);  setLogoColor('white');    setLogoTop(28); setLogoRight(36);  setLogoSize(40) }
    if (tpl?.id === 14) { setTextSize(46); setTextTop(32);  setTextLeft(36);  setLogoColor('original'); setLogoTop(28); setLogoRight(40);  setLogoSize(32) }
  }, [tpl?.id])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Week template image generation ───────────────────────────────────────────
  const isWeekTemplate = [9, 10, 11, 12, 13, 14, 5].includes(tpl?.id)
  const [weekGenUrls,     setWeekGenUrls]     = useState({})  // { [tplId]: { hero, sec, ter } }
  const [weekGenLoading,  setWeekGenLoading]  = useState(false)
  const [weekGenError,    setWeekGenError]    = useState(null)
  const [weekGenTrigger,  setWeekGenTrigger]  = useState(0)

  const baseHtml = useMemo(() => {
    if (!generatedCopy?.headlineText) return null
    if (!tpl.build) return null  // HCTI template uses image generation, not HTML build
    let effectiveImages = selectedImages
    const tplUrls = weekGenUrls[tpl?.id] || {}
    if (isWeekTemplate && (tplUrls.hero || tplUrls.sec || tplUrls.ter)) {
      effectiveImages = [...(selectedImages || [])]
      if (tplUrls.hero) effectiveImages[0] = { url: tplUrls.hero, focalX: 50, focalY: 50 }
      if (tplUrls.sec)  effectiveImages[4] = { url: tplUrls.sec,  focalX: 50, focalY: 50 }
      if (tplUrls.ter)  effectiveImages[5] = { url: tplUrls.ter,  focalX: 50, focalY: 50 }
    }
    const editorProps = isEditable ? { heroScale, heroX, heroY, textSize, textTop, textLeft, logoColor, logoTop, logoRight, logoSize, img1Scale, img1X, img1Y, img2Scale, img2X, img2Y, img3Scale, img3X, img3Y, img4Scale, img4X, img4Y } : {}
    const isHeroGenerated = [10, 11, 12, 13, 14].includes(tpl?.id) && !!tplUrls.hero
    const effectiveFooterData = clientFooter
      ? { ...clientFooter, logoColor: footerLogoColor, footerLogoSize }
      : clientFooter
    console.log('[baseHtml] tplId:', tpl?.id, 'isHeroGenerated:', isHeroGenerated, 'tplUrls:', tplUrls, 'effectiveImages[4]:', effectiveImages?.[4], 'effectiveImages[5]:', effectiveImages?.[5])
    return tpl.build({ client:selectedClient, copy:generatedCopy, images:effectiveImages, headerStyle, imageStyle, footerData: effectiveFooterData, isHeroGenerated, ...editorProps })
  }, [active, selectedClient, generatedCopy, selectedImages, headerStyle, imageStyle, clientFooter, footerLogoColor, footerLogoSize, weekGenUrls, heroScale, heroX, heroY, textSize, textTop, textLeft, logoColor, logoTop, logoRight, logoSize, img1Scale, img1X, img1Y, img2Scale, img2X, img2Y, img3Scale, img3X, img3Y, img4Scale, img4X, img4Y])

  // Keep store in sync so ApprovalPanel always has the latest HTML
  useEffect(() => {
    if (baseHtml) setRenderedHtml(baseHtml)
  }, [baseHtml])

  // Auto-analyze focal points for selected images that haven't been analyzed yet
  useEffect(() => {
    const images = useCampaignStore.getState().selectedImages
    const { setSelectedImages } = useCampaignStore.getState()
    images.forEach((img, idx) => {
      if (!img || img.focalX != null) return
      const urlToUse = img.url || img.thumbnailUrl
      if (!urlToUse) return
      analyzeImageFocal({ imageUrl: urlToUse })
        .then(({ focalX, focalY }) => {
          const latest = [...useCampaignStore.getState().selectedImages]
          if (latest[idx]?.id === img.id) {
            latest[idx] = { ...latest[idx], focalX, focalY }
            setSelectedImages(latest)
          }
        })
        .catch(() => {})
    })
  }, [selectedImages])

  // Fetch footer data from brand board sheet whenever the selected client changes.
  // Falls back to a mock so templates always show a full footer preview.
  useEffect(() => {
    if (!selectedClient?.name) return
    const mockFooter = {
      found:          true,
      bgColor:        '#1c1c1c',
      buttonColor:    '#e84b8a',
      secondaryColor: '#c8965a',
      contactInfo:  `hello@${(selectedClient.name||'brand').toLowerCase().replace(/\s+/g,'')}.com`,
      footerText:   `© ${new Date().getFullYear()} ${selectedClient.name}. All rights reserved.`,
      instagramUrl: 'https://www.instagram.com/',
      facebookUrl:  'https://www.facebook.com/',
      tiktokUrl:    'https://www.tiktok.com/',
      websiteUrl:   '',
    }
    fetchFooterData({ clientName: selectedClient.name })
      .then(data => {
        if (data?.found) setClientFooter(data)
        else setClientFooter(mockFooter)  // sheet has no entry yet → use mock
      })
      .catch(() => setClientFooter(mockFooter))
  }, [selectedClient?.name])  // eslint-disable-line react-hooks/exhaustive-deps

  // Inject zoom into the email body — iframe stays full size, content scales
  const previewHtml = useMemo(() => {
    if (!baseHtml) return null
    return baseHtml.replace('<body', `<body style="zoom:${zoom}"`)
  }, [baseHtml, zoom])

  // Write preview HTML into the iframe without reloading the document so scroll position is preserved
  const iframeRef = useRef(null)
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !previewHtml) return
    const savedY = iframe.contentWindow?.scrollY ?? 0
    iframe.contentDocument.open()
    iframe.contentDocument.write(previewHtml)
    iframe.contentDocument.close()
    // Two rAFs: first lets the DOM settle, second lets paint finish before restoring scroll
    requestAnimationFrame(() => requestAnimationFrame(() => {
      iframe.contentWindow?.scrollTo(0, savedY)
    }))
  }, [previewHtml])

  const { setHeaderStyle, setImageStyle, setTemplateStyle } = useCampaignStore(s => ({
    setHeaderStyle:  s.setHeaderStyle,
    setImageStyle:   s.setImageStyle,
    setTemplateStyle: s.setTemplateStyle,
  }))
  const [aiLoading,  setAiLoading]  = useState(false)
  const [aiError,    setAiError]    = useState(null)
  const [aiApplied,  setAiApplied]  = useState(false)

  // ── Image Gen (html2image.net) ────────────────────────────────────────────
  const isHcti = tpl?.id === 8
  const [hctiHero,     setHctiHero]     = useState(null)
  const [hctiPolaroid, setHctiPolaroid] = useState(null)
  const [hctiLoading,  setHctiLoading]  = useState(false)
  const [hctiError,    setHctiError]    = useState(null)
  const [hctiEmail,    setHctiEmail]    = useState(null)
  const [hctiTrigger,  setHctiTrigger]  = useState(0)  // manual generate button

  // Seed local state from store on mount (survives tab/step navigation)
  useEffect(() => {
    if (imageGenHtml && !hctiEmail) {
      setHctiEmail(imageGenHtml)
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isHcti) return
    if (!generatedCopy?.headlineText) return
    if (hctiTrigger === 0) return  // don't auto-fire — wait for user to click Generate
    const heroImg  = selectedImages?.[0]?.url || selectedImages?.[0]?.thumbnailUrl
    const img1     = selectedImages?.[1]?.url || selectedImages?.[1]?.thumbnailUrl
    const img2     = selectedImages?.[2]?.url || selectedImages?.[2]?.thumbnailUrl
    const logoUrl  = selectedClient?.logoUrl || ''
    const headline = generatedCopy?.headlineText || ''
    const client   = selectedClient?.name || ''

    setHctiLoading(true)
    setHctiError(null)
    setHctiHero(null)
    setHctiPolaroid(null)
    setHctiEmail(null)

    const heroHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;900&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px}</style>
</head><body>
<div style="position:relative;width:600px;height:580px;overflow:hidden;">
  ${heroImg ? `<img src="${heroImg}" style="width:100%;height:580px;object-fit:cover;display:block;" />` : `<div style="width:100%;height:580px;background:#c8c0b5;"></div>`}
  <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0.52) 0%,rgba(0,0,0,0.05) 50%,rgba(0,0,0,0.45) 100%);display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:28px 40px 72px;text-align:center;">
    ${logoUrl ? `<img src="${logoUrl}" style="height:44px;width:auto;max-width:160px;object-fit:contain;filter:drop-shadow(0 1px 6px rgba(0,0,0,0.5));" />` : `<span style="font-size:14px;letter-spacing:.28em;text-transform:uppercase;color:#fff;font-family:Arial,sans-serif;font-weight:700;text-shadow:0 1px 8px rgba(0,0,0,0.6)">${client}</span>`}
    <div style="font-size:38px;font-weight:900;line-height:1.2;color:#fff;font-family:'Playfair Display',Georgia,serif;text-shadow:0 2px 20px rgba(0,0,0,0.7);letter-spacing:-0.3px;padding:0 8px;">${headline}</div>
  </div>
  <div style="position:absolute;bottom:-1px;left:0;right:0;line-height:0;">
    <svg viewBox="0 0 600 60" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style="display:block;width:600px;">
      <path d="M0,60 L0,30 C75,52 150,10 225,30 C300,50 375,8 450,26 C525,44 575,14 600,24 L600,60 Z" fill="#ffffff"/>
    </svg>
  </div>
</div>
</body></html>`

    const polaroidHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:#faf9f7}</style>
</head><body>
<div style="padding:40px 32px 48px;background:#faf9f7;display:flex;flex-direction:column;align-items:center;">
  <div style="display:flex;align-items:flex-start;justify-content:center;gap:24px;width:100%;">
    <div style="background:#fff;padding:10px 10px 36px;box-shadow:0 4px 20px rgba(0,0,0,0.18);flex:1;max-width:240px;transform:rotate(-4deg);margin-top:20px;">
      ${img1 ? `<img src="${img1}" style="display:block;width:100%;height:190px;object-fit:cover;" />` : `<div style="width:100%;height:190px;background:#ddd;"></div>`}
    </div>
    <div style="background:#fff;padding:10px 10px 36px;box-shadow:0 4px 20px rgba(0,0,0,0.18);flex:1;max-width:240px;transform:rotate(3deg);">
      ${img2 ? `<img src="${img2}" style="display:block;width:100%;height:190px;object-fit:cover;" />` : `<div style="width:100%;height:190px;background:#ddd;"></div>`}
    </div>
  </div>
  <div style="margin-top:36px;font-family:'Dancing Script',cursive;font-size:36px;color:#b07a50;line-height:1.2;">Favorite Memories</div>
</div>
</body></html>`

    Promise.all([
      htmlToImage({ html: heroHtml,     width: 600, height: 620 }),
      htmlToImage({ html: polaroidHtml, width: 600, height: 420 }),
    ])
      .then(([heroRes, polaroidRes]) => {
        setHctiHero(heroRes.url)
        setHctiPolaroid(polaroidRes.url)

        // Build the full email HTML with PNGs embedded — this is what goes to GHL
        const copy    = generatedCopy || {}
        const subhead = copy.subhead     || ''
        const body    = (copy.bodyText   || '').replace(/\n/g, '<br>')
        const cta     = copy.ctaText     || 'Book Now'
        const closing = copy.closingLine || ''
        const b2title = copy.body2Title  || ''
        const b2body  = copy.body2Text   || ''

        const assembledEmail = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#f5f2ed;font-family:Arial,Helvetica,sans-serif;color:#1c1c1c}
  .wrap{max-width:600px;margin:0 auto;background:#fff}
  .img-block{line-height:0}
  .img-block img{width:100%;display:block}
  .section{padding:40px 48px}
  .subhead{font-size:18px;line-height:1.65;color:#3d3830;margin-bottom:28px;text-align:center;font-family:Arial,Helvetica,sans-serif}
  .body-text{font-size:15px;line-height:1.85;color:#3d3830;margin-bottom:0;font-family:Arial,Helvetica,sans-serif}
  .cta-wrap{margin:28px 0;text-align:center}
  .cta{display:inline-block;padding:14px 40px;background:#3d2314;color:#fff;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;text-decoration:none;border-radius:6px;letter-spacing:.04em}
  .b2-section{padding:36px 48px}
  .b2-title{font-size:16px;font-weight:700;color:#1a1a1a;margin-bottom:12px;font-family:Arial,Helvetica,sans-serif}
  .b2-body{font-size:15px;line-height:1.85;color:#3d3830;margin-bottom:22px;font-family:Arial,Helvetica,sans-serif}
  .closing{font-size:15px;color:#5c5248;font-style:italic;margin-bottom:28px;font-family:Arial,Helvetica,sans-serif}
  .footer{background:#1c1c1c;padding:20px 40px;text-align:center;font-size:10px;color:#6b6458;font-family:Arial,Helvetica,sans-serif;letter-spacing:.1em;text-transform:uppercase}
</style></head><body>
<div class="wrap">

  <!-- 1. Hero PNG -->
  <div class="img-block"><img src="${heroRes.url}" width="600" style="width:100%;display:block;" alt=""/></div>

  <!-- 2. Subhead + CTA + Body -->
  <div class="section">
    ${subhead ? `<p class="subhead">${subhead}</p>` : ''}
    ${cta     ? `<div class="cta-wrap"><a href="#" class="cta">${cta}</a></div>` : ''}
    ${body    ? `<p class="body-text">${body}</p>` : ''}
  </div>

  <!-- 3. Polaroid PNG -->
  <div class="img-block"><img src="${polaroidRes.url}" width="600" style="width:100%;display:block;" alt=""/></div>

  <!-- 4. Body Block 2 + Closing Line + CTA -->
  <div class="b2-section">
    ${b2title  ? `<p class="b2-title">${b2title}</p>` : ''}
    ${b2body   ? `<p class="b2-body">${b2body}</p>` : ''}
    ${closing  ? `<p class="closing">${closing}</p>` : ''}
    ${cta      ? `<div class="cta-wrap"><a href="#" class="cta">${cta}</a></div>` : ''}
  </div>

  <!-- 5. Footer -->
  <div class="footer">© ${new Date().getFullYear()} ${selectedClient?.name || 'Brand'} &nbsp;·&nbsp; <a href="#" style="color:#6b6458">Unsubscribe</a></div>

</div>
</body></html>`

        setRenderedHtml(assembledEmail)
        setHctiEmail(assembledEmail)
        setImageGenHtml(assembledEmail)  // persist to store — survives step/tab navigation
      })
      .catch(err => setHctiError(err.message))
      .finally(() => setHctiLoading(false))
  // Only re-run when URLs or headline actually change, or user clicks Generate
  // NOT on focal point updates (which change selectedImages but not URLs)
  }, [hctiTrigger])

  // Calls html2image.net first; falls back to Puppeteer + GHL upload
  const renderImage = useCallback(async ({ html, width, height }) => {
    return await htmlToImage({ html, width, height, locationId, apiKey: selectedClient?.ghlApiKey })
  }, [locationId, selectedClient?.ghlApiKey])

  // Week template image generation effect
  useEffect(() => {
    if (!isWeekTemplate) return
    if (weekGenTrigger === 0) return
    const heroImgUrl = selectedImages?.[0]?.url || selectedImages?.[0]?.thumbnailUrl || ''
    const img1Url    = selectedImages?.[1]?.url || selectedImages?.[1]?.thumbnailUrl || ''
    const img2Url    = selectedImages?.[2]?.url || selectedImages?.[2]?.thumbnailUrl || ''
    const img3Url    = selectedImages?.[3]?.url || selectedImages?.[3]?.thumbnailUrl || ''
    const img4Url    = selectedImages?.[4]?.url || selectedImages?.[4]?.thumbnailUrl || ''
    const logoUrl    = selectedClient?.logoUrl || ''
    const headline   = generatedCopy?.headlineText || ''
    const clientName = selectedClient?.name || ''
    // Week 5 two-font split
    const w5words = headline.trim().split(/\s+/).filter(Boolean)
    const w5First = w5words.length >= 2 ? w5words[0] : ''
    const w5Last  = w5words.length >= 3 ? w5words[w5words.length - 1] : ''
    const w5Main  = w5words.length >= 3 ? w5words.slice(1, -1).join(' ') : w5words.length === 2 ? w5words[1] : w5words[0] || ''
    const midBg      = clientFooter?.bgColor || '#fff'

    setWeekGenLoading(true)
    setWeekGenError(null)

    // Week 2: bake the full arch (image + gradient + headline) into a single PNG
    // Week 3: bake full-bleed hero (image + dark gradient + white fade + logo + headline) + stacked cards
    // Week 4: bake hero inset card + two stacked property card images
    const isWeek2 = tpl?.id === 10
    const isWeek3 = tpl?.id === 11
    const isWeek4 = tpl?.id === 12
    const isWeek5 = tpl?.id === 13
    const isWeek6 = tpl?.id === 14
    const renderLogoFilter = logoColor === 'white' ? 'brightness(0) invert(1)' : logoColor === 'black' ? 'brightness(0)' : 'none'
    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="" style="height:${logoSize}px;width:auto;max-width:${logoSize * 5}px;display:inline-block;filter:${renderLogoFilter};"/>`
      : `<span style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#fff;">${clientName}</span>`

    const heroHtml = isWeek2
      ? `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:${midBg};}</style>
</head><body>
<div style="width:600px;height:460px;padding:0 36px;background:${midBg};box-sizing:border-box;line-height:0;font-size:0;">
  <div style="position:relative;width:528px;height:460px;border-radius:999px 999px 0 0;overflow:hidden;">
    ${heroImgUrl ? `<img src="${heroImgUrl}" style="width:528px;height:460px;object-fit:cover;display:block;object-position:50% 50%;"/>` : `<div style="width:528px;height:460px;background:#c8c0b5;"></div>`}
    <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0) 0%,rgba(0,0,0,0) 50%,rgba(0,0,0,0.45) 100%);">
      <div style="position:absolute;bottom:32px;left:0;right:0;text-align:center;padding:0 24px;line-height:normal;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:${textSize}px;font-weight:700;color:#fff;line-height:1.12;text-shadow:0 2px 10px rgba(0,0,0,.3);display:inline-block;max-width:360px;">${headline}</div>
      </div>
    </div>
  </div>
</div>
</body></html>`
      : isWeek3
      ? `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&display=swap" rel="stylesheet"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;}</style>
</head><body>
<div style="position:relative;width:600px;height:600px;overflow:hidden;border-radius:20px 20px 0 0;background:#1a1a1a;">
  ${heroImgUrl ? `<img src="${heroImgUrl}" style="position:absolute;top:${Math.min(0,Math.max(600*(1-heroScale),-(600*(heroScale-1)/2)+heroY))}px;left:${Math.min(0,Math.max(600*(1-heroScale),-(600*(heroScale-1)/2)+heroX))}px;width:${600*heroScale}px;height:${600*heroScale}px;object-fit:cover;display:block;"/>` : `<div style="width:600px;height:600px;background:#2a2a2a;"></div>`}
  <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0.72) 0%,rgba(0,0,0,0.28) 42%,rgba(0,0,0,0) 65%);">
    <div style="text-align:center;padding-top:${logoTop}px;">${logoHtml}</div>
    <div style="text-align:center;padding:${textTop}px ${textLeft}px 0;">
      <div style="font-family:'Playfair Display',Georgia,serif;font-size:${textSize}px;font-weight:600;line-height:1.12;color:#fff;text-shadow:0 2px 20px rgba(0,0,0,0.4);">${headline}</div>
    </div>
  </div>
  <div style="position:absolute;bottom:0;left:0;right:0;height:160px;background:linear-gradient(to bottom,rgba(255,255,255,0),rgba(255,255,255,1));"></div>
</div>
</body></html>`
      : `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px}</style>
</head><body>
<div style="position:relative;width:600px;height:400px;overflow:hidden;">
  ${heroImgUrl ? `<img src="${heroImgUrl}" style="width:600px;height:400px;object-fit:cover;display:block;"/>` : `<div style="width:600px;height:400px;background:#c8c0b5;"></div>`}
</div>
</body></html>`

    // ── Week 4 hero: inset card with rounded border, dark gradient, logo + headline ──
    const heroFp4   = selectedImages?.[0]?.focalX != null ? `${selectedImages[0].focalX}% ${selectedImages[0].focalY}%` : '50% 30%'
    const card1Fp4  = selectedImages?.[1]?.focalX != null ? `${selectedImages[1].focalX}% ${selectedImages[1].focalY}%` : '50% 50%'
    const card2Fp4  = selectedImages?.[2]?.focalX != null ? `${selectedImages[2].focalX}% ${selectedImages[2].focalY}%` : '50% 50%'
    const card1ImgUrl = selectedImages?.[1]?.url || heroImgUrl
    const card2ImgUrl = selectedImages?.[2]?.url || heroImgUrl

    const week4HeroHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:#fff;}</style>
</head><body>
<div style="padding:20px 20px 0;background:#fff;line-height:0;font-size:0;">
  <div style="position:relative;width:560px;height:720px;overflow:hidden;border-radius:16px;background:#1a1a1a;">
    ${heroImgUrl ? `<img src="${heroImgUrl}" style="position:absolute;top:${Math.min(0,Math.max(720*(1-heroScale),-(720*(heroScale-1)/2)+heroY))}px;left:${Math.min(0,Math.max(560*(1-heroScale),-(560*(heroScale-1)/2)+heroX))}px;width:${560*heroScale}px;height:${720*heroScale}px;object-fit:cover;display:block;"/>` : `<div style="width:560px;height:720px;background:#2a2a2a;"></div>`}
    <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0.78) 0%,rgba(0,0,0,0.38) 45%,rgba(0,0,0,0.05) 75%,rgba(0,0,0,0) 100%);line-height:normal;font-size:initial;">
      <div style="text-align:center;padding-top:${logoTop}px;">${logoHtml}</div>
      <div style="text-align:center;padding:${textTop}px ${textLeft}px 0;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:${textSize}px;font-weight:700;line-height:1.12;color:#fff;">${headline}</div>
      </div>
    </div>
  </div>
</div>
</body></html>`

    // ── Week 4 stacked card PNGs (background-image approach for Chromium reliability) ──
    // Card 1: height=460 → total stacked area = 508px, outer padding 28/8 top/bottom, 72 sides
    const week4Card1Html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:#fff;}</style>
</head><body>
<div style="padding:28px 72px 8px;background:#fff;">
  <div style="position:relative;height:508px;">
    <div style="position:absolute;top:24px;left:24px;right:24px;bottom:24px;border-radius:16px;transform:rotate(5deg);transform-origin:center;background:url('${card1ImgUrl}') ${card1Fp4}/cover no-repeat;opacity:0.45;"></div>
    <div style="position:absolute;top:24px;left:24px;right:24px;bottom:24px;border-radius:16px;overflow:hidden;z-index:1;background:url('${card1ImgUrl}') ${card1Fp4}/cover no-repeat;"></div>
  </div>
</div>
</body></html>`

    // Card 2: height=520 → total stacked area = 568px, outer padding 16/8 top/bottom, 72 sides
    const week4Card2Html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:#fff;}</style>
</head><body>
<div style="padding:16px 72px 8px;background:#fff;">
  <div style="position:relative;height:568px;">
    <div style="position:absolute;top:24px;left:24px;right:24px;bottom:24px;border-radius:16px;transform:rotate(5deg);transform-origin:center;background:url('${card2ImgUrl}') ${card2Fp4}/cover no-repeat;opacity:0.45;"></div>
    <div style="position:absolute;top:24px;left:24px;right:24px;bottom:24px;border-radius:16px;overflow:hidden;z-index:1;background:url('${card2ImgUrl}') ${card2Fp4}/cover no-repeat;"></div>
  </div>
</div>
</body></html>`

    // Right card falls back to img1 if img2 isn't selected
    const card2Url = img2Url || img1Url

    const stackedHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:#ffffff;}</style>
</head><body>
<div style="position:relative;width:600px;height:420px;background:#ffffff;">
  <div style="position:absolute;left:28px;top:24px;width:272px;height:372px;border-radius:20px;transform:rotate(-3deg);transform-origin:center center;box-shadow:4px 0 20px rgba(0,0,0,0.18);overflow:hidden;z-index:1;">
    ${img1Url ? `<img src="${img1Url}" style="width:272px;height:372px;object-fit:cover;display:block;object-position:${card1Fp4};transform:translate(${img1X}px,${img1Y}px) scale(${img1Scale});transform-origin:center center;"/>` : ''}
  </div>
  <div style="position:absolute;left:296px;top:24px;width:272px;height:372px;border-radius:20px;transform:rotate(3deg);transform-origin:center center;box-shadow:-4px 0 20px rgba(0,0,0,0.18);overflow:hidden;z-index:2;">
    ${card2Url ? `<img src="${card2Url}" style="width:272px;height:372px;object-fit:cover;display:block;object-position:${img2Url ? card2Fp4 : card1Fp4};transform:translate(${img2X}px,${img2Y}px) scale(${img2Scale});transform-origin:center center;"/>` : ''}
  </div>
</div>
</body></html>`

    // Week 3 body image: padded single image with border-radius (ter slot)
    const w3BodySrc = img3Url || img1Url
    const w3BodyFp  = (img3Url ? selectedImages?.[3] : selectedImages?.[1])?.focalX != null
      ? `${(img3Url ? selectedImages[3] : selectedImages[1]).focalX}% ${(img3Url ? selectedImages[3] : selectedImages[1]).focalY}%`
      : '50% 50%'
    const week3BodyHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:#ffffff;}</style>
</head><body>
<div style="padding:20px 40px 0;background:#ffffff;width:600px;">
  ${w3BodySrc ? `<div style="overflow:hidden;width:520px;height:320px;border-radius:14px;"><img src="${w3BodySrc}" alt="" width="520" style="width:520px;height:320px;object-fit:cover;display:block;object-position:${w3BodyFp};transform:translate(${img3X}px,${img3Y}px) scale(${img3Scale});transform-origin:center center;"/></div>` : `<div style="width:520px;height:320px;background:#e8e4de;border-radius:14px;"></div>`}
</div>
</body></html>`

    const polaroidHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:#f5f0e8}</style>
</head><body>
<div style="position:relative;width:600px;height:340px;overflow:hidden;">
  ${img1Url ? `<div style="position:absolute;left:55px;top:28px;width:255px;height:280px;background:#fff;border-radius:8px;transform:rotate(-4deg);box-shadow:0 8px 24px rgba(0,0,0,0.28);overflow:hidden;"><img src="${img1Url}" style="width:100%;height:100%;object-fit:cover;display:block;"/></div>` : ''}
  ${img2Url ? `<div style="position:absolute;right:55px;top:18px;width:255px;height:280px;background:#fff;border-radius:8px;transform:rotate(4deg);box-shadow:0 8px 24px rgba(0,0,0,0.28);overflow:hidden;"><img src="${img2Url}" style="width:100%;height:100%;object-fit:cover;display:block;"/></div>` : ''}
</div>
</body></html>`

    // ── Week 5 hero: full-bleed image + logo top-left + white-fade + headline ──
    // Week 5 hero: same inset card as Week 4 — padded, rounded, centered logo + serif headline
    const heroFp5 = selectedImages?.[0]?.focalX != null ? `${selectedImages[0].focalX}% ${selectedImages[0].focalY}%` : '50% 30%'
    const week5HeroHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,700;1,400&display=swap" rel="stylesheet"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:#fff;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}</style>
</head><body>
<div style="padding:20px 20px 0;background:#fff;line-height:0;font-size:0;">
  <div style="position:relative;width:560px;height:680px;overflow:hidden;border-radius:0;background:#1a1a1a;">
    ${heroImgUrl ? `<img src="${heroImgUrl}" style="position:absolute;top:${Math.min(0,Math.max(680*(1-heroScale),-(680*(heroScale-1)/2)+heroY))}px;left:${Math.min(0,Math.max(560*(1-heroScale),-(560*(heroScale-1)/2)+heroX))}px;width:${560*heroScale}px;height:${680*heroScale}px;object-fit:cover;display:block;"/>` : `<div style="width:560px;height:680px;background:#2a2a2a;"></div>`}
    <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0.55) 0%,rgba(0,0,0,0.25) 40%,rgba(0,0,0,0.45) 100%);line-height:normal;font-size:initial;">
      <div style="text-align:center;padding-top:${logoTop}px;">${logoHtml}</div>
      <div style="position:absolute;left:${textLeft}px;right:${textLeft}px;top:${textTop}%;">
        ${w5First ? `<div style="font-family:'Lora',serif;font-size:${Math.round(textSize * 0.8)}px;font-style:italic;font-weight:400;color:#fff;line-height:1;text-shadow:0 2px 12px rgba(0,0,0,.3);margin-bottom:2px;">${w5First}</div>` : ''}
        <div style="font-family:'Lora',serif;font-size:${textSize}px;font-weight:700;text-transform:uppercase;color:#fff;line-height:1.0;text-shadow:0 2px 20px rgba(0,0,0,.25);">${w5Main}${w5Last ? ` <span style="font-family:'Lora',serif;font-style:italic;font-weight:400;text-transform:none;font-size:${Math.round(textSize*0.9)}px;">${w5Last}</span>` : ''}</div>
      </div>
    </div>
  </div>
</div>
</body></html>`

    // ── Week 5 zigzag grid: 2×2 with narrow|wide / wide|narrow rows (sec slot) ──
    const grid1Fp = selectedImages?.[1]?.focalX != null ? `${selectedImages[1].focalX}% ${selectedImages[1].focalY}%` : '50% 50%'
    const grid2Fp = selectedImages?.[2]?.focalX != null ? `${selectedImages[2].focalX}% ${selectedImages[2].focalY}%` : '50% 50%'
    const grid3Fp = selectedImages?.[3]?.focalX != null ? `${selectedImages[3].focalX}% ${selectedImages[3].focalY}%` : '50% 50%'
    const grid4Fp = selectedImages?.[4]?.focalX != null ? `${selectedImages[4].focalX}% ${selectedImages[4].focalY}%` : '50% 50%'
    const week5GridHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:#ffffff;}</style>
</head><body>
<table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;border-collapse:collapse;background:#ffffff;">
  <tr>
    <td width="297" style="width:297px;vertical-align:top;line-height:0;font-size:0;">
      ${img1Url ? `<div style="overflow:hidden;width:297px;height:262px;"><img src="${img1Url}" alt="" width="297" style="width:297px;height:262px;object-fit:cover;display:block;object-position:${grid1Fp};transform:translate(${img1X}px,${img1Y}px) scale(${img1Scale});transform-origin:center center;"/></div>` : `<div style="width:297px;height:262px;background:#e8e4de;"></div>`}
    </td>
    <td width="6" style="width:6px;line-height:0;font-size:0;background:#ffffff;"></td>
    <td width="297" style="width:297px;vertical-align:top;line-height:0;font-size:0;">
      ${img2Url ? `<div style="overflow:hidden;width:297px;height:262px;"><img src="${img2Url}" alt="" width="297" style="width:297px;height:262px;object-fit:cover;display:block;object-position:${grid2Fp};transform:translate(${img2X}px,${img2Y}px) scale(${img2Scale});transform-origin:center center;"/></div>` : `<div style="width:297px;height:262px;background:#e8e4de;"></div>`}
    </td>
  </tr>
  <tr><td colspan="3" height="6" style="height:6px;line-height:0;font-size:0;background:#ffffff;"></td></tr>
  <tr>
    <td width="297" style="width:297px;vertical-align:top;line-height:0;font-size:0;">
      ${(img4Url || img1Url) ? `<div style="overflow:hidden;width:297px;height:262px;"><img src="${img4Url || img1Url}" alt="" width="297" style="width:297px;height:262px;object-fit:cover;display:block;object-position:${img4Url ? grid4Fp : grid1Fp};transform:translate(${img4X}px,${img4Y}px) scale(${img4Scale});transform-origin:center center;"/></div>` : `<div style="width:297px;height:262px;background:#e8e4de;"></div>`}
    </td>
    <td width="6" style="width:6px;line-height:0;font-size:0;background:#ffffff;"></td>
    <td width="297" style="width:297px;vertical-align:top;line-height:0;font-size:0;">
      ${(img3Url || img1Url) ? `<div style="overflow:hidden;width:297px;height:262px;"><img src="${img3Url || img1Url}" alt="" width="297" style="width:297px;height:262px;object-fit:cover;display:block;object-position:${img3Url ? grid3Fp : grid1Fp};transform:translate(${img3X}px,${img3Y}px) scale(${img3Scale});transform-origin:center center;"/></div>` : `<div style="width:297px;height:262px;background:#e8e4de;"></div>`}
    </td>
  </tr>
</table>
</body></html>`

    // ── Week 6 hero: padded inset image card with left-aligned two-font headline ──
    const heroFp6 = selectedImages?.[0]?.focalX != null ? `${selectedImages[0].focalX}% ${selectedImages[0].focalY}%` : '50% 30%'
    const w6words = headline.trim().split(/\s+/).filter(Boolean)
    const w6Body  = w6words.length > 1 ? w6words.slice(0, -1).join(' ') : w6words[0] || ''
    const w6Last  = w6words.length > 1 ? w6words[w6words.length - 1] : ''
    const w6LogoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="" style="height:${logoSize}px;width:auto;max-width:${logoSize * 5}px;display:inline-block;filter:${renderLogoFilter};"/>`
      : `<span style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#1a1a1a;">${clientName}</span>`
    const week6HeroHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,700;1,400&display=swap" rel="stylesheet"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;overflow:hidden;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}</style>
</head><body>
<!-- White header: logo left + nav link right -->
<div style="background:#ffffff;width:600px;padding:0 0 20px;box-sizing:border-box;line-height:normal;font-size:initial;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;">
    <tr>
      <td style="padding:${logoTop}px 0 0 ${logoRight}px;vertical-align:top;">${w6LogoHtml}</td>
      <td style="text-align:right;vertical-align:middle;padding-right:40px;">
        ${generatedCopy?.ctaText ? `<span style="font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:#1a1a1a;letter-spacing:.01em;">${generatedCopy.ctaText} ›</span>` : ''}
      </td>
    </tr>
  </table>
</div>
<!-- Blurred hero section -->
<div style="position:relative;width:600px;height:740px;overflow:hidden;">
  ${heroImgUrl
    ? `<img src="${heroImgUrl}" style="position:absolute;top:-30px;left:-30px;width:660px;height:800px;object-fit:cover;object-position:calc(50% + ${heroX}px) calc(50% + ${heroY}px);filter:blur(36px) saturate(1.4) brightness(0.82);display:block;"/>`
    : `<div style="position:absolute;inset:0;background:linear-gradient(160deg,#7ab5d8,#6ba87a);"></div>`}
  <!-- Inset image card -->
  <div style="position:absolute;left:28px;top:22px;right:28px;">
    <div style="position:relative;width:544px;height:480px;overflow:hidden;border-radius:20px;box-shadow:0 6px 40px rgba(0,0,0,0.3);border:2px solid rgba(255,255,255,0.55);">
      ${heroImgUrl ? `<img src="${heroImgUrl}" style="position:absolute;top:${Math.min(0,Math.max(480*(1-heroScale),-(480*(heroScale-1)/2)+heroY))}px;left:${Math.min(0,Math.max(544*(1-heroScale),-(544*(heroScale-1)/2)+heroX))}px;width:${544*heroScale}px;height:${480*heroScale}px;object-fit:cover;display:block;"/>` : ''}
      <div style="position:absolute;top:0;left:0;right:0;height:72%;background:linear-gradient(to bottom,rgba(0,0,0,0.52) 0%,rgba(0,0,0,0.16) 65%,rgba(0,0,0,0) 100%);"></div>
      <div style="position:absolute;top:0;left:0;right:0;padding:${textTop}px ${textLeft}px 0;line-height:normal;font-size:initial;text-align:center;">
        <div style="font-family:'Lora',serif;font-size:${textSize}px;font-weight:700;color:#fff;line-height:1.0;text-shadow:0 2px 16px rgba(0,0,0,.3);">${w6Body}</div>
        ${w6Last ? `<div style="font-family:'Lora',serif;font-style:italic;font-weight:400;font-size:${Math.round(textSize * 1.17)}px;color:#fff;line-height:1.0;text-shadow:0 2px 16px rgba(0,0,0,.3);">${w6Last}</div>` : ''}
      </div>
    </div>
  </div>
  <!-- Subhead on gradient — close to CTA -->
  <div style="position:absolute;top:548px;left:44px;right:44px;text-align:center;line-height:normal;font-size:initial;">
    <p style="font-family:'Lora',serif;font-size:17px;font-style:italic;line-height:1.6;color:#fff;margin:0;text-shadow:0 1px 8px rgba(0,0,0,.25);">${generatedCopy?.subhead || ''}</p>
  </div>
  <!-- CTA on gradient + arrow below -->
  <div style="position:absolute;top:610px;left:0;right:0;text-align:center;line-height:normal;font-size:initial;">
    <div style="display:inline-block;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.85);border-radius:100px;padding:14px 44px;">
      <span style="font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#fff;letter-spacing:.03em;white-space:nowrap;">${generatedCopy?.ctaText || ''}</span>
    </div>
    <div style="margin-top:0;line-height:0;font-size:0;text-align:center;">
      <div style="display:inline-block;width:2px;height:22px;background:rgba(255,255,255,0.7);vertical-align:top;"></div>
      <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:10px solid rgba(255,255,255,0.7);margin:0 auto;"></div>
    </div>
  </div>
</div>
</body></html>`

    // ── Week 6 grid: 2-up top row (277+6+277) + 1 full-width bottom (560), padded ──
    const w6grid1Fp = selectedImages?.[1]?.focalX != null ? `${selectedImages[1].focalX}% ${selectedImages[1].focalY}%` : '50% 50%'
    const w6grid2Fp = selectedImages?.[2]?.focalX != null ? `${selectedImages[2].focalX}% ${selectedImages[2].focalY}%` : '50% 50%'
    const w6grid3Fp = selectedImages?.[3]?.focalX != null ? `${selectedImages[3].focalX}% ${selectedImages[3].focalY}%` : '50% 50%'
    const week6GridHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:600px;background:#ffffff;}</style>
</head><body>
<div style="padding:32px 20px 0;background:#ffffff;width:600px;">
  <table width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;border-collapse:collapse;">
    <tr>
      <td width="277" style="width:277px;vertical-align:top;line-height:0;font-size:0;">
        ${img1Url ? `<div style="overflow:hidden;width:277px;height:240px;border-radius:12px;"><img src="${img1Url}" alt="" width="277" style="width:277px;height:240px;object-fit:cover;display:block;object-position:${w6grid1Fp};transform:translate(${img1X}px,${img1Y}px) scale(${img1Scale});transform-origin:center center;"/></div>` : `<div style="width:277px;height:240px;background:#e0e4ea;border-radius:12px;"></div>`}
      </td>
      <td width="6" style="width:6px;line-height:0;font-size:0;"></td>
      <td width="277" style="width:277px;vertical-align:top;line-height:0;font-size:0;">
        ${img2Url ? `<div style="overflow:hidden;width:277px;height:240px;border-radius:12px;"><img src="${img2Url}" alt="" width="277" style="width:277px;height:240px;object-fit:cover;display:block;object-position:${w6grid2Fp};transform:translate(${img2X}px,${img2Y}px) scale(${img2Scale});transform-origin:center center;"/></div>` : `<div style="width:277px;height:240px;background:#e0e4ea;border-radius:12px;"></div>`}
      </td>
    </tr>
  </table>
  ${(img3Url || img1Url) ? `<div style="padding-top:12px;line-height:0;font-size:0;"><div style="overflow:hidden;width:560px;height:300px;border-radius:12px;"><img src="${img3Url || img1Url}" alt="" width="560" style="width:560px;height:300px;object-fit:cover;display:block;object-position:${img3Url ? w6grid3Fp : w6grid1Fp};transform:translate(${img3X}px,${img3Y}px) scale(${img3Scale});transform-origin:center center;"/></div></div>` : ''}
</div>
</body></html>`

    const heroHeight = isWeek2 ? 460 : isWeek3 ? 600 : isWeek4 ? 740 : isWeek5 ? 720 : isWeek6 ? 820 : 400
    const secondaryPromise = isWeek3 && (img1Url || img2Url)
      ? renderImage({ html: stackedHtml, width: 600, height: 420 })
      : isWeek4
        ? renderImage({ html: week4Card1Html, width: 600, height: 544 })
        : isWeek5 && (img1Url || img2Url)
          ? renderImage({ html: week5GridHtml, width: 600, height: 530 })
          : isWeek6 && (img1Url || img2Url || img3Url)
            ? renderImage({ html: week6GridHtml, width: 600, height: 584 })
            : (!isWeek2 && !isWeek3 && !isWeek5 && !isWeek6 && (img1Url || img2Url))
              ? renderImage({ html: polaroidHtml, width: 600, height: 340 })
              : Promise.resolve(null)

    const tertiaryPromise = isWeek3 && (img3Url || img1Url)
      ? renderImage({ html: week3BodyHtml, width: 600, height: 340 })
      : isWeek4
        ? renderImage({ html: week4Card2Html, width: 600, height: 592 })
        : Promise.resolve(null)

    const heroHtmlToUse = isWeek4 ? week4HeroHtml : isWeek5 ? week5HeroHtml : isWeek6 ? week6HeroHtml : heroHtml

    Promise.all([
      renderImage({ html: heroHtmlToUse, width: 600, height: heroHeight }),
      secondaryPromise,
      tertiaryPromise,
    ])
      .then(([heroRes, secRes, terRes]) => {
        console.log('[WeekGen] Promise.all resolved:', { tplId: tpl?.id, heroRes, secRes, terRes })
        const urls = { hero: heroRes?.url || null, sec: secRes?.url || null, ter: terRes?.url || null }
        console.log('[WeekGen] Calling setWeekGenUrls with:', urls)
        setWeekGenUrls(prev => {
          const next = { ...prev, [tpl?.id]: urls }
          console.log('[WeekGen] weekGenUrls updated to:', next)
          return next
        })
      })
      .catch(err => {
        console.error('[WeekGen] Error:', err)
        setWeekGenError(err.message)
      })
      .finally(() => setWeekGenLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekGenTrigger, renderImage])

  const handleAiRecommend = async () => {
    setAiLoading(true)
    setAiError(null)
    setAiApplied(false)
    try {
      const result = await recommendTemplate({ copy: generatedCopy })
      console.log('[Auto-style] result:', result)
      setTemplateStyle({
        headerStyle: result.headerStyle,
        imageStyle:  result.imageStyle,
        aiReasoning: result.reasoning,
        boldedCopy:  result.boldedCopy,
      })
      setAiApplied(true)
      setTimeout(() => setAiApplied(false), 3000)
    } catch (err) {
      setAiError(err.message)
    } finally {
      setAiLoading(false)
    }
  }

  const accent = dark ? '#f59e0b' : '#3b82f6'

  const HEADER_STYLES = [
    { id: 1, label: '🏔 Mountain',     color: '#2c4a6e' },
    { id: 2, label: '🌲 Forest',       color: '#2d5a27' },
    { id: 3, label: '🌊 Ocean/Water',  color: '#3d2314' },
    { id: 4, label: '🏜 Desert',       color: '#b5622a' },
  ]

  const IMAGE_STYLES = [
    { id: 1, label: '▦ Grid 2×2'  },
    { id: 2, label: '📸 Polaroids' },
    { id: 3, label: '🌀 Overlap'   },
    { id: 4, label: '⭕ Circle'    },
  ]

  if (!previewHtml && !isHcti) {
    return <p style={{ fontSize: 13, color: dark ? 'rgba(255,255,255,0.3)' : '#9ca3af', padding: '16px 0' }}>No copy generated yet — go back and generate copy first.</p>
  }

  const isHeroHeader = TEMPLATES[active]?.label === 'Hero Header'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 860, margin: '0 auto' }}>

      {/* Template switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: dark ? 'rgba(255,255,255,0.28)' : '#a0a6b1', marginRight: 4 }}>
          Layout:
        </span>
        {TEMPLATES.map((t, i) => {
          const sel = active === i
          return (
            <button
              key={t.id}
              onClick={() => setActive(i)}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                fontFamily: 'Inter, sans-serif', cursor: 'pointer', transition: 'all 0.15s',
                background: sel ? accent : (dark ? 'rgba(255,255,255,0.05)' : '#fff'),
                color: sel ? (dark ? '#111827' : '#fff') : (dark ? 'rgba(255,255,255,0.55)' : '#6b7280'),
                border: `1.5px solid ${sel ? accent : (dark ? 'rgba(255,255,255,0.1)' : '#e2e4e7')}`,
                boxShadow: sel ? `0 2px 10px ${dark ? 'rgba(245,158,11,0.25)' : 'rgba(59,130,246,0.2)'}` : 'none',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Generate Images button — all week templates */}
      {isWeekTemplate && (
        <>
        <style>{`
          @keyframes hb-pulse {
            0%   { transform: scale(1); }
            25%  { transform: scale(1.12); box-shadow: 0 4px 20px rgba(212,0,106,0.55); }
            50%  { transform: scale(1); }
            75%  { transform: scale(1.12); box-shadow: 0 4px 20px rgba(212,0,106,0.55); }
            100% { transform: scale(1); }
          }
          .gen-btn-pulse { animation: hb-pulse 0.6s ease-in-out 3; }
        `}</style>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            key={pulseGenBtn ? 'pulse' : 'idle'}
            className={pulseGenBtn ? 'gen-btn-pulse' : ''}
            onClick={() => setWeekGenTrigger(t => t + 1)}
            disabled={weekGenLoading}
            style={{
              padding: '7px 18px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              fontFamily: 'Inter, sans-serif', cursor: weekGenLoading ? 'wait' : 'pointer',
              background: weekGenLoading ? (dark ? '#2a2a2a' : '#f3f4f6') : 'linear-gradient(135deg,#e85d26,#d4006a)',
              color: weekGenLoading ? (dark ? '#666' : '#aaa') : '#fff',
              border: 'none',
              boxShadow: weekGenLoading ? 'none' : '0 2px 10px rgba(212,0,106,0.3)',
              transition: 'all 0.2s',
            }}
          >
            {weekGenLoading ? '🎨 Generating…' : '🎨 Generate Images'}
          </button>
          {weekGenUrls[tpl?.id]?.hero && !weekGenLoading && (
            <span style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,0.4)' : '#9ca3af', fontFamily: 'Inter, sans-serif' }}>
              ✅ Hero
              {weekGenUrls[tpl?.id]?.sec ? ' · Card 1' : ''}
              {weekGenUrls[tpl?.id]?.ter ? ' · Card 2' : ''}
              {' generated'}
            </span>
          )}
          {weekGenError && (
            <span style={{ fontSize: 11, color: '#ef4444', fontFamily: 'Inter, sans-serif' }}>
              Error: {weekGenError}
            </span>
          )}
        </div>
        </>
      )}

      {/* Header + Image style pickers + AI button — only for Hero Header */}
      {isHeroHeader && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Row 1 — Header style */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: dark ? 'rgba(255,255,255,0.28)' : '#a0a6b1', width: 52 }}>
              Header:
            </span>
            {HEADER_STYLES.map(h => {
              const sel = headerStyle === h.id
              return (
                <button key={h.id} onClick={() => setHeaderStyle(h.id)} style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  fontFamily: 'Inter, sans-serif', cursor: 'pointer', transition: 'all 0.15s',
                  background: sel ? h.color : (dark ? 'rgba(255,255,255,0.05)' : '#fff'),
                  color: sel ? '#fff' : (dark ? 'rgba(255,255,255,0.55)' : '#6b7280'),
                  border: `1.5px solid ${sel ? h.color : (dark ? 'rgba(255,255,255,0.1)' : '#e2e4e7')}`,
                }}>
                  {h.label}
                </button>
              )
            })}
          </div>

          {/* Row 2 — Image style */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: dark ? 'rgba(255,255,255,0.28)' : '#a0a6b1', width: 52 }}>
              Images:
            </span>
            {IMAGE_STYLES.map(im => {
              const sel = imageStyle === im.id
              return (
                <button key={im.id} onClick={() => setImageStyle(im.id)} style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  fontFamily: 'Inter, sans-serif', cursor: 'pointer', transition: 'all 0.15s',
                  background: sel ? accent : (dark ? 'rgba(255,255,255,0.05)' : '#fff'),
                  color: sel ? (dark ? '#111827' : '#fff') : (dark ? 'rgba(255,255,255,0.55)' : '#6b7280'),
                  border: `1.5px solid ${sel ? accent : (dark ? 'rgba(255,255,255,0.1)' : '#e2e4e7')}`,
                  boxShadow: sel ? `0 2px 8px ${dark ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.18)'}` : 'none',
                }}>
                  {im.label}
                </button>
              )
            })}

            {/* AI recommend button */}
            <button
              onClick={handleAiRecommend}
              disabled={aiLoading}
              style={{
                marginLeft: 8, padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                fontFamily: 'Inter, sans-serif', cursor: aiLoading ? 'wait' : 'pointer',
                background: aiApplied ? '#16a34a' : aiLoading ? (dark ? '#2a2a2a' : '#f3f4f6') : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                color: aiLoading ? (dark ? '#666' : '#aaa') : '#fff',
                border: 'none',
                boxShadow: aiApplied ? '0 2px 10px rgba(22,163,74,0.35)' : aiLoading ? 'none' : '0 2px 10px rgba(79,70,229,0.35)',
                transition: 'all 0.2s',
              }}
            >
              {aiLoading ? '✨ Thinking…' : aiApplied ? '✅ Applied!' : '✨ Auto-style'}
            </button>
          </div>

          {/* AI reasoning chip */}
          {aiRecommendDone && aiReasoning && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '8px 14px', borderRadius: 8,
              background: dark ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.06)',
              border: `1px solid ${dark ? 'rgba(124,58,237,0.25)' : 'rgba(124,58,237,0.18)'}`,
              fontSize: 12, color: dark ? 'rgba(255,255,255,0.55)' : '#6b7280',
              fontFamily: 'Inter, sans-serif', lineHeight: 1.5,
            }}>
              <span style={{ fontSize: 14 }}>🤖</span>
              <span>{aiReasoning}</span>
            </div>
          )}

          {/* AI error */}
          {aiError && (
            <div style={{ fontSize: 11, color: '#ef4444', fontFamily: 'Inter, sans-serif' }}>
              AI error: {aiError}
            </div>
          )}

        </div>
      )}

      {/* ── Editor side panel — Canva-style, floats left ── */}
      {isEditable && (
        <>
        {/* Collapsed: small floating toggle button */}
        {!editorOpen && (
          <button onClick={() => setEditorOpen(true)} title="Adjust Design" style={{
            position: 'fixed', left: 28, top: 280, zIndex: 100,
            width: 38, height: 38, borderRadius: 10, border: 'none',
            background: dark ? '#1e1e1e' : '#fff',
            boxShadow: dark ? '0 4px 16px rgba(0,0,0,0.5)' : '0 4px 16px rgba(0,0,0,0.12)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={dark ? '#a78bfa' : '#7c3aed'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </button>
        )}

        {/* Expanded panel */}
        {editorOpen && (
        <div style={{
          position: 'fixed', left: 28, top: 280,
          width: 220, zIndex: 100,
          maxHeight: 'calc(100vh - 124px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          background: dark ? '#1e1e1e' : '#ffffff',
          border: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : '#e8eaed'}`,
          borderRadius: 16,
          boxShadow: dark ? '0 12px 40px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.12)',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          {/* Panel header */}
          <div style={{
            padding: '12px 16px 10px',
            borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : '#f0f1f3'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={dark ? '#a78bfa' : '#7c3aed'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 700, color: dark ? '#e5e7eb' : '#111827', letterSpacing: '-0.01em' }}>
                Adjust Design
              </span>
            </div>
            {/* Collapse button */}
            <button onClick={() => setEditorOpen(false)} title="Hide panel" style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: dark ? 'rgba(255,255,255,0.3)' : '#9ca3af',
              borderRadius: 4,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
          </div>

          <div style={{ padding: '10px 16px 16px', display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* Section builder */}
          {[
            {
              icon: (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
              ),
              key: 'image', label: 'Image', color: '#2563eb', bg: dark ? 'rgba(37,99,235,0.15)' : '#eff6ff',
              controls: [
                { name: 'Pan X', min: -200, max: 200, step: 4, val: heroX,     set: setHeroX,     unit: 'px' },
                { name: 'Pan Y', min: -200, max: 200, step: 4, val: heroY,     set: setHeroY,     unit: 'px' },
                { name: 'Zoom',  min: 1,    max: 2.5, step: 0.05, val: heroScale, set: setHeroScale, unit: 'x', toDisplay: v => v.toFixed(2) },
              ]
            },
            {
              icon: (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>
                </svg>
              ),
              key: 'headline', label: 'Headline', color: '#059669', bg: dark ? 'rgba(5,150,105,0.15)' : '#ecfdf5',
              controls: [
                { name: 'Size',  min: 18, max: 56,  step: 1, val: textSize, set: setTextSize, unit: 'px' },
                { name: 'Top',   min: 10, max: 500, step: 4, val: textTop,  set: setTextTop,  unit: 'px' },
                { name: 'Left',  min: 0,  max: 580, step: 4, val: textLeft, set: setTextLeft, unit: 'px' },
              ]
            },
          ].map((section, si) => (
            <div key={section.label} style={{ marginBottom: 4 }}>
              {/* Section pill — clickable accordion toggle */}
              <div onClick={() => setEditorSection(s => s === section.key ? null : section.key)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: editorSection === section.key ? section.bg : (dark ? 'rgba(255,255,255,0.04)' : '#f9fafb'),
                  color: editorSection === section.key ? section.color : (dark ? '#9ca3af' : '#6b7280'),
                  borderRadius: 10, padding: '7px 10px',
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                  textTransform: 'uppercase', marginBottom: editorSection === section.key ? 10 : 0,
                  marginTop: si === 0 ? 0 : 4,
                  cursor: 'pointer', userSelect: 'none',
                  border: `1.5px solid ${editorSection === section.key ? section.color + '44' : (dark ? 'rgba(255,255,255,0.07)' : '#e8eaed')}`,
                  transition: 'all 0.15s',
                }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{section.icon} {section.label}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  style={{ transform: editorSection === section.key ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
              {editorSection === section.key && section.controls.map(ctrl => (
                <div key={ctrl.name} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: dark ? '#9ca3af' : '#6b7280', fontWeight: 500 }}>{ctrl.name}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      background: dark ? 'rgba(255,255,255,0.08)' : '#f3f4f6',
                      color: dark ? '#e5e7eb' : '#374151',
                      borderRadius: 5, padding: '1px 6px',
                    }}>
                      {ctrl.toDisplay ? ctrl.toDisplay(ctrl.val) : ctrl.val}{ctrl.unit}
                    </span>
                  </div>
                  <input type="range" min={ctrl.min} max={ctrl.max} step={ctrl.step} value={ctrl.val}
                    onChange={e => ctrl.set(Number(e.target.value))}
                    style={{ width: '100%', accentColor: section.color, cursor: 'pointer', height: 3 }}
                  />
                </div>
              ))}
            </div>
          ))}

          {/* Logo section — accordion */}
          <div style={{ marginTop: 4 }}>
            <div onClick={() => setEditorSection(s => s === 'logo' ? null : 'logo')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: editorSection === 'logo' ? (dark ? 'rgba(245,158,11,0.15)' : '#fffbeb') : (dark ? 'rgba(255,255,255,0.04)' : '#f9fafb'),
                color: editorSection === 'logo' ? '#d97706' : (dark ? '#9ca3af' : '#6b7280'),
                borderRadius: 10, padding: '7px 10px',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                textTransform: 'uppercase', marginBottom: editorSection === 'logo' ? 10 : 0,
                cursor: 'pointer', userSelect: 'none',
                border: `1.5px solid ${editorSection === 'logo' ? '#d9770644' : (dark ? 'rgba(255,255,255,0.07)' : '#e8eaed')}`,
                transition: 'all 0.15s',
              }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"/>
                </svg>
                Logo
              </span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                style={{ transform: editorSection === 'logo' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
            {editorSection === 'logo' && <>
              {[
                { name: 'Size',  min: 20, max: 160, step: 2,  val: logoSize,  set: setLogoSize,  unit: 'px' },
                { name: 'Top',   min: 0,  max: 500, step: 4,  val: logoTop,   set: setLogoTop,   unit: 'px' },
                { name: 'Right', min: 0,  max: 580, step: 4,  val: logoRight, set: setLogoRight, unit: 'px' },
              ].map(ctrl => (
                <div key={ctrl.name} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: dark ? '#9ca3af' : '#6b7280', fontWeight: 500 }}>{ctrl.name}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      background: dark ? 'rgba(255,255,255,0.08)' : '#f3f4f6',
                      color: dark ? '#e5e7eb' : '#374151',
                      borderRadius: 5, padding: '1px 6px',
                    }}>
                      {ctrl.val}{ctrl.unit}
                    </span>
                  </div>
                  <input type="range" min={ctrl.min} max={ctrl.max} step={ctrl.step} value={ctrl.val}
                    onChange={e => ctrl.set(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#d97706', cursor: 'pointer', height: 3 }}
                  />
                </div>
              ))}

              {/* Header logo color tint */}
              <div style={{ fontSize: 10, fontWeight: 600, color: dark ? '#9ca3af' : '#6b7280', marginBottom: 6, marginTop: 2 }}>Color tint</div>
              <div style={{ display: 'flex', gap: 5 }}>
                {[
                  { key: 'original', label: 'Original', bg: dark ? '#2d2d2d' : '#f9fafb', fg: dark ? '#d1d5db' : '#374151', dot: null },
                  { key: 'white',    label: 'White',    bg: '#1f1f1f',  fg: '#fff',     dot: '#fff' },
                  { key: 'black',    label: 'Black',    bg: '#f5f5f5',  fg: '#000',     dot: '#000' },
                ].map(c => (
                  <button key={c.key} onClick={() => setLogoColor(c.key)} style={{
                    flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 10, fontWeight: 600,
                    cursor: 'pointer',
                    border: `1.5px solid ${logoColor === c.key ? '#d97706' : (dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb')}`,
                    background: logoColor === c.key ? (dark ? 'rgba(217,119,6,0.15)' : '#fffbeb') : c.bg,
                    color: logoColor === c.key ? '#d97706' : c.fg,
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}>
                    {c.dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.dot, border: '1px solid rgba(128,128,128,0.3)', flexShrink: 0 }} />}
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Footer logo size */}
              <div style={{ marginBottom: 8, marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: dark ? '#9ca3af' : '#6b7280', fontWeight: 500 }}>Footer size</span>
                  <span style={{ fontSize: 10, fontWeight: 600, background: dark ? 'rgba(255,255,255,0.08)' : '#f3f4f6', color: dark ? '#e5e7eb' : '#374151', borderRadius: 5, padding: '1px 6px' }}>{footerLogoSize}px</span>
                </div>
                <input type="range" min={16} max={100} step={2} value={footerLogoSize}
                  onChange={e => setFooterLogoSize(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#d97706', cursor: 'pointer', height: 3 }}
                />
              </div>

              {/* Footer logo color tint */}
              <div style={{ fontSize: 10, fontWeight: 600, color: dark ? '#9ca3af' : '#6b7280', marginBottom: 6, marginTop: 2 }}>Footer color tint</div>
              <div style={{ display: 'flex', gap: 5 }}>
                {[
                  { key: 'original', label: 'Original', bg: dark ? '#2d2d2d' : '#f9fafb', fg: dark ? '#d1d5db' : '#374151', dot: null },
                  { key: 'white',    label: 'White',    bg: '#1f1f1f',  fg: '#fff',     dot: '#fff' },
                  { key: 'black',    label: 'Black',    bg: '#f5f5f5',  fg: '#000',     dot: '#000' },
                ].map(c => (
                  <button key={c.key} onClick={() => setFooterLogoColor(c.key)} style={{
                    flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 10, fontWeight: 600,
                    cursor: 'pointer',
                    border: `1.5px solid ${footerLogoColor === c.key ? '#d97706' : (dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb')}`,
                    background: footerLogoColor === c.key ? (dark ? 'rgba(217,119,6,0.15)' : '#fffbeb') : c.bg,
                    color: footerLogoColor === c.key ? '#d97706' : c.fg,
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}>
                    {c.dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.dot, border: '1px solid rgba(128,128,128,0.3)', flexShrink: 0 }} />}
                    {c.label}
                  </button>
                ))}
              </div>
            </>}
          </div>

          {/* Sub-image adjusters — shown for templates that have sub-images */}
          {[10, 11, 13, 14].includes(tpl?.id) && [
            { key: 'sub1', label: 'Sub Image 1', color: '#7c3aed', bg: dark ? 'rgba(124,58,237,0.15)' : '#f5f3ff',
              controls: [
                { name: 'Pan X', min: -200, max: 200, step: 4, val: img1X,     set: setImg1X,     unit: 'px' },
                { name: 'Pan Y', min: -200, max: 200, step: 4, val: img1Y,     set: setImg1Y,     unit: 'px' },
                { name: 'Zoom',  min: 1,    max: 2.5, step: 0.05, val: img1Scale, set: setImg1Scale, unit: 'x', toDisplay: v => v.toFixed(2) },
              ]
            },
            { key: 'sub2', label: 'Sub Image 2', color: '#db2777', bg: dark ? 'rgba(219,39,119,0.15)' : '#fdf2f8',
              controls: [
                { name: 'Pan X', min: -200, max: 200, step: 4, val: img2X,     set: setImg2X,     unit: 'px' },
                { name: 'Pan Y', min: -200, max: 200, step: 4, val: img2Y,     set: setImg2Y,     unit: 'px' },
                { name: 'Zoom',  min: 1,    max: 2.5, step: 0.05, val: img2Scale, set: setImg2Scale, unit: 'x', toDisplay: v => v.toFixed(2) },
              ]
            },
            { key: 'sub3', label: 'Sub Image 3', color: '#ea580c', bg: dark ? 'rgba(234,88,12,0.15)' : '#fff7ed',
              controls: [
                { name: 'Pan X', min: -200, max: 200, step: 4, val: img3X,     set: setImg3X,     unit: 'px' },
                { name: 'Pan Y', min: -200, max: 200, step: 4, val: img3Y,     set: setImg3Y,     unit: 'px' },
                { name: 'Zoom',  min: 1,    max: 2.5, step: 0.05, val: img3Scale, set: setImg3Scale, unit: 'x', toDisplay: v => v.toFixed(2) },
              ]
            },
            ...(tpl?.id === 13 ? [{ key: 'sub4', label: 'Sub Image 4', color: '#0891b2', bg: dark ? 'rgba(8,145,178,0.15)' : '#ecfeff',
              controls: [
                { name: 'Pan X', min: -200, max: 200, step: 4, val: img4X,     set: setImg4X,     unit: 'px' },
                { name: 'Pan Y', min: -200, max: 200, step: 4, val: img4Y,     set: setImg4Y,     unit: 'px' },
                { name: 'Zoom',  min: 1,    max: 2.5, step: 0.05, val: img4Scale, set: setImg4Scale, unit: 'x', toDisplay: v => v.toFixed(2) },
              ]
            }] : []),
          ].map(section => (
            <div key={section.key} style={{ marginBottom: 4 }}>
              <div onClick={() => setEditorSection(s => s === section.key ? null : section.key)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: editorSection === section.key ? section.bg : (dark ? 'rgba(255,255,255,0.04)' : '#f9fafb'),
                  color: editorSection === section.key ? section.color : (dark ? '#9ca3af' : '#6b7280'),
                  borderRadius: 10, padding: '7px 10px',
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                  textTransform: 'uppercase', marginBottom: editorSection === section.key ? 10 : 0,
                  marginTop: 4,
                  cursor: 'pointer', userSelect: 'none',
                  border: `1.5px solid ${editorSection === section.key ? section.color + '44' : (dark ? 'rgba(255,255,255,0.07)' : '#e8eaed')}`,
                  transition: 'all 0.15s',
                }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                  {section.label}
                </span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  style={{ transform: editorSection === section.key ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
              {editorSection === section.key && section.controls.map(ctrl => (
                <div key={ctrl.name} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: dark ? '#9ca3af' : '#6b7280', fontWeight: 500 }}>{ctrl.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, background: dark ? 'rgba(255,255,255,0.08)' : '#f3f4f6', color: dark ? '#e5e7eb' : '#374151', borderRadius: 5, padding: '1px 6px' }}>
                      {ctrl.toDisplay ? ctrl.toDisplay(ctrl.val) : ctrl.val}{ctrl.unit}
                    </span>
                  </div>
                  <input type="range" min={ctrl.min} max={ctrl.max} step={ctrl.step} value={ctrl.val}
                    onChange={e => ctrl.set(Number(e.target.value))}
                    style={{ width: '100%', accentColor: section.color, cursor: 'pointer', height: 3 }}
                  />
                </div>
              ))}
            </div>
          ))}

          {/* Divider + Reset */}
          <div style={{ height: 1, background: dark ? 'rgba(255,255,255,0.07)' : '#f0f1f3', margin: '12px 0 8px' }} />
          <button onClick={() => {
            setHeroScale(1); setHeroX(0); setHeroY(0); setFooterLogoColor('original'); setFooterLogoSize(40)
            setImg1Scale(1); setImg1X(0); setImg1Y(0); setImg2Scale(1); setImg2X(0); setImg2Y(0); setImg3Scale(1); setImg3X(0); setImg3Y(0); setImg4Scale(1); setImg4X(0); setImg4Y(0)
            if (tpl?.id === 10) { setTextSize(38); setTextTop(32);  setTextLeft(24);  setLogoColor('original'); setLogoTop(32); setLogoRight(200); setLogoSize(40) }
            if (tpl?.id === 11) { setTextSize(40); setTextTop(14);  setTextLeft(52);  setLogoColor('white');    setLogoTop(40); setLogoRight(36);  setLogoSize(44) }
            if (tpl?.id === 12) { setTextSize(38); setTextTop(20);  setTextLeft(48);  setLogoColor('white');    setLogoTop(40); setLogoRight(36);  setLogoSize(44) }
            if (tpl?.id === 13) { setTextSize(52); setTextTop(32);  setTextLeft(36);  setLogoColor('white');    setLogoTop(28); setLogoRight(36);  setLogoSize(40) }
            if (tpl?.id === 14) { setTextSize(46); setTextTop(32);  setTextLeft(36);  setLogoColor('original'); setLogoTop(28); setLogoRight(40);  setLogoSize(32) }
          }} style={{
            width: '100%', padding: '7px 0', borderRadius: 8, fontSize: 11, fontWeight: 600,
            cursor: 'pointer',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
            background: dark ? 'rgba(255,255,255,0.04)' : '#f9fafb',
            color: dark ? '#9ca3af' : '#6b7280',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            transition: 'all 0.15s',
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.02"/>
            </svg>
            Reset all
          </button>

          </div>
        </div>
        )}
        </>
      )}

      {/* Browser chrome + iframe */}
      <div style={{
        border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e2e4e7'}`,
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: dark ? '0 8px 40px rgba(0,0,0,0.5)' : '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        {/* Title bar + zoom controls */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px',
          background: dark ? '#111111' : '#f3f4f5',
          borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#e2e4e7'}`,
        }}>
          {/* Traffic lights + label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#ff5f57' }} />
            <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#febc2e' }} />
            <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#28c840' }} />
            <span style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,0.3)' : '#a0a6b1', marginLeft: 8, fontFamily: 'Inter, sans-serif' }}>
              {selectedClient?.name} · {tpl.label}
            </span>
          </div>

          {/* Zoom controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[
              { label: '−', action: () => setZoom(z => Math.max(0.4, +(z - 0.1).toFixed(1))) },
              { label: '+', action: () => setZoom(z => Math.min(1.0, +(z + 0.1).toFixed(1))) },
            ].map(({ label, action }) => (
              <button key={label} onClick={action} style={{
                width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: dark ? 'rgba(255,255,255,0.08)' : '#e5e6e8',
                color: dark ? 'rgba(255,255,255,0.7)' : '#555',
                fontSize: 16, fontWeight: 700, lineHeight: 1, fontFamily: 'Inter, sans-serif',
              }}>{label}</button>
            ))}
            <button onClick={() => setZoom(1)} style={{
              minWidth: 42, padding: '3px 6px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: dark ? 'rgba(255,255,255,0.06)' : '#e5e6e8',
              color: dark ? 'rgba(255,255,255,0.5)' : '#666',
              fontSize: 11, fontWeight: 600, fontFamily: 'Inter, sans-serif',
            }}>{Math.round(zoom * 100)}%</button>
          </div>
        </div>

        {isHcti ? (
          hctiLoading ? (
            /* ── Image Gen: loading ── */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '80px 0', background: dark ? '#111' : '#fff', color: dark ? 'rgba(255,255,255,0.4)' : '#9ca3af', fontFamily: 'Inter, sans-serif', fontSize: 13 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`, borderTopColor: accent, animation: 'spin 0.8s linear infinite' }} />
              <span>Generating images via html2image.net…</span>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : hctiError ? (
            /* ── Image Gen: error ── */
            <div style={{ padding: '40px 32px', background: dark ? '#111' : '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 32 }}>⚠️</span>
              <p style={{ color: '#ef4444', fontSize: 13, fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>{hctiError}</p>
              <button onClick={() => setHctiTrigger(t => t + 1)} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', background: accent, color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                Try again
              </button>
            </div>
          ) : hctiEmail ? (
            /* ── Image Gen: result ── */
            <div style={{ position: 'relative' }}>
              <iframe
                key="hcti-email"
                title="Image Gen Email Preview"
                srcDoc={hctiEmail}
                style={{ width: '100%', height: 860, border: 'none', display: 'block' }}
                sandbox="allow-same-origin"
              />
              {/* Regenerate button bottom-right */}
              <div style={{ position: 'absolute', bottom: 16, right: 16 }}>
                <button onClick={() => setHctiTrigger(t => t + 1)} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', color: dark ? 'rgba(255,255,255,0.6)' : '#555', fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif', backdropFilter: 'blur(4px)' }}>
                  ↻ Regenerate
                </button>
              </div>
            </div>
          ) : (
            /* ── Image Gen: idle — show Generate button ── */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '80px 0', background: dark ? '#111' : '#fff', fontFamily: 'Inter, sans-serif' }}>
              <span style={{ fontSize: 40 }}>🖼</span>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: dark ? 'rgba(255,255,255,0.7)' : '#374151', marginBottom: 4 }}>
                  Ready to generate
                </div>
                <div style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.3)' : '#9ca3af', marginBottom: 20 }}>
                  Creates a hero image + polaroid gallery via html2image.net
                </div>
                <button
                  onClick={() => setHctiTrigger(t => t + 1)}
                  disabled={!generatedCopy?.headlineText}
                  style={{
                    padding: '10px 28px', borderRadius: 8, border: 'none',
                    cursor: generatedCopy?.headlineText ? 'pointer' : 'not-allowed',
                    background: generatedCopy?.headlineText ? accent : (dark ? '#2a2a2a' : '#e5e7eb'),
                    color: generatedCopy?.headlineText ? '#fff' : (dark ? '#555' : '#aaa'),
                    fontSize: 13, fontWeight: 700,
                  }}
                >
                  Generate Images
                </button>
              </div>
            </div>
          )
        ) : (
          <iframe
            ref={iframeRef}
            key={`${active}-${weekGenUrls[tpl?.id]?.hero || 'none'}`}
            title="Email Preview"
            style={{ width: '100%', height: 860, border: 'none', display: 'block' }}
            sandbox="allow-same-origin"
          />
        )}
      </div>

    </div>
  )
}
