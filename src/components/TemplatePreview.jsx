/**
 * TemplatePreview — 6 luxury email template designs
 *
 * Content order: headline → subhead → body → closing line → CTA → body block 2
 *
 * Order: Casa · Tropica · Refined · Newsletter · MasterClass · Blueprint
 */
import { useMemo, useState, useEffect } from 'react'
import { useCampaignStore }  from '../store/campaignStore'
import { useTheme } from '../context/ThemeContext'

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

/* ══════════════════════════════════════════════════════════════════════════
   T1 · REFINED  (Hermès / Design Within Reach)
   Cream · serif · outlined CTA · generous white space
   ══════════════════════════════════════════════════════════════════════════ */
function buildTemplate1({ client, copy, images }) {
  const heroImg = images?.[0]?.url||''
  const img1    = images?.[1]?.url||''
  const img2    = images?.[2]?.url||''
  const body    = (copy.bodyText||'').replace(/\n/g,'<br>')
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
  <div class="topbar"><div class="brand">${client?.name||'Brand'}</div><div class="brand-r">Exclusive Collection</div></div>
  <div class="hero">${heroImg?`<img src="${heroImg}" alt=""/>`:`<div class="hero-ph">Hero image</div>`}</div>
  <div class="content">
    ${copy.subjectLine?`<div class="eyebrow">${copy.subjectLine}</div>`:''}
    <h1>${copy.headlineText||''}</h1>
    ${copy.subhead?`<div class="sub">${copy.subhead}</div>`:''}
    ${copy.bodyText?`<div class="text">${body}</div>`:''}
    ${copy.closingLine?`<div class="closing">${copy.closingLine}</div>`:''}
    ${copy.ctaText?`<div class="cta-w"><a class="cta" href="${copy.ctaUrl||'#'}">${copy.ctaText}</a></div>`:''}
    ${copy.bodyBlock2Title||copy.bodyBlock2?`<div class="b2">${copy.bodyBlock2Title?`<div class="b2t">${copy.bodyBlock2Title}</div>`:''} ${copy.bodyBlock2?`<div class="b2b">${copy.bodyBlock2}</div>`:''}</div>`:''}
  </div>
  ${img1||img2?`<div class="pair">${img1?`<img src="${img1}" alt=""/>`:''}${img2?`<img src="${img2}" alt=""/>`:''}  </div>`:''}
  <div class="foot">© ${client?.name||''} &nbsp;·&nbsp; <a href="#">Unsubscribe</a></div>
</div></body></html>`
}

/* ══════════════════════════════════════════════════════════════════════════
   T3 · NEWSLETTER  (user approved)
   Newspaper masthead · ruled lines · gold badge · editorial serif
   ══════════════════════════════════════════════════════════════════════════ */
function buildTemplate3({ client, copy, images }) {
  const heroImg = images?.[0]?.url||''
  const img1    = images?.[1]?.url||''
  const img2    = images?.[2]?.url||''
  const body    = (copy.bodyText||'').replace(/\n/g,'<br>')
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
    <div class="mn">${client?.name||'The Digest'}</div>
    <div class="mm"><span>${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</span><span class="dot"></span><span>Exclusive Update</span></div>
  </div>
  <div class="hero">${heroImg?`<img src="${heroImg}" alt=""/>`:`<div class="hero-ph">Hero image</div>`}</div>
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
  ${img1||img2?`<div class="cinema">${img1?`<img src="${img1}" alt=""/>`:''}${img2?`<img src="${img2}" alt=""/>`:''}  </div>`:''}
  <div class="foot">${client?.name||''} &nbsp;·&nbsp; <a href="#">Unsubscribe</a></div>
</div></body></html>`
}

/* ══════════════════════════════════════════════════════════════════════════
   T4 · TROPICA  (Poolside FM / Palm Report)
   Blush bg · bold magenta masthead · images split side-by-side
   ══════════════════════════════════════════════════════════════════════════ */
