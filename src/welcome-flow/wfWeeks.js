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
 * number; the server resolves it to N8N_WF_WEEK<n>_WEBHOOK_URL, or to the single
 * N8N_WF_WEBHOOK_URL when one workflow serves every email, so the URLs stay
 * out of the bundle.
 */

export const WF_WEEKS = [
  { week: 1, templateId: 31, day: 0,  name: 'Welcome & code',
    what: 'Hands over the code and puts the featured stays in front of the reader as cards.' },
  { week: 2, templateId: 32, day: 1,  name: 'Itinerary',
    what: 'Sketches a perfect 48 hours: four to six loose moments across two days, nothing over-planned.' },
  { week: 3, templateId: 33, day: 3,  name: 'Reviews',
    what: 'Three guest reviews, word for word. Proof rather than persuasion.' },
  { week: 4, templateId: 34, day: 7,  name: 'Destination',
    what: 'Makes the area the draw, with three grouped blocks of places narrowing to a single recommendation.' },
  { week: 5, templateId: 35, day: 12, name: 'Guest story',
    what: 'One guest\u2019s stay in their own words, start to finish.' },
  { week: 6, templateId: 36, day: 17, name: 'Book direct',
    what: 'The trust argument: what changes when you book with the property, and the cancellation terms in full.' },
  { week: 7, templateId: 37, day: 22, name: 'Midweek perk',
    what: 'The one genuinely new offer in the flow: midweek nights and the perk attached to them.' },
  { week: 8, templateId: null, day: 28, name: 'Decision nudge',
    what: 'Shrinks the ask. Answers the objections still standing, with no deadline and no urgency.' },
  { week: 9, templateId: null, day: 33, name: 'Concierge close',
    what: 'Asks for a reply instead of a click. No link, signed by a person.' },
]

/** "Email 3 · Day 3 · Reviews" — how an email is named wherever it is listed. */
export const wfWeekLabel = (week) => {
  const w = wfWeek(week)
  if (!w) return `Email ${week}`
  return `Email ${w.week}${w.day === undefined ? '' : ` \u00b7 Day ${w.day}`}${w.name ? ` \u00b7 ${w.name}` : ''}`
}

export const wfWeek = (week) => WF_WEEKS.find(w => w.week === Number(week)) || null

/** A week is usable once its template exists. */
export const wfWeekReady = (week) => !!wfWeek(week)?.templateId

/**
 * The brief each week seeds into the prompt box — Pooja's own templates,
 * verbatim. "Client Name" is filled from the client; "Theme" is fixed per
 * week because it is what tells the workflow which email to write; every
 * other line is a label the writer completes. The whole box is sent to n8n as
 * typed, so nothing here is parsed — it is a prompt, not a form.
 */
const WF_BRIEF_LINES = {
  1: ['Theme: Generate the welcome email',
      'Audience: ',
      'Featured Stays: '],
  2: ['Theme: Generate the itinerary email',
      'Audience: ',
      'Optional: Offer \u2014 [code, discount, terms] (only if changed since the brief)'],
  3: ['Theme: Generate the reviews email',
      'Audience: '],
  4: ['Theme: Generate the destination email',
      'Audience: ',
      'Optional: Offer \u2014 [code, discount, terms] (only if changed since the brief)'],
  5: ['Theme: Generate the guest story email',
      'Optional: Promo code, discount, minimum (not needed when mentioned in the email brief)',
      'Audience: '],
  6: ['Theme: Generate the book direct email',
      'Audience: ',
      'Cancellation policy applies to: '],
  7: ['Theme: Generate the midweek email',
      'Perk: ',
      'Optional: Perk and code together \u2014 yes / no / not confirmed',
      'Optional: Midweek pricing \u2014 [as documented, or none]',
      'Audience: '],
  8: ['Theme: Generate the decision nudge email',
      'Audience: ',
      'Booking page is an availability calendar: not confirmed (add if the CTA link is a Calendar Page or a simple website page)'],
  9: ['Theme: Generate the concierge close email',
      'Audience: '],
}

const WF_BRIEF_FALLBACK = ['Theme: ', 'Audience: ']

/** The seeded brief for a week: "Client Name: X" then that week's lines. */
export const wfBriefTemplate = (clientName, week) =>
  [`Client Name: ${clientName || ''}`, ...(WF_BRIEF_LINES[Number(week)] || WF_BRIEF_FALLBACK)].join('\n')

/** True when the text is still an untouched seed for some week — safe to replace. */
export const wfBriefIsSeed = (text, clientName) =>
  !text?.trim() || Object.keys(WF_BRIEF_LINES).concat('x')
    .some(w => wfBriefTemplate(clientName, w) === text)
