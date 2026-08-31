/**
 * The emails that make up a welcome flow.
 *
 * Each one is its own thing: its own n8n workflow writes the copy, and its own
 * template renders it. Picking the week on the brief is what decides both, so
 * this list is the single place that mapping lives.
 *
 * templateId points at the TEMPLATES registry in TemplatePreview.jsx. A null
 * means that week's template has not been built yet — the week still shows in
 * the dropdown, marked as not ready, so the flow's shape stays visible.
 *
 * Webhook URLs are deliberately NOT here. The browser only ever sends the week
 * number; the server resolves it to N8N_WF_WEEK<n>_WEBHOOK_URL so the URLs stay
 * out of the bundle.
 */

export const WF_WEEKS = [
  { week: 1, templateId: 31 },   // Week 1 WF — the real welcome-offer template
  { week: 2, templateId: 32 },   // Week 2 WF — duplicate of Week 1 WF for now
  { week: 3, templateId: 33 },   // Week 3 WF — guest reviews
  { week: 4, templateId: 34 },   // Week 4 WF — the local area guide
  { week: 5, templateId: null },
  { week: 6, templateId: null },
  { week: 7, templateId: null },
  { week: 8, templateId: null },
  { week: 9, templateId: null },
]

export const wfWeek = (week) => WF_WEEKS.find(w => w.week === Number(week)) || null

/** A week is usable once its template exists. */
export const wfWeekReady = (week) => !!wfWeek(week)?.templateId

/**
 * The lines the brief seeds for each week — labels only, no values. The writer
 * fills them in; the whole box is sent to n8n as typed.
 *
 * Each week asks for what its own template renders, so Week 1 needs the offer
 * and the stays while Week 3 needs the reviews. A week with no entry falls back
 * to the three common lines.
 */
const WF_BRIEF_FIELDS = {
  1: ['Theme', 'Audience', 'Promo Code', 'Discount', 'Promo Terms',
      'Featured Stays (name + bed | bath | guests, up to 3)', 'Booking URL'],
  2: ['Theme', 'Audience', 'Moments (one per line, in order)', 'Booking URL'],
  3: ['Theme', 'Audience', 'Guest Reviews (quote + name, stay, month, platform)',
      'Promo Code', 'Discount', 'Booking URL'],
  4: ['Theme', 'Audience', 'Area Highlights (grouped: where to wander / eat / end up)',
      'Promo Code', 'Discount', 'Booking URL'],
}

const WF_BRIEF_FALLBACK = ['Theme', 'Audience']

/** The seeded brief for a week: "Client Name: X" then one blank label per line. */
export const wfBriefTemplate = (clientName, week) =>
  [`Client Name: ${clientName || ''}`,
   ...(WF_BRIEF_FIELDS[Number(week)] || WF_BRIEF_FALLBACK).map(f => `${f}:`)].join('\n')

/** True when the text is still an untouched seed for some week — safe to replace. */
export const wfBriefIsSeed = (text, clientName) =>
  !text?.trim() || Object.keys(WF_BRIEF_FIELDS).concat('x')
    .some(w => wfBriefTemplate(clientName, w) === text)