function buildTemplate4({ client, copy, images }) {
  const heroImg = images?.[0]?.url||''
  const img1    = images?.[1]?.url||''
  const img2    = images?.[2]?.url||''
  const body    = (copy.bodyText||'').replace(/\n/g,'<br>')
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
    <div class="script">${client?.name||'Brand'}</div>
    <div class="bold-title">${(client?.name||'REPORT').toUpperCase()}</div>
    <div class="issue-line"><div class="il"></div><div class="issue-txt">${copy.subjectLine||'Special Issue'}</div><div class="il"></div></div>
  </div>
  ${heroImg&&img1?`<div class="split-hero"><img src="${heroImg}" alt=""/><img src="${img1}" alt=""/></div>`:heroImg?`<div class="split-hero-single"><img src="${heroImg}" alt=""/></div>`:`<div class="hero-ph">Hero image</div>`}
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
  ${img2?`<div class="mag-spread"><img src="${img2}" alt=""/></div>`:''}
  <div class="foot">${client?.name||''} &nbsp;·&nbsp; <a href="#">Unsubscribe</a></div>
</div></body></html>`
}

/* ══════════════════════════════════════════════════════════════════════════
   T5 · CASA  (WatchHouse + Scottsdale Plaza)
   Cream · terracotta border · centered brand · alternating sections
   ══════════════════════════════════════════════════════════════════════════ */
function buildTemplate5({ client, copy, images }) {
  const heroImg = images?.[0]?.url||''
  const img1    = images?.[1]?.url||''
  const img2    = images?.[2]?.url||''
  const body    = (copy.bodyText||'').replace(/\n/g,'<br>')
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
    <div class="brand">${client?.name||'Brand'}</div>
    <div class="date-stamp">${new Date().toLocaleDateString('en-US',{day:'2-digit',month:'2-digit',year:'2-digit'})}</div>
  </div>
  <div class="hl-block">
    ${copy.subjectLine?`<div class="label">${copy.subjectLine}</div>`:''}
    <h1>${copy.headlineText||''}</h1>
    ${copy.subhead?`<div class="sub">${copy.subhead}</div>`:''}
  </div>
  <div class="img-block">${heroImg?`<img src="${heroImg}" alt=""/>`:`<div class="img-ph">Hero image</div>`}</div>
  <div class="body">
    ${copy.bodyText?`<div class="text">${body}</div>`:''}
    ${copy.closingLine?`<div class="closing">${copy.closingLine}</div>`:''}
    ${copy.ctaText?`<div class="cta-w"><a class="cta" href="${copy.ctaUrl||'#'}">${copy.ctaText}</a></div>`:''}
  </div>
  ${img1?`<div style="background:#f5f0e6;padding:0 20px 24px"><img src="${img1}" alt="" style="width:100%;height:220px;object-fit:cover;display:block;border-radius:4px"/></div>`:''}
  ${copy.bodyBlock2Title||copy.bodyBlock2?`<div class="div"></div><div class="b2">${copy.bodyBlock2Title?`<div class="b2t">${copy.bodyBlock2Title}</div>`:''} ${copy.bodyBlock2?`<div class="b2b">${copy.bodyBlock2}</div>`:''}</div>`:''}
  <div class="community">
    <div class="comm-title">Join the ${client?.name||'Brand'} community.</div>
    <div class="comm-sub">Stay connected and be the first to know about exclusive offers.</div>
    <a class="comm-cta" href="#">Learn More</a>
  </div>
  <div class="foot">© ${client?.name||''} &nbsp;·&nbsp; <a href="#">Unsubscribe</a></div>
</div></body></html>`
}

/* ══════════════════════════════════════════════════════════════════════════
   T12 · GETAWAY  (Getaway cabin email)
   Beige bg · top nav · italic serif headline on hero · orange pill CTA
   Dark forest-green lower section · 3-image grid · yellow pill CTA
   ══════════════════════════════════════════════════════════════════════════ */
