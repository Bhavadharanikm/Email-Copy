/**
 * What the copy editor shows, per welcome-flow week.
 *
 * Each welcome email is written to its own brief, so the fields differ. Week 1
 * is an offer email built around featured stays; Week 2 is an itinerary built
 * around five moments across two days. Keeping the shapes here means the editor
 * renders whatever the week needs instead of hardcoding one email's structure.
 *
 * A schema has three parts, rendered in this order:
 *   before  — flat fields above the repeated block
 *   group   — the repeated block, either 'dynamic' (add/remove, like stays) or
 *             'fixed' (a set list with its own labels, like the day/time slots)
 *   after   — flat fields below it
 *
 * Field keys are shared with the templates and parseWfCopy deliberately. Where
 * a Week 2 field means the same thing as a Week 1 one it reuses the key
 * (Headline -> headlineText, Intro Line -> bodyText, CTA Button -> ctaText), so
 * the template renders it without special-casing. Only the moments are new.
 */

const WEEK1 = {
  week: 1,
  before: [
    { key: 'subjectLine',     label: 'Subject Line',     hint: 'One sentence. Question, imperative, or pattern interrupt' },
    { key: 'previewText',     label: 'Preview Text',     hint: '8–9 words. Supports the subject, never repeats it. No location' },
    { key: 'campaignEyebrow', label: 'Campaign Eyebrow', hint: '3–5 words, small caps. Same across all 3 variations' },
    { key: 'headlineText',    label: 'Hero Headline',    hint: '4–7 words. Must make sense on its own' },
    { key: 'heroCtaText',     label: 'Hero CTA',         hint: 'Pill on the hero image, under the headline. e.g. "Use code STAR23 at checkout."' },
    { key: 'bodyText',        label: 'Intro Body',       hint: '2–3 sentences, 30–40 words. States the offer. No feature list' },
    { key: 'introCtaText',    label: 'Intro CTA',        hint: '2–3 words. Button below the intro line, into the property section' },
    { key: 'sectionEyebrow',  label: 'Section Eyebrow',  hint: '1–3 words. Small label above the property block' },
    { key: 'sectionHeadline', label: 'Section Headline', hint: '5–8 words. Names the region or collection' },
    { key: 'sectionSubhead',  label: 'Section Subhead',  hint: 'One sentence, 6–10 words. Names audience and brand' },
  ],
  group: {
    mode:      'dynamic',
    listKey:   'propertyCards',
    title:     'Featured Stays',
    note:      'Facts stay the same across all 3 variations; only the description shifts',
    itemLabel: 'Stay',
    addLabel:  'Add stay',
    /* Capped at 3: each stay takes one sub-image slot, and the picker offers
       Sub 1-3 for this template. */
    max:       3,
    blank:     { name: '', stats: '', description: '', ctaText: 'View Dates', ctaUrl: '' },
    fields: [
      { key: 'name',        label: 'Card Name',        hint: 'Exact from the brief — never invented or shortened' },
      { key: 'stats',       label: 'Card Stats',       hint: 'bed | bath | guests, in that order. Missing figure → leave blank' },
      { key: 'description', label: 'Card Description', hint: '5–8 words. What the guest does with it' },
      { key: 'ctaText',     label: 'Card CTA',         hint: '2–3 words' },
      { key: 'ctaUrl',      label: 'Card CTA URL',     hint: 'Where this stay links to — one per stay' },
    ],
  },
  after: [
    { key: 'bodyBlock2Title', label: 'Body Block Title', hint: 'One sentence, present tense. Gentle pressure, no invented urgency' },
    { key: 'bodyBlock2',      label: 'Body Block',       hint: 'One sentence. Real urgency only — an actual offer or availability' },
    { key: 'closingLine',     label: 'Closing Line',     hint: '1–2 sentences. Warm but direct' },
    { key: 'ctaText',         label: 'CTA',              hint: '2–3 words. The final push out of the email' },
    { key: 'ctaUrl',          label: 'CTA URL',          hint: 'Full URL with https://' },
  ],
}

/* Suggested titles, used to pre-fill each new moment as it is added. Only a
   starting point — the title is an editable field, so a flow that runs three
   days or names its moments differently just says so. */
export const WF2_MOMENTS = [
  'Day One, Afternoon',
  'Day One, Evening',
  'Day Two, Morning',
  'Day Two, Afternoon',
  'Day Two, Evening',
]

