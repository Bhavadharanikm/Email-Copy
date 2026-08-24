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
    { key: 'ctaText',     label: 'CTA Button',   hint: '2–3 words. The final push out of the email' },
    { key: 'ctaUrl',      label: 'CTA URL',      hint: 'Full URL with https://' },
    { key: 'closingLine', label: 'Closing Line', hint: 'Carries the code and the terms. Warm but direct' },
  ],
}

const SCHEMAS = { 1: WEEK1, 2: WEEK2 }

/** Weeks with no schema of their own fall back to Week 1's shape. */
export const wfCopySchema = (week) => SCHEMAS[Number(week)] || WEEK1

/** Every flat field of a schema, in display order — handy for validation. */
export const wfCopyFlatFields = (week) => {
  const s = wfCopySchema(week)
  return [...s.before, ...s.after]
}