function buildTemplate12({ client, copy, images }) {
  const heroImg = images?.[0]?.url||''
  const img1    = images?.[1]?.url||''
  const img2    = images?.[2]?.url||''
  const body    = (copy.bodyText||'').replace(/\n/g,'<br>')

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#ede9e0;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#1a1a1a}
  .wrap{max-width:600px;margin:0 auto 48px;background:#ede9e0}
  /* nav */
  .nav{padding:14px 24px;display:flex;align-items:center;justify-content:space-between;background:#ede9e0}
  .nav-links{display:flex;gap:18px}
  .nav-links a{font-size:12px;color:#666;text-decoration:none}
  .nav-brand{font-size:24px;font-weight:700;color:#1a1a1a;font-family:'Georgia',serif;font-style:italic;letter-spacing:-.3px}
  /* hero */
  .hero{position:relative;line-height:0}
  .hero img{width:100%;height:420px;object-fit:cover;display:block}
  .hero-ph{width:100%;height:360px;background:#2a4a2a;display:flex;align-items:center;justify-content:center;color:#5a8a5a;font-size:12px}
  .hero-text{position:absolute;top:28px;left:36px;right:36px}
  .hero-hl{font-size:50px;font-weight:700;color:#fff;line-height:1.05;font-family:'Georgia',serif;font-style:italic;text-shadow:0 2px 16px rgba(0,0,0,.3)}
  /* cream content */
  .content{padding:44px 56px;text-align:center;background:#ede9e0}
  .text{font-size:15px;line-height:1.85;color:#3a3028;margin-bottom:16px}
  .closing{font-size:14px;color:#777;font-style:italic;margin-bottom:32px}
  .cta-w{margin-bottom:0}
  .cta{display:inline-block;background:#e05a28;color:#fff;padding:15px 52px;border-radius:50px;font-size:15px;font-weight:700;text-decoration:none}
  /* dark section */
  .dark{background:#2d4a30;padding:44px 36px;text-align:center}
  .dark-head{font-size:34px;font-weight:700;color:#fff;font-family:'Georgia',serif;margin-bottom:28px}
  .grid3{display:flex;gap:4px;margin-bottom:28px}
  .grid3 img{flex:1;width:33.33%;height:180px;object-fit:cover;display:block}
  .grid3-ph{flex:1;height:180px;background:#1a3a1a;display:flex;align-items:center;justify-content:center;color:#4a7a4a;font-size:11px}
  .dark-body{font-size:15px;line-height:1.75;color:rgba(255,255,255,.75);margin-bottom:28px;max-width:440px;margin-left:auto;margin-right:auto}
  .dark-cta{display:inline-block;background:#f0c040;color:#1a1a1a;padding:15px 52px;border-radius:50px;font-size:15px;font-weight:800;text-decoration:none}
  /* social */
  .social{padding:22px;text-align:center;background:#2d4a30;border-top:1px solid rgba(255,255,255,.08)}
  .soc{display:inline-block;width:30px;height:30px;border-radius:50%;border:1.5px solid rgba(255,255,255,.3);color:rgba(255,255,255,.5);font-size:12px;line-height:28px;text-align:center;margin:0 4px;font-family:Arial,sans-serif;text-decoration:none}
  /* footer */
  .foot{background:#ede9e0;padding:20px 36px;text-align:center;font-size:11px;color:#aaa;letter-spacing:.06em}
  .foot a{color:#aaa}
</style></head><body>
${emailClientHeader({client,copy})}
<div class="wrap">
  <div class="nav">
    <div class="nav-links"><a href="#">The Journal</a><a href="#">Groups</a></div>
    <div class="nav-brand">${client?.name||'Brand'}</div>
    <div class="nav-links"><a href="#">Refer a Friend</a><a href="#">Packs</a></div>
  </div>
  <div class="hero">
    ${heroImg?`<img src="${heroImg}" alt=""/>`:`<div class="hero-ph">Hero image</div>`}
    <div class="hero-text"><div class="hero-hl">${copy.headlineText||''}</div></div>
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
        ?`<img src="${heroImg}" alt=""/><img src="${img1}" alt=""/><img src="${img2}" alt=""/>`
        :img1&&img2
          ?`<img src="${img1}" alt=""/><img src="${img2}" alt=""/><div class="grid3-ph">·</div>`
          :img1
            ?`<img src="${img1}" alt=""/><div class="grid3-ph">·</div><div class="grid3-ph">·</div>`
            :`<div class="grid3-ph">·</div><div class="grid3-ph">·</div><div class="grid3-ph">·</div>`}
    </div>
    ${copy.bodyBlock2?`<div class="dark-body">${copy.bodyBlock2}</div>`:''}
    ${copy.ctaText?`<a class="dark-cta" href="${copy.ctaUrl||'#'}">${copy.ctaText}</a>`:''}
  </div>
  <div class="social"><a class="soc" href="#">f</a><a class="soc" href="#">in</a><a class="soc" href="#">tk</a><a class="soc" href="#">♪</a></div>
  <div class="foot">© ${client?.name||''} &nbsp;·&nbsp; <a href="#">Unsubscribe</a></div>
</div></body></html>`
}

/* ══════════════════════════════════════════════════════════════════════════
   T14 · FOREST  (AllTrails National Forest email)
   Dark forest green throughout · top bar · rounded hero · white bold hl
   Green pill CTA · 1+2 mosaic grid · partner section · action list rows
   ══════════════════════════════════════════════════════════════════════════ */
function buildTemplate14({ client, copy, images }) {
  const heroImg = images?.[0]?.url||''
  const img1    = images?.[1]?.url||''
  const img2    = images?.[2]?.url||''
  const body    = (copy.bodyText||'').replace(/\n/g,'<br>')

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
      <svg class="tb-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon points="10,2 18,17 2,17" fill="#5ab85a"/>
      </svg>
      ${client?.name||'Brand'}
    </div>
    <div class="tb-right">${copy.subjectLine||''}</div>
  </div>
  <div class="hero">${heroImg?`<img src="${heroImg}" alt=""/>`:`<div class="hero-ph">Hero image</div>`}</div>
  <div class="hl-section">
    <div class="hl">${copy.headlineText||''}</div>
    ${copy.subhead?`<div class="sub">${copy.subhead}</div>`:''}
    ${copy.ctaText?`<a class="cta" href="${copy.ctaUrl||'#'}">${copy.ctaText}</a>`:''}
  </div>
  ${img1||img2?`
  <div class="mosaic">
    <div class="mos-main">${img1?`<img src="${img1}" alt=""/>`:`<div class="mos-main-ph">Image</div>`}</div>
    <div class="mos-stack">
      ${img2?`<img src="${img2}" alt=""/>`:`<div class="mos-stack-ph">Image</div>`}
      ${heroImg&&img1&&img2?`<img src="${heroImg}" alt=""/>`:`<div class="mos-stack-ph">Image</div>`}
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
  <div class="foot">© ${client?.name||''} &nbsp;·&nbsp; <a href="#">Unsubscribe</a> &nbsp;·&nbsp; <a href="#">Preferences</a></div>
</div></body></html>`
}

/* ══════════════════════════════════════════════════════════════════════════
   T7 · HERO HEADER  (Logo + full-bleed hero image + text overlay + wave)
   ══════════════════════════════════════════════════════════════════════════ */
function buildTemplateHero({ client, copy, images }) {
  const heroImg  = images?.[0]?.url || ''
  const sub1Img  = images?.[1]?.url || ''
  const sub2Img  = images?.[2]?.url || ''
  const logoUrl  = client?.logoUrl  || ''
  const headline = copy.headlineText || ''
  const subhead  = copy.subhead      || ''
  const ctaText  = copy.ctaText      || ''
  const ctaUrl   = copy.ctaUrl       || '#'
  const body     = (copy.bodyText    || '').replace(/\n/g, '<br>')
  const b2title  = copy.bodyBlock2Title || ''
  const b2body   = (copy.bodyBlock2  || '').replace(/\n/g, '<br>')

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Dancing+Script:wght@600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#f5f5f5;font-family:'Georgia',serif}
  .wrap{max-width:640px;margin:0 auto;background:#fff}
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
    position:absolute;inset:0;
    background:linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0) 100%);
    display:flex;flex-direction:column;align-items:center;justify-content:flex-start;
    padding:36px 40px 32px;text-align:center;
  }
  .hero-headline{
    font-size:32px;font-weight:900;line-height:1.15;
    color:#fff;font-family:'Playfair Display',Georgia,serif;
    text-shadow:0 2px 16px rgba(0,0,0,0.6);
    letter-spacing:-0.2px;
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
    position:relative;
    padding:40px 24px 80px;
    background:#faf9f7;
    overflow:hidden;
    min-height:320px;
  }
  .polaroid{
    position:relative;display:inline-block;
    background:#fff;
    padding:10px 10px 32px;
    box-shadow:0 4px 18px rgba(0,0,0,0.18);
  }
  .polaroid img{display:block;width:260px;height:190px;object-fit:cover}
  .polaroid-ph{width:260px;height:190px;background:#ddd;display:flex;align-items:center;justify-content:center;font-size:12px;color:#aaa;font-family:Arial,sans-serif}
  .p1{transform:rotate(-4deg);position:absolute;left:32px;top:40px;z-index:2}
  .p2{transform:rotate(3deg);position:absolute;left:220px;top:20px;z-index:1}
  .fav-label{
    position:absolute;right:40px;bottom:28px;
    font-family:'Dancing Script',cursive,'Brush Script MT',cursive;
    font-size:30px;color:#b07a50;
    line-height:1.2;text-align:center;
    z-index:3;
  }
  /* footer */
  .foot{background:#3d2314;padding:20px 40px;text-align:center;font-size:10px;color:#a08070;font-family:Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase}
  .foot a{color:#a08070}
</style></head><body>
${emailClientHeader({ client, copy })}
<div class="wrap">

  <!-- Logo bar -->
  <div class="logo-bar">
    ${logoUrl
      ? `<img src="${logoUrl}" alt="${client?.name || 'Logo'}"/>`
      : `<span class="brand-text">${client?.name || 'Brand'}</span>`
    }
  </div>

  <!-- Hero image + overlay -->
  <div class="hero-wrap">
    ${heroImg
      ? `<img src="${heroImg}" alt=""/>`
      : `<div class="hero-ph">Hero image will appear here</div>`
    }
    <div class="hero-overlay">
      ${headline ? `<div class="hero-headline">${headline}</div>` : ''}
    </div>
    <!-- Wave bottom -->
    <div class="wave-wrap">
      <svg viewBox="0 0 640 40" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <path d="M0,20 C80,40 160,0 240,20 C320,40 400,0 480,20 C560,40 620,10 640,20 L640,40 L0,40 Z" fill="#ffffff"/>
      </svg>
    </div>
  </div>

  <!-- Subhead + CTA -->
  ${(subhead || ctaText) ? `
  <div class="sub-cta">
    ${subhead  ? `<p class="subhead">${subhead}</p>` : ''}
    ${ctaText  ? `<a href="${ctaUrl}" class="cta-btn">${ctaText} →</a>` : ''}
  </div>` : ''}

  <!-- Body text -->
  ${(body || b2title || b2body) ? `
  <div class="body-block">
    ${body    ? `<p>${body}</p>` : ''}
    ${b2title ? `<p class="b2title">${b2title}</p>` : ''}
    ${b2body  ? `<p>${b2body}</p>` : ''}
  </div>` : ''}

  <!-- Polaroid gallery -->
  ${(sub1Img || sub2Img) ? `
  <div class="gallery-wrap">
    <div class="polaroid p1">
      ${sub1Img
        ? `<img src="${sub1Img}" alt=""/>`
        : `<div class="polaroid-ph">Image</div>`}
    </div>
    <div class="polaroid p2">
      ${sub2Img
        ? `<img src="${sub2Img}" alt=""/>`
        : `<div class="polaroid-ph">Image</div>`}
    </div>
    <div class="fav-label">Favorite<br>Memories</div>
  </div>` : ''}

  <!-- Footer -->
  <div class="foot">© ${client?.name || ''} &nbsp;·&nbsp; <a href="#">Unsubscribe</a></div>

</div></body></html>`
}

/* ─────────────────────────── registry ──────────────────────────────────── */
const TEMPLATES = [
  { id:7, label:'Hero Header', build:buildTemplateHero },
  { id:1, label:'Casa',        build:buildTemplate5  },
  { id:2, label:'Tropica',     build:buildTemplate4  },
  { id:3, label:'Refined',     build:buildTemplate1  },
  { id:4, label:'Newsletter',  build:buildTemplate3  },
  { id:5, label:'Getaway',     build:buildTemplate12 },
  { id:6, label:'Forest',      build:buildTemplate14 },
]

/* ─────────────────────────── component ─────────────────────────────────── */
export default function TemplatePreview() {
  const [active, setActive] = useState(0)
  const [zoom,   setZoom]   = useState(1)
  const { theme } = useTheme()
  const dark = theme === 'dark'

  const { selectedClient, generatedCopy, selectedImages, setRenderedHtml } = useCampaignStore(s => ({
    selectedClient:  s.selectedClient,
    generatedCopy:   s.generatedCopy,
    selectedImages:  s.selectedImages,
    setRenderedHtml: s.setRenderedHtml,
  }))

  const tpl = TEMPLATES[active]

  const baseHtml = useMemo(() => {
    if (!generatedCopy?.headlineText) return null
    return tpl.build({ client:selectedClient, copy:generatedCopy, images:selectedImages })
  }, [active, selectedClient, generatedCopy, selectedImages])

  // Keep store in sync so ApprovalPanel always has the latest HTML
  useEffect(() => {
    if (baseHtml) setRenderedHtml(baseHtml)
  }, [baseHtml])

  // Inject zoom into the email body — iframe stays full size, content scales
  const previewHtml = useMemo(() => {
    if (!baseHtml) return null
    return baseHtml.replace('<body', `<body style="zoom:${zoom}"`)
  }, [baseHtml, zoom])

  const accent = dark ? '#f59e0b' : '#3b82f6'

  if (!previewHtml) {
    return <p style={{ fontSize: 13, color: dark ? 'rgba(255,255,255,0.3)' : '#9ca3af', padding: '16px 0' }}>No copy generated yet — go back and generate copy first.</p>
  }

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

        <iframe
          key={active}
          title="Email Preview"
          srcDoc={previewHtml}
          style={{ width: '100%', height: 860, border: 'none', display: 'block' }}
          sandbox="allow-same-origin"
        />
      </div>

    </div>
  )
}
