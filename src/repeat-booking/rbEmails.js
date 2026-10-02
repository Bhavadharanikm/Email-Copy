/**
 * The three emails of the repeat booking flow, from the "Overview repeat
 * booking flow" doc.
 *
 * templateId points at the TEMPLATES registry in TemplatePreview.jsx; null
 * means that email's template is not built yet and its row cannot be opened.
 */

export const RB_EMAILS = [
  { email: 1, templateId: 41, timing: '1 day after checkout', name: 'Returning-guest code',
    what: 'Thanks them and hands over a returning-guest code as a gesture.',
    designFrom: 'Welcome Flow Email 7' },
  { email: 2, templateId: 42, timing: '3 days before the code expires', name: 'Code ending soon',
    what: 'A friendly heads-up that the Email 1 code is about to expire.',
    designFrom: 'Welcome Flow Email 1' },
  { email: 3, templateId: 43, timing: '60–90 days before the one-year mark', name: 'Anniversary',
    what: 'Their stay is coming up on a year, so it invites them back with a new code.',
    designFrom: 'Welcome Flow Email 3 intro, then Email 1 featured stays' },
]

export const rbEmail = (n) => RB_EMAILS.find(e => e.email === Number(n)) || null

/** "1 day after checkout · Returning-guest code", without the "Email N" part. */
export const rbEmailDetail = (n) => {
  const e = rbEmail(n)
  return e ? `${e.timing} · ${e.name}` : ''
}

/**
 * The brief each email seeds into the prompt box: the prompt's own PER-RUN
 * INPUT block, so the writer fills exactly what the prompt asks for. Sent as
 * typed. An empty line is a blocker the copy will ask the client about.
 */
const RB_BRIEF_LINES = {
  1: [
    'PROPERTY_NAME: ',
    'TARGET_AUDIENCE: ',
    'HOST_SIGN_OFF: ',
    'RETURN_CODE: ',
    'RETURN_DISCOUNT: ',
    'RETURN_MINIMUM_NIGHTS: ',
    'CODE_VALIDITY: ',
    'CODE_EXPIRY_MERGE_TAG: NOT AVAILABLE',
    'BOOKING_CHANNEL: direct',
    'CTA_URL: ',
    'UNIVERSAL_AMENITIES: ',
    'APPROVED_INFERENCES: none',
  ],
  2: [
    'PROPERTY_NAME: ',
    'TARGET_AUDIENCE: ',
    'HOST_SIGN_OFF: ',
    'RETURN_CODE: ',
    'RETURN_DISCOUNT: ',
    'RETURN_MINIMUM_NIGHTS: ',
    'EXPIRY_DATE_MERGE_TAG: NOT AVAILABLE',
    'SEND_OFFSET_DAYS: 3',
    'CODE_APPLIES_TO: UNKNOWN',
    'BOOKING_CHANNEL: direct',
    'CTA_URL: ',
    'MULTI_UNIT: ',
    'UNIT_ROSTER: ',
    'UNIT_PHOTOS: available per unit',
    'UNIT_LINKS: NOT AVAILABLE',
    'UNIVERSAL_AMENITIES: ',
    'APPROVED_INFERENCES: none',
  ],
  3: [
    'PROPERTY_NAME: ',
    'TARGET_AUDIENCE: ',
    'HOST_SIGN_OFF: ',
    'STAY_MONTH_MERGE_TAG: NOT AVAILABLE',
    'STAY_SEASON_MERGE_TAG: NOT AVAILABLE',
    'STAY_FIELD_ALWAYS_FILLED: UNKNOWN',
    'ANNIVERSARY_CODE: ',
    'ANNIVERSARY_DISCOUNT: ',
    'ANNIVERSARY_MINIMUM_NIGHTS: ',
    'CODE_VALIDITY: ',
    'EARLY_ACCESS: NONE',
    'BOOKING_CHANNEL: direct',
    'CTA_URL: ',
    'MULTI_UNIT: ',
    'UNIT_ROSTER: ',
    'UNIT_PHOTOS: available per unit',
    'UNIT_LINKS: NOT AVAILABLE',
    'UNIVERSAL_AMENITIES: ',
    'APPROVED_INFERENCES: none',
  ],
}

