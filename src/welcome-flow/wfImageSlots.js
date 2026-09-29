/**
 * wfImageSlots.js — which photos each welcome flow email actually uses.
 *
 * The picker used to offer the same six slots for all nine emails, labelled for
 * Email 1's stay cards and story circles. Only Email 1 uses six. The rest use
 * two to five, so people chose photos that went nowhere, and Email 9 — which has
 * no hero — led with a "Hero Image" slot that never appears in the email.
 *
 * Each slot keeps its position in the email's image list (`index`), because the
 * templates read by position: Email 9's circles are positions 1 and 2, not 0
 * and 1. That also means an email's existing choices stay exactly where they
 * were. Labels say where the photo lands in that email.
 *
 * `optional` marks a slot the template can do without — it falls back to
 * another photo. The picker still offers it; it just does not need filling.
 */

const hero = (desc = 'Main banner at the top') => ({ index: 0, label: 'Hero image', desc })

/* Email 2 has one photo per day, then one full-width photo before the last
   paragraph. How many days is up to the copy: "Day One, Afternoon" and "Day
   One, Evening" are one day. Same grouping the template uses. */
function email2Days(copy) {
  const moments = Array.isArray(copy?.moments) ? copy.moments.filter(m => m && (m.label || m.momentCopy)) : []
  const days = []
  for (const m of moments) {
    const day = (String(m.label || '').split(',')[0] || '').trim().toLowerCase() || `day ${days.length + 1}`
    if (!days.includes(day)) days.push(day)
  }
  return days.length || 2
}

const LAST_INDEX = 5   // the image list has six positions, 0 to 5

export function wfImageSlots(week, copy) {
  switch (Number(week)) {
    case 1: return [
      hero(),
      { index: 1, label: 'Stay card 1', desc: 'First featured stay' },
      { index: 2, label: 'Stay card 2', desc: 'Second featured stay' },
      { index: 3, label: 'Stay card 3', desc: 'Third featured stay' },
      { index: 4, label: 'Story, large circle', desc: 'The bigger of the two circles' },
      { index: 5, label: 'Story, small circle', desc: 'The smaller circle beside it' },
    ]
    case 2: {
      const days = Math.min(email2Days(copy), LAST_INDEX)
      const out = [hero('The arch at the top')]
      for (let d = 1; d <= days; d++) out.push({ index: d, label: `Day ${d} photo`, desc: `Beside day ${d}'s moments` })
      if (days + 1 <= LAST_INDEX) out.push({ index: days + 1, label: 'Closing photo', desc: 'Full width, before the last paragraph' })
      return out
    }
    case 3: return [
      hero(),
      { index: 1, label: 'Review grid, top left',     desc: 'Beside the guest reviews' },
      { index: 2, label: 'Review grid, top right',    desc: 'Beside the guest reviews' },
      { index: 3, label: 'Review grid, bottom left',  desc: 'Beside the guest reviews' },
      { index: 4, label: 'Review grid, bottom right', desc: 'Beside the guest reviews' },
    ]
    case 4: return [
      hero(),
      { index: 1, label: 'Area photo 1', desc: 'Leads the first area block' },
      { index: 2, label: 'Area photo 2', desc: 'Leads the second area block' },
      { index: 3, label: 'Area photo 3', desc: 'Leads the third area block' },
      { index: 4, label: 'Bridge photo', desc: 'Above the drive-back paragraph' },
    ]
    case 5: return [
      hero(),
      { index: 1, label: 'Mosaic, left',   desc: 'Under the story, beside the right one' },
      { index: 2, label: 'Mosaic, right',  desc: 'Under the story, beside the left one' },
      { index: 3, label: 'Mosaic, wide',   desc: 'Full width, beneath the pair' },
    ]
    case 6: return [
      hero(),
      { index: 1, label: 'Photo card 1', desc: 'The pair of tilted photo cards' },
      { index: 2, label: 'Photo card 2', desc: 'Repeats card 1 if left empty', optional: true },
    ]
    case 7: return [
      hero(),
      { index: 1, label: 'Large circle', desc: 'The bigger of the two circles' },
      { index: 2, label: 'Small circle', desc: 'The smaller circle beside it' },
      { index: 3, label: 'Strip, left',  desc: 'Uses the large circle if left empty', optional: true },
      { index: 4, label: 'Strip, right', desc: 'Uses the small circle if left empty', optional: true },
    ]
    case 8: return [
      hero(),
      { index: 1, label: 'Large circle', desc: 'The bigger of the two circles' },
      { index: 2, label: 'Small circle', desc: 'The smaller circle beside it' },
    ]
    case 9: return [
      /* No hero: this email opens on text. */
      { index: 1, label: 'Large circle', desc: 'The bigger of the two circles' },
      { index: 2, label: 'Small circle', desc: 'The smaller circle beside it' },
    ]
    default: return [0, 1, 2, 3, 4, 5].map(i => i === 0 ? hero() : { index: i, label: `Image ${i + 1}`, desc: '' })
  }
}

export const WF_IMAGE_POSITIONS = LAST_INDEX + 1
