# Email Template Spec — Fixed Reference

> **Rule:** When building a new template, copy `SHARED_MOBILE_CSS` from `TemplatePreview.jsx` into the new template's `<style>` block. Change nothing here unless intentionally updating the spec for all future templates.
> Existing templates (Week 2–8) have their own inline CSS and are not affected by changes to this file.

---

## 1. Typography — Desktop (inline styles)

| Element | Font | Size | Line-height | Weight | Style |
|---|---|---|---|---|---|
| Hero headline | Lora, Georgia, serif | `38px` | `1.12` | 700 | normal |
| Subhead | Georgia, serif | `20px` | `1.5` | 400 | italic |
| Body block 1 | Arial, sans-serif | `17px` | `1.8` | 400 | normal |
| Body block 2 | Arial, sans-serif | `17px` | `1.8` | 400 | normal |
| Body block 2 title | Arial, sans-serif | `22px` | normal | 700 | UPPERCASE |
| Closing line | Georgia, serif | `17px` | `1.7` | 400 | italic |
| CTA button (CSS fallback) | Arial, sans-serif | `17px` | — | 700 | normal |
| Footer | Arial, sans-serif | inherited | `1.25` | 400 | normal |

---

## 2. Typography — Mobile (@media max-width: 600px)

> Gmail strips `<style>` blocks entirely — these @media overrides only apply in Apple Mail, Samsung Mail, and other clients that support media queries. Gmail mobile always sees the inline (desktop) values above.

| CSS class | Font size | Line-height |
|---|---|---|
| `.mobile-body` | `17px` | `1.5` |
| `.mobile-subhead` | `17px` | `1.4` |
| `.mobile-b2title` | `22px` | `1.25` |
| `.mobile-closing` | `17px` | `1.5` |
| `.mobile-cta` | `20px` | — |
| `.mobile-footer` | `14px` | `1.4` |

---

## 3. CTA Button

### CSS Fallback (shows when no Puppeteer PNG is generated)

| Property | Value |
|---|---|
| Font | Arial, 700 |
| Desktop font size | `17px` |
| Desktop padding | `15px 40px` |
| Mobile font size | `20px` (via @media) |
| Mobile padding | `20px 80px` (via @media) |
| Border-radius | `999px` |
| Color | Client `buttonColor` from footer settings |

### Puppeteer-baked PNG Button

| Property | Value |
|---|---|
| Render width | `600px` |
| Render height | `88px` |
| Background | `transparent` |
| Font | Arial, 700 |
| Font size | `28px` |
| Padding | `20px 80px` |
| Border-radius | `999px` |
| Arrow | Custom inline SVG dash + triangle |
| Display width in email | `375px` |
| Mobile display width | `300px` (via @media `.w2-btn-img`) |

---

## 4. Layout & Padding

| Element | Value |
|---|---|
| Email `<body>` background | `#ffffff` |
| Email `<body>` padding | `32px 0 48px` |
| Card width | `600px` |
| Card border-radius | `20px` (all 4 corners) |
| Hero container padding | `0 36px` (sides) |
| Section side padding (desktop) | `48px` |
| Section side padding (mobile) | `35px` (via @media) |
| Subhead + top CTA section | `padding: 24px 48px 28px` |
| Body block 1 section | `padding: 24px 48px 32px` |
| B2 wrapper | `padding: 8px 36px 0` |
| B2 inner box border-radius | `10px` |
| B2 inner box padding | `16px 20px` |
| Bottom CTA section | `padding: 16px 0 36px` |

---

## 5. Images — The Only Variables

| Slot | Description | Display dimensions |
|---|---|---|
| `images[0]` — Hero | Full-bleed pill hero | `528 × 680px` inside 36px side padding |
| `images[1]` — img1 | Long image below body | `528 × 360px`, border-radius `8px` |
| `images[2]` — img2 | Left strip image | `49% × 220px`, border-radius `6px` |
| `images[3]` — img3 | Right strip image | `49% × 220px`, border-radius `6px` |

**What you can change per campaign:** image URL, scale, X/Y position, headline text, subhead text, body copy, CTA text, CTA URL.  
**What you never change:** any size, font, padding, border-radius, or color value in this spec.

---

## 6. Locked @media CSS Block

Copy this exactly into any new future template's `<style>` block.  
In `TemplatePreview.jsx` this is stored as `SHARED_MOBILE_CSS` — use `${SHARED_MOBILE_CSS}` in the template's `<style>` tag.

```css
/* ── SHARED MOBILE OVERRIDES — DO NOT EDIT INLINE, UPDATE TEMPLATE_SPEC.md ── */
@media only screen and (max-width:600px){
  .w2-section    { padding-left:35px!important; padding-right:35px!important; }
  .w2-btn-img    { width:300px!important; max-width:300px!important; }
  .w2-b2         { padding-left:35px!important; padding-right:35px!important; }
  .w2-b2-inner   { padding-left:0!important;   padding-right:0!important;   }
  .mobile-body    { font-size:17px!important; line-height:1.5!important; }
  .mobile-subhead { font-size:17px!important; line-height:1.4!important; }
  .mobile-b2title { font-size:22px!important; line-height:1.25!important; }
  .mobile-closing { font-size:17px!important; line-height:1.5!important; }
  .mobile-cta     { font-size:20px!important; padding:20px 80px!important; }
  .mobile-footer  { font-size:14px!important; line-height:1.4!important; }
}
```

---

## 7. How to Update This Spec

1. Edit the relevant table in this file (`TEMPLATE_SPEC.md`)
2. Update the matching value in `SHARED_MOBILE_CSS` constant inside `TemplatePreview.jsx`
3. All new templates built after that point will pick up the change automatically
4. **Existing templates are never touched** — they have their own inline CSS

---

## 8. Gmail Behaviour Note

Gmail (desktop + mobile) strips the entire `<style>` block. This means:
- `@media` overrides **never apply** in Gmail — the inline `style=""` values are always used
- To guarantee a size in Gmail mobile, it must be in the inline style
- Inline styles apply to **all screen sizes** — desktop and mobile see the same value
- The @media block only benefits Apple Mail, Samsung Mail, and similar clients