/* Fields a later email carries over from an earlier one's brief: the client
   facts, Email 1's code and terms (Email 2 must match them), and the stay
   types (Emails 2 and 3 show the same roster). Email 3's anniversary code is
   its own, so it is never carried. */
const CARRIED = new Set(['PROPERTY_NAME', 'TARGET_AUDIENCE', 'HOST_SIGN_OFF', 'RETURN_CODE', 'RETURN_DISCOUNT',
  'RETURN_MINIMUM_NIGHTS', 'BOOKING_CHANNEL', 'CTA_URL', 'UNIVERSAL_AMENITIES',
  'MULTI_UNIT', 'UNIT_ROSTER', 'UNIT_PHOTOS', 'UNIT_LINKS'])

/** The seeded brief: CLIENT, then this email's fields, with any value an
    earlier email's brief already holds for a carried field filled in. */
export const rbBriefTemplate = (clientName, email, earlierBriefs = '') => {
  const known = {}
  for (const line of [].concat(earlierBriefs).join('\n').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+):\s*(.*)$/)
    if (m && CARRIED.has(m[1]) && m[2].trim() && !known[m[1]]) known[m[1]] = m[2].trim()
  }
  const lines = (RB_BRIEF_LINES[Number(email)] || []).map(l => {
    const key = l.split(':')[0]
    return known[key] ? `${key}: ${known[key]}` : l
  })
  return [`CLIENT: ${clientName || ''}`, ...lines].join('\n')
}

/* Sample copy so the design shows before an email has copy of its own. From
   the worked example in the Email 1 prompt (an invented client); never pushed. */
export const RB_SAMPLE_COPY = {
  1: {
    name: 'The Thank-You', subjectLine: 'Can we say thank you properly?',
    previewText: 'A thank-you from everyone at Larkspur Ridge is waiting inside.',
    campaignEyebrow: 'A THANK-YOU FROM US',
    headlineText: 'Thank you for trusting us with your trip.',
    bodyText: 'Thank you for staying at Larkspur Ridge. Choosing where to spend your time away is a real decision, and you chose us. We’re grateful.',
    sectionEyebrow: 'From Us', bodyBlock2Title: 'A small thank-you for next time',
    bodyBlock2: 'Here’s a code to say it properly. RETURN15 takes 15% off any stay of two nights or more, good for the next 45 days. Hold on to it for whenever you’re ready.',
    codeDisplay: 'RETURN15', closingLine: 'Whenever the timing feels right, we’ll be glad to have you back.',
    signOff: 'Maya and the Larkspur Ridge team',
    ctaText: 'Book your next stay', ctaUrl: '',
    footerLine: 'Code RETURN15 takes 15% off any stay of two nights or more when you book direct. Good for the next 45 days.',
  },
  2: {
    name: 'The Heads-Up', subjectLine: 'Your Larkspur Ridge code is still waiting',
    previewText: 'Your 15% off is still here for a few more days.',
    campaignEyebrow: 'A QUICK HEADS-UP',
    headlineText: 'A quick heads-up: your code expires in 3 days.',
    bodyText: 'Life gets busy, and codes get buried in inboxes. Yours is still good for 15% off your next stay at Larkspur Ridge. We wanted to make sure you had the chance to use it.',
    sectionHeadline: 'Stay again or try something new',
    propertyCards: [
      { name: 'The Meadow Cabin', description: 'A creekside cabin with a screened porch.', stats: '' },
      { name: 'The Lookout', description: 'An open-plan loft with skylights over the bed.', stats: '' },
      { name: 'The Hearth House', description: 'A two-bedroom cabin built around a wood stove.', stats: '' },
    ],
    codeDisplay: 'RETURN15', termsLine: '15% off any stay of two nights or more when you book direct.',
    closingLine: 'Whenever the next trip comes around, Larkspur Ridge will be ready for you. Pick the stay you like, add your code, and we’ll take it from there.',
    signOff: 'Maya and the Larkspur Ridge team',
    ctaText: 'Book now', ctaUrl: '',
    footerLine: 'Code RETURN15 takes 15% off any stay of two nights or more when you book direct. Book within the next 3 days to use it.',
  },
  3: {
    name: 'Coming Back Around', subjectLine: 'Is it almost that time again?',
    previewText: 'Larkspur Ridge set something aside for your return, whenever you’re ready.',
    campaignEyebrow: 'COMING UP ON A YEAR',
    headlineText: 'Some trips are worth coming back to.',
    bodyText: 'Last {{contact.stay_season}}, you stayed at Larkspur Ridge. That time of year is almost here again, and we’d love to host you when it comes around.',
    bodyBlock2: 'So we set aside a code for your return. Think of it as our way of keeping the door open.',
    sectionHeadline: 'Stay again or try something new',
    propertyCards: [
      { name: 'The Meadow Cabin', description: 'A creekside cabin with a screened porch.', stats: '' },
      { name: 'The Lookout', description: 'An open-plan loft with skylights over the bed.', stats: '' },
      { name: 'The Hearth House', description: 'A two-bedroom cabin built around a wood stove.', stats: '' },
    ],
    codeDisplay: 'YEAR15', termsLine: '15% off any stay of two nights or more when you book direct, good for the next 60 days.',
    closingLine: 'Whichever stay you choose, Larkspur Ridge will be ready for you. Pick your dates, add your code, and we’ll take care of the rest.',
    signOff: 'Maya and the Larkspur Ridge team',
    ctaText: 'Book your return', ctaUrl: '',
    footerLine: 'Code YEAR15 takes 15% off any stay of two nights or more when you book direct. Good for the next 60 days.',
  },
}