const WEEK2 = {
  week: 2,
  before: [
    { key: 'subjectLine',  label: 'Subject Line', hint: 'One sentence. The promise of the two days' },
    { key: 'previewText',  label: 'Preview Text', hint: '8–9 words. Supports the subject, never repeats it' },
    { key: 'headlineText', label: 'Headline',     hint: '4–7 words. Must make sense on its own' },
    { key: 'bodyText',     label: 'Intro Line',   hint: '1–2 sentences. Sets up the itinerary without selling' },
    { key: 'introCtaText', label: 'Intro CTA',    hint: '2–3 words. Button under the intro line, into the itinerary. Falls back to the CTA Button' },
    { key: 'sectionEyebrow', label: 'Section Eyebrow', hint: 'Small label above the itinerary. Left blank it reads "Your Itinerary"' },
  ],
  group: {
    mode:      'dynamic',
    listKey:   'moments',
    title:     'Moments',
    note:      'One block per moment, in order. How many is up to the client',
    itemLabel: 'Moment',
    addLabel:  'Add moment',
    /* Capped at 5: each moment takes one sub-image slot, and the picker offers
       Sub 1-5 for this template. */
    max:       5,
    /* Pre-fills the title of each moment as it is added. */
    defaultLabels: WF2_MOMENTS,
    blank:     { label: '', momentCopy: '' },
    fields: [
      { key: 'label',      label: 'Moment Title', hint: 'e.g. "Day One, Afternoon" — shown in the email above the copy' },
      { key: 'momentCopy', label: 'Moment Copy',  hint: '1–2 sentences. Present tense, second person' },
    ],
  },
  after: [
    { key: 'bodyBlock2Title', label: 'Body Block Title', hint: 'One line above the paragraph that closes out the itinerary' },
    { key: 'bodyBlock2',      label: 'Body Block',       hint: 'The paragraph after the moments, before the closing line' },
    { key: 'ctaText',         label: 'CTA Button',       hint: '2–3 words. The final push out of the email' },
    { key: 'ctaUrl',          label: 'CTA URL',          hint: 'Full URL with https://' },
    { key: 'closingLine',     label: 'Closing Line',     hint: 'Carries the code and the terms. Warm but direct' },
    { key: 'footerLine',      label: 'Code Reminder',    hint: 'Small line under the button — what the code is worth and where to book' },
  ],
}

/* Week 3 is social proof: a short setup, then guest reviews quoted verbatim,
   then one CTA. Quotes are never rewritten, so the editor keeps them in their
   own field with the attribution beside them. */
const WEEK3 = {
  week: 3,
  before: [
    { key: 'subjectLine',     label: 'Subject Line',     hint: 'One sentence. Names the guest or the moment' },
    { key: 'previewText',     label: 'Preview Text',     hint: 'A short fragment, verbatim from one of the reviews' },
    { key: 'headlineText',    label: 'Hero Headline',    hint: 'On the hero photo. 4–7 words, makes sense on its own' },
    { key: 'sectionEyebrow',  label: 'Section Label',    hint: 'The small chip above the reviews. Blank reads "Testimonials"' },
    { key: 'sectionHeadline', label: 'Section Headline', hint: 'Heading above the reviews. Blank reads "Hear From Our Guests"' },
    { key: 'bodyText',        label: 'Setup Line',       hint: 'One line under that heading. Hands over to the guests instead of selling' },
  ],
  group: {
    mode:      'dynamic',
    listKey:   'reviews',
    title:     'Reviews',
    note:      'Quoted verbatim — never tidied or shortened. How many is up to the client',
    itemLabel: 'Review',
    addLabel:  'Add review',
    /* Capped at 3: each review takes one sub-image slot, and the picker offers
       Sub 1-3 for this template. */
    max:       3,
    blank:     { quote: '', guestFirstName: '', stayType: '', monthYear: '', platform: '' },
    fields: [
      { key: 'quote',          label: 'Quote',           hint: 'The guest\u2019s own words. Trim with an ellipsis if long, never reword' },
      { key: 'guestFirstName', label: 'Guest First Name', hint: 'First name only' },
      { key: 'stayType',       label: 'Stay',            hint: 'Which stay they booked, e.g. Deluxe Dome' },
      { key: 'monthYear',      label: 'Month & Year',    hint: 'e.g. July 2026' },
      { key: 'platform',       label: 'Platform',        hint: 'Where the review came from, e.g. Airbnb. Blank hides it' },
    ],
  },
  after: [
    { key: 'bodyBlock2Title', label: 'Body Block Title', hint: 'One line above the closing paragraph' },
    { key: 'bodyBlock2',      label: 'Body Block',       hint: 'The paragraph after the reviews, before the closing line' },
    { key: 'closingLine',     label: 'Closing Line',     hint: '1–2 sentences. Warm but direct' },
    { key: 'ctaText',         label: 'CTA Button',       hint: '2–4 words. One button for the whole email' },
    { key: 'ctaUrl',          label: 'CTA URL',          hint: 'Full URL with https://' },
    { key: 'footerLine',      label: 'Footer Line',      hint: 'The code reminder — what it is worth and where to book' },
  ],
}

