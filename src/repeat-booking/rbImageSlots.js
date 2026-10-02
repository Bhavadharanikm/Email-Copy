/**
 * Which photos each repeat booking email uses, at the positions its template
 * reads (same shape as welcome-flow/wfImageSlots.js).
 */

const hero = (desc) => ({ index: 0, label: 'Hero image', desc })

export function rbImageSlots(email, copy) {
  switch (Number(email)) {
    /* A copy of Welcome Flow Email 7's design, so the same five. */
    case 1: return [
      hero('The middle of the photo strip under the headline'),
      { index: 1, label: 'Large circle', desc: 'The bigger of the two circles. Uses Strip, left if left empty' },
      { index: 2, label: 'Small circle', desc: 'The smaller circle beside it. Uses Strip, right if left empty' },
      { index: 3, label: 'Strip, left',  desc: 'Uses the large circle if left empty', optional: true },
      { index: 4, label: 'Strip, right', desc: 'Uses the small circle if left empty', optional: true },
    ]
    /* Email 2 (Welcome Flow Email 1's design) and Email 3 (Welcome Flow Email
       3's hero over Email 1's cards): the hero, then one photo per stay type
       the copy shows, up to five, labelled with the stay's name. */
    case 2:
    case 3: {
      const units = (Array.isArray(copy?.propertyCards) ? copy.propertyCards : []).filter(c => c && (c.name || c.description)).slice(0, 5)
      return [
        hero('Property-wide: exterior, grounds or a shared space. Never a single unit'),
        ...units.map((u, i) => ({ index: i + 1, label: u.name || `Stay ${i + 1}`, desc: `Stay card ${i + 1}` })),
      ]
    }
    default: return [hero('Main banner at the top')]
  }
}

export const RB_IMAGE_POSITIONS = 6