/** The copy editor's fields per email, in the order they appear in the email. */
export const RB_COPY_FIELDS = {
  1: [
    { key: 'subjectLine',     label: 'Subject Line',      hint: '4–9 words. No name, no discount figure, no urgency' },
    { key: 'previewText',     label: 'Preview Text',      hint: '8–14 words. Supports the subject, never repeats it' },
    { key: 'campaignEyebrow', label: 'Campaign Eyebrow',  hint: '2–4 words, small caps. Same in all 3', fixed: true },
    { key: 'headlineText',    label: 'Hero Headline',     hint: '4–10 words. Adds something the subject did not' },
    { key: 'bodyText',        label: 'Thank-You Block',   hint: '2–3 sentences, max 45 words. Never describes the stay' },
    { key: 'sectionEyebrow',  label: 'Section Eyebrow',   hint: '1–3 words. Small label above the offer' },
    { key: 'bodyBlock2Title', label: 'Offer Block Title', hint: '3–7 words. The code as a thank-you' },
    { key: 'bodyBlock2',      label: 'Offer Block',       hint: '2–3 sentences. The terms once, then a "whenever you’re ready" beat' },
    { key: 'codeDisplay',     label: 'Code Display',      hint: 'The code only. Same in all 3', fixed: true },
    { key: 'closingLine',     label: 'Closing Line',      hint: '1 sentence. Warm, no pressure' },
    { key: 'signOff',         label: 'Sign-Off',          hint: 'Exactly as the brief documents it. Same in all 3', fixed: true },
    { key: 'ctaText',         label: 'CTA',               hint: 'Exactly "Book your next stay"', fixed: true },
    { key: 'ctaUrl',          label: 'CTA URL',           hint: 'Full URL with https://', fixed: true },
    { key: 'footerLine',      label: 'Footer Code Reminder', hint: 'Code, discount, minimum, validity, channel', fixed: true },
  ],
  2: [
    { key: 'subjectLine',     label: 'Subject Line',      hint: '4–9 words. No exclamation points, no "last chance"' },
    { key: 'previewText',     label: 'Preview Text',      hint: '8–14 words. Supports the subject, may state the discount' },
    { key: 'campaignEyebrow', label: 'Campaign Eyebrow',  hint: '2–4 words, small caps. A heads-up, not an alarm. Same in all', fixed: true },
    { key: 'headlineText',    label: 'Hero Headline',     hint: '6–14 words. Only one variation states the expiry here' },
    { key: 'bodyText',        label: 'Reminder Block',    hint: '2–3 sentences, max 50 words. States the expiry first when the headline does not' },
    { key: 'sectionHeadline', label: 'Unit Block Title',  hint: '3–8 words. A choice: stay again or try something new. Blank hides the stays' },
    { key: 'propertyCards',   label: 'Featured Units',    hint: 'Every stay type, name and description word for word from the brief, each with a View Dates button. Same in all', fixed: true, type: 'units', button: true },
    { key: 'codeDisplay',     label: 'Code Display',      hint: 'The code only. Same as Email 1', fixed: true },
    { key: 'termsLine',       label: 'Terms Line',        hint: 'Discount, minimum and channel in one sentence', fixed: true },
    { key: 'closingLine',     label: 'Closing Line',      hint: '2–3 sentences, 25–45 words. No deadline, no terms' },
    { key: 'signOff',         label: 'Sign-Off',          hint: 'Exactly as the brief documents it', fixed: true },
    { key: 'ctaText',         label: 'CTA',               hint: 'Exactly "Book now"', fixed: true },
    { key: 'ctaUrl',          label: 'CTA URL',           hint: 'Full URL with https://', fixed: true },
    { key: 'footerLine',      label: 'Footer Code Reminder', hint: 'Code, discount, minimum, the expiry, channel', fixed: true },
  ],
  3: [
    { key: 'subjectLine',     label: 'Subject Line',      hint: '4–9 words. No merge tag, discount or urgency' },
    { key: 'previewText',     label: 'Preview Text',      hint: '8–14 words. Supports the subject, may mention the offer' },
    { key: 'campaignEyebrow', label: 'Campaign Eyebrow',  hint: '2–4 words, small caps, on the photo above the headline. Same in all', fixed: true },
    { key: 'headlineText',    label: 'Hero Headline',     hint: '5–12 words. First word italic, middle in caps, last word italic. No urgency, no offer' },
    { key: 'bodyText',        label: 'Memory Block',      hint: 'Opens with the callback, the same in all. Max 50 words. Merge tags stay as written' },
    { key: 'bodyBlock2',      label: 'Offer Block',       hint: '2–3 sentences. The offer as a reason to come back' },
    { key: 'sectionHeadline', label: 'Unit Block Title',  hint: '3–8 words. A choice: stay again or try something new. Blank hides the title' },
    { key: 'propertyCards',   label: 'Featured Units',    hint: 'Every stay type, name and description word for word from the brief, each with a View Dates button. Same in all', fixed: true, type: 'units', button: true },
    { key: 'codeDisplay',     label: 'Code Display',      hint: 'The anniversary code only, never the Email 1 code. Same in all', fixed: true },
    { key: 'termsLine',       label: 'Terms Line',        hint: 'Discount, minimum, validity and channel in one sentence', fixed: true },
    { key: 'closingLine',     label: 'Closing Line',      hint: '2–3 sentences, 25–45 words. No callback, no terms' },
    { key: 'signOff',         label: 'Sign-Off',          hint: 'Exactly as the brief documents it', fixed: true },
    { key: 'ctaText',         label: 'CTA',               hint: 'Exactly "Book your return"', fixed: true },
    { key: 'ctaUrl',          label: 'CTA URL',           hint: 'Full URL with https://', fixed: true },
    { key: 'footerLine',      label: 'Footer Offer Reminder', hint: 'Code, discount, minimum, validity, channel', fixed: true },
  ],
}

export const RB_MULTILINE = new Set(['bodyText', 'bodyBlock2', 'closingLine', 'footerLine', 'description'])