/* Week 4 is the local area guide: a few grouped recommendations, then one
   bridge back to the property. The recommendations arrive from n8n as blocks of
   {name, detail} entries; the editor keeps each block's entries in a single
   textarea, one "Name — detail" per line, rather than a nested add/remove UI.
   That is a deliberate trade: the copy is written as prose lines anyway, and a
   nested list would need its own editor. The template splits on the dash. */
const WEEK4 = {
  week: 4,
  before: [
    { key: 'subjectLine',    label: 'Subject Line',   hint: 'One sentence. Names a place, not the property' },
    { key: 'previewText',    label: 'Preview Text',   hint: '8–9 words. What the guide covers' },
    { key: 'headlineText',   label: 'Hero Headline',  hint: 'On the hero photo. 4–8 words' },
    { key: 'sectionSubhead', label: 'Hero Subhead',   hint: 'One line under the hero. Sets up the recommendations' },
  ],
  group: {
    mode:      'dynamic',
    listKey:   'blocks',
    title:     'Area Blocks',
    note:      'One block per theme, in order. Each block takes one photo',
    itemLabel: 'Block',
    addLabel:  'Add block',
    /* Capped at 3: each block takes one sub-image slot, and the picker offers
       Sub 1-3 for the blocks (Sub 4 is the bridge-back photo). */
    max:       3,
    blank:     { blockHeader: '', entries: '' },
    fields: [
      { key: 'blockHeader', label: 'Block Header', hint: 'A few words, small caps. e.g. "Where To Wander"' },
      { key: 'entries',     label: 'Entries',      hint: 'One per line, written as "Name — what it is". The name comes out bold' },
    ],
  },
  after: [
    { key: 'bodyBlock2Title', label: 'Bridge Back Title', hint: 'One line over the bridge-back paragraph, e.g. "Then there\u2019s the drive back"' },
    { key: 'bodyBlock2',      label: 'Bridge Back',       hint: 'The paragraph that turns the day out there back towards the stay' },
    { key: 'ctaText',    label: 'CTA Button',    hint: '2–4 words. One button for the whole email' },
    { key: 'ctaUrl',     label: 'CTA URL',       hint: 'Full URL with https://' },
    { key: 'footerLine', label: 'Code Reminder', hint: 'What the code is worth and where to book' },
  ],
}

const SCHEMAS = { 1: WEEK1, 2: WEEK2, 3: WEEK3, 4: WEEK4 }

/* "guestFirstName" -> "Guest First Name"; "cta_url" -> "Cta Url". */
const humanise = (k) => String(k)
  .replace(/[_-]+/g, ' ')
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  .replace(/\b\w/g, c => c.toUpperCase())
  .trim()

/* Keys the parser adds for its own bookkeeping, not copy to edit. */
const HIDDEN = new Set(['id', 'name', 'subhead', 'introCtaText'])

/**
 * An editor for an email that has no schema yet, derived from the copy itself:
 * every string becomes a field, and the first list of objects becomes the
 * repeated block with one field per key. Nothing the workflow sent is hidden,
 * so the copy can be reviewed and edited before its template exists. The
 * order follows the copy, which is the order the workflow wrote it in.
 */
function derivedSchema(week, sample) {
  const before = [], after = []
  let group = null
  for (const [k, v] of Object.entries(sample || {})) {
    if (HIDDEN.has(k)) continue
    if (Array.isArray(v) && v.length && typeof v[0] === 'object' && !group) {
      const keys = [...new Set(v.flatMap(o => Object.keys(o || {})))]
      group = {
        mode: 'dynamic', listKey: k, title: humanise(k),
        note: 'Fields taken from what the workflow sent', itemLabel: 'Item', addLabel: 'Add item',
        max: 9, blank: Object.fromEntries(keys.map(x => [x, ''])),
        fields: keys.map(x => ({ key: x, label: humanise(x), hint: '' })),
      }
    } else if (typeof v === 'string' || typeof v === 'number') {
      (group ? after : before).push({ key: k, label: humanise(k), hint: '' })
    }
  }
  if (!before.length && !group && !after.length) {
    before.push({ key: 'subjectLine', label: 'Subject Line', hint: '' }, { key: 'headlineText', label: 'Hero Headline', hint: '' })
  }
  return { week: Number(week), before, group, after, derived: true }
}

/**
 * The editor schema for a week. Weeks 1-4 have one of their own; any other
 * week gets one derived from the copy passed in, so Generate works for every
 * email before its template is built.
 */
export const wfCopySchema = (week, sample) => SCHEMAS[Number(week)] || derivedSchema(week, sample)

/** Every flat field of a schema, in display order — handy for validation. */
export const wfCopyFlatFields = (week) => {
  const s = wfCopySchema(week)
  return [...s.before, ...s.after]
}
