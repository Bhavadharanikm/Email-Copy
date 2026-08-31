# Email Design System

**This is the base every email is built on.** Everything follows it — headings,
body copy, chips, buttons — with one exception, stated below.

Transcribed from the design system screenshots. Updated 2026-08-26; the heading
sizes replace earlier values, see *Changed from the previous version* at the end.

---

## The one exception

The **hero** is exempt: the hero image, the hero headline, and any text sitting
on the hero photo. Those follow the individual template's design.

Everything below the hero follows this document, no matter what.

---

## Text scale

All **Arial**. Both numbers are px — the second is line-height, not a ratio.

| Role | Mobile | Desktop |
|---|---|---|
| Heading 1 | 32 / 38 | **38 / 44** |
| Heading 2 | 24 / 32 | **32 / 38** |
| Heading 3 | 20 / 30 | **24 / 32** |
| Body large | 18 / 28 | 18 / 28 |
| Body regular | 16 / 24 | 16 / 24 |
| Body small | 14 / 20 | 14 / 20 |

**Body sizes do not change between mobile and desktop.** Only the three headings
scale up.

---

## Chips

Identical on mobile and desktop — nothing about a chip changes with screen size.

| | Chip small | Chip medium |
|---|---|---|
| Font size | 12px | 14px |
| Line height | 12px | 14px |
| Padding left/right | 14px | 14px |
| Padding top/bottom | 6px | 6px |
| Background | brand 200 | `#F0F0F0` |
| Text | brand 900 | `#3A3A3A` |
| Border | brand 400 | `#DEDEDE` |

Chip small is the brand-coloured one; chip medium is the neutral grey.

---

## Buttons

| | Mobile | Desktop |
|---|---|---|
| Font size | 16px | 16px |
| Line height | 16px | 16px |
| Padding left/right | **Fill** — edge to edge | **40px** — hugs its label |
| Padding top/bottom | 12px | 12px |
| Background | brand 500 | brand 500 |
| Text | brand 950 | brand 950 |

The left/right value is the only difference between the two: a button spans the
full width on a phone and hugs its label on desktop.

"Usually brand 500 / brand 950" is how the source states the colours — the brand
board is the authority per client.

---

## Colour

Brand ramp positions (200, 400, 500, 900, 950) come from the client's brand
board, not from this document. The two fixed greys above — `#F0F0F0`, `#3A3A3A`,
`#DEDEDE` — are literal and do not vary by client.

---

## Changed from the previous version

Four values differ from what was recorded before. The new numbers win.

| | was | now |
|---|---|---|
| Heading 1, desktop | 36 / 44 | **38 / 44** |
| Heading 2, mobile | 26 / 32 | **24 / 32** |
| Heading 2, desktop | 30 / 38 | **32 / 38** |
| Heading 3, mobile | 20 / 26 | **20 / 30** |

Chips and buttons are unchanged.

---

## Display face

**Lora** is an approved display face for welcome-flow section headings — the
Week 2 Body Block Title and Week 3's "Hear From Our Guests" and "Enjoy property
amenities". It is not a licence to leave the scale: those headings sit at
**Heading 3**, 24/32 desktop and 20/30 mobile, the same numbers Arial would use.

Everything else below the hero is Arial.

---

## Where the templates currently disagree

Recorded so the gap is visible rather than forgotten.

- **Week 1 WF** still sets its section headline at Lora 26px with a ratio
  line-height. Left alone deliberately — Week 1 is not to be touched.
- **Week 3 WF** carries two sizes the system does not name: the hero pill at
  23px (the hero is exempt, so this is fine) and "Verified review" at 12px,
  which borrows Chip small because there is no caption size.
- **The footer** is on Body small 14/20 for Week 2 WF only, via the
  `systemSizes` option on `buildFooter`. Every other template — the weeklies,
  Week 1 WF and Week 3 WF — still renders it at 14/1.25, the brand name at 16px
  with no line-height, and the footer paragraph at 12px.
- **No chips use the brand ramp.** Week 2 and Week 3's chips are Chip medium's
  fixed greys (`#F0F0F0` / `#3A3A3A` / `#DEDEDE`) rather than brand 200 with a
  brand 400 border.

### Fully on the system

**Week 2 WF, below the hero** — verified by rendering and reading computed
styles: 17 text styles at 700px and 17 at 390px, all matching a named size.
