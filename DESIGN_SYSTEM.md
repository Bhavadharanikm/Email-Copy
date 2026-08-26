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

## Where the templates currently disagree

Recorded so the gap is visible rather than forgotten. None of these are fixed yet.

- **Serif headings.** Week 1 WF, Week 2 WF and Week 3 WF set their section
  headings and moment titles in **Lora**, not Arial. The design system is
  Arial-only, so either the templates change or the system records Lora as a
  deliberate display face. Undecided.
- **Heading sizes.** The section headings in those templates are 26px, which
  matches neither Heading 2 (32 desktop) nor Heading 3 (24 desktop).
- **Buttons.** Week 3's bottom CTA is 15px on desktop and its hero pill is 23px;
  the system says 16px. The hero pill is exempt, the bottom CTA is not.
- **No chips use the ramp.** The "Testimonials" and "Your Itinerary" chips use
  the page's neutral tint rather than brand 200 with a brand 400 border.
