/**
 * Turn the n8n workflow's Markdown output into variation objects.
 *
 * The Welcome Flow workflow returns prose, not JSON — a single string with
 * `VARIATION n — Name` headers and `**Field Label**` blocks under each. This
 * maps those labels onto the same field names the templates and the copy editor
 * already use, so parsed copy is indistinguishable from the test data.
 *
 * Written defensively on purpose: this is free-form model output, so labels may
 * drift. Anything unrecognised is ignored rather than throwing, and callers
 * should check that the result is non-empty before using it.
 */

/** Markdown label -> the field name used by the templates and the copy editor. */
const FIELD_MAP = {
  'subject line':          'subjectLine',
  'preview text':          'previewText',
  'campaign eyebrow':      'campaignEyebrow',
  'hero headline':         'headlineText',
  'hero cta':              'heroCtaText',
  'intro cta (hero cta)':  'heroCtaText',   // what the workflow currently emits
  'intro cta':             'introCtaText',
  'intro body':            'bodyText',
  'intro body block':      'bodyText',
  'body block':            'bodyText',      // legacy: older prose used this for the intro
  'section eyebrow':       'sectionEyebrow',
  'section headline':      'sectionHeadline',
  'section subhead':       'sectionSubhead',
  'closing nudge title':   'bodyBlock2Title',
  'body block title':      'bodyBlock2Title',
  'closing nudge':         'bodyBlock2',
  'closing line':          'closingLine',
  'cta':                   'ctaText',
  // Week 2 (the 48-hour itinerary) names some fields differently
  'headline':              'headlineText',
  'intro line':            'bodyText',
  'cta button':            'ctaText',
  // Week 3 (guest reviews)
  'setup':                 'bodyText',
  'setup line':            'bodyText',
  'setup (one line)':      'bodyText',
  'subject':               'subjectLine',
  'preview':               'previewText',
}

/* Week 2's five itinerary slots. The workflow writes them as `**Day One,
   Afternoon**` blocks holding `Image Cue:` and `Moment Copy:` lines, so they
   are parsed like property cards rather than as flat fields. */
/* Only used to keep itinerary headings out of the flat fields. */
const MOMENT_TITLE_RE = /^day\s|\b(morning|afternoon|evening|night)\b/i
const MOMENT_LABELS = [
  'day one, afternoon',
  'day one, evening',
  'day two, morning',
  'day two, afternoon',
  'day two, evening',
]
const MOMENT_FIELD_MAP = { 'moment copy': 'momentCopy', 'copy': 'momentCopy' }

const CARD_MAP = {
  'card name':        'name',
  'card stats':       'stats',
  'card description': 'description',
  'card cta':         'ctaText',
}

const clean = (s) => (s || '')
  .replace(/\*\*/g, '')
  .replace(/^["“]|["”]$/g, '')
  .trim()

/** Split the document into one chunk per VARIATION header. */
function splitVariations(text) {
  const re = /^VARIATION\s+(\d+)\s*[—–-]\s*(.+)$/gim
  const heads = []
  let m
  while ((m = re.exec(text)) !== null) {
    heads.push({ index: m.index, end: m.index + m[0].length, num: Number(m[1]), name: clean(m[2]) })
  }
  /* No header at all: a single email pasted on its own. Treat the whole text
     as variation 1 rather than returning nothing — as long as it actually
     carries **Field** blocks, so stray prose is still rejected. */
  if (!heads.length) {
    return /^\*\*[^*\n]+\*\*\s*$/m.test(text) ? [{ num: 1, name: '', body: text }] : []
  }
  return heads.map((h, i) => ({
    num:  h.num,
    name: h.name,
    body: text.slice(h.end, i + 1 < heads.length ? heads[i + 1].index : text.length),
  }))
}

/** Property cards come as `- **Card Name:** value` bullets under a card header. */
function parseCards(body) {
  const cards = []
  const headRe = /^\*\*PROPERTY CARD\s+(\d+)\s+of\s+(\d+)\*\*\s*$/gim
  const heads = []
  let m
  while ((m = headRe.exec(body)) !== null) heads.push({ start: m.index + m[0].length, index: m.index })

  heads.forEach((h, i) => {
    const chunk = body.slice(h.start, i + 1 < heads.length ? heads[i + 1].index : body.length)
    const card = {}
    for (const line of chunk.split('\n')) {
      const bm = line.match(/^\s*[-*]\s*\*\*(.+?):?\*\*:?\s*(.*)$/)   // - **Card Name:** value
              || line.match(/^\s*[-*]\s*([A-Za-z][A-Za-z ]{1,30}):\s*(.*)$/) // - Card Name: value
      if (!bm) continue
      const key = CARD_MAP[clean(bm[1]).toLowerCase().replace(/:$/, '')]
      if (key) card[key] = clean(bm[2])
    }
    if (card.name || card.description) cards.push(card)
  })
  return cards
}

/* The itinerary slots, written as
     **Day One, Afternoon**
     Image Cue: ...
     Moment Copy: ...
   Kept in the order MOMENT_LABELS defines, not the order they appear, so a
   workflow that emits them out of sequence still reads correctly. */
function parseMoments(body) {
  const out = []
  const lines = body.split('\n')
  let current = null
  const flush = () => { if (current && current.momentCopy) out.push(current); current = null }
  for (const line of lines) {
    const head = line.match(/^\*\*(.+?):?\*\*\s*$/)
    if (head) {
      flush()
      const label = clean(head[1]).replace(/:$/, '')
      /* Any heading may turn out to be a moment; only a block that actually
         carries Moment Copy is kept, which flush() decides. Titles are editable
         so they cannot be matched against a fixed list. */
      current = /^property card/i.test(label) ? null : { label, momentCopy: '' }
      continue
    }
    if (!current) continue
    const kv = line.match(/^\s*(?:[-*]\s*)?\*?\*?([A-Za-z ]+?)\*?\*?\s*:\s*(.+)$/)
    if (!kv) continue
    const key = MOMENT_FIELD_MAP[clean(kv[1]).toLowerCase()]
    if (key) current[key] = clean(kv[2])
  }
  flush()
  return out
}

/** Fields are `**Label**` on one line, value on the following line(s). */
function parseFields(body) {
  const out = {}
  const lines = body.split('\n')
  /* Presence, not value: an intro label anywhere in the document decides what
     "Body Block" means below (see INTRO_BODY_KEYS for the JSON equivalent). */
  const hasIntroLabel = /^\*\*\s*intro (body|body block|line)\s*:?\*\*\s*$/im.test(body)
  let current = null
  let buffer = []

  const flush = () => {
    if (!current) return
    const value = buffer.join('\n').trim()
    if (value) out[current] = clean(value).replace(/\n{3,}/g, '\n\n')
    current = null
    buffer = []
  }

  for (const line of lines) {
    const head = line.match(/^\*\*(.+?):?\*\*\s*$/)
    if (head) {
      flush()
      const label = clean(head[1]).toLowerCase().replace(/:$/, '')
      /* Older prose used "Body Block" for the intro. When the document also
         carries an intro field, it is the closing block instead — otherwise
         the second one silently overwrites the first. */
      if (label === 'body block' && hasIntroLabel) { current = 'bodyBlock2'; buffer = []; continue }
      // property cards are handled separately
      current = (/^property card/.test(label) || MOMENT_LABELS.includes(label))
        ? null
        : (FIELD_MAP[label] || null)
      /* A heading whose block holds Moment Copy is an itinerary slot handled by
         parseMoments; parseFields must not also claim it. */
      if (current && MOMENT_TITLE_RE.test(label)) current = null
      continue
    }
    // a horizontal rule or a new bullet list ends the current field
    if (/^\s*---\s*$/.test(line) || /^\s*[-*]\s*\*\*/.test(line)) { flush(); continue }
    if (current) buffer.push(line)
  }
  flush()
  return out
}

/**
 * @param {string} text  the workflow's Markdown output
 * @returns {Array} variation objects, [] if nothing could be parsed
 */

/* ── JSON format ──────────────────────────────────────────────────────────
   The workflow may emit a fenced ```json block containing an array of
   variation objects with snake_case keys instead of Markdown prose. That is
   preferred — no formatting to drift — so it is tried first.               */

/** snake_case / spaced label -> the field name templates and the editor use. */
const JSON_KEY_MAP = {
  subject_line:     'subjectLine',
  preview_text:     'previewText',
  campaign_eyebrow: 'campaignEyebrow',
  hero_headline:    'headlineText',
  headline:         'headlineText',
  hero_cta:         'heroCtaText',
  intro_cta:        'heroCtaText',   // the workflow's name for the hero pill
  intro_body:       'bodyText',
  intro_body_block: 'bodyText',
  body_block:       'bodyText',
  section_eyebrow:  'sectionEyebrow',
  section_headline: 'sectionHeadline',
  section_subhead:  'sectionSubhead',
  body_block_title:   'bodyBlock2Title',
  closing_nudge_title:'bodyBlock2Title',
  closing_nudge:      'bodyBlock2',
  closing_line:     'closingLine',
  cta:              'ctaText',
  cta_text:         'ctaText',
  cta_url:          'ctaUrl',
  final_cta:        'ctaText',
  final_cta_url:    'ctaUrl',
  pov:              'name',
  variation_name:   'name',
  // camelCase spellings — the workflow has emitted both over time
  heroheadline:     'headlineText',
  herocta:          'heroCtaText',
  introcta:         'heroCtaText',   // the hero pill, e.g. "Use code BUY3 at checkout"
  introbody:        'bodyText',
  introbodyblock:   'bodyText',
  bodyblock:        'bodyText',
  bodyblocktitle:   'bodyBlock2Title',
  closingnudge:     'bodyBlock2',
  closingnudgetitle:'bodyBlock2Title',
  closingline:      'closingLine',
  sectioneyebrow:   'sectionEyebrow',
  sectionheadline:  'sectionHeadline',
  sectionsubhead:   'sectionSubhead',
  campaigneyebrow:  'campaignEyebrow',
  subjectline:      'subjectLine',
  previewtext:      'previewText',
  povname:          'name',
  ctatext:          'ctaText',
  ctaurl:           'ctaUrl',
  introline:        'bodyText',     // Week 2's name for the intro paragraph
  intro_line:       'bodyText',
  ctabutton:        'ctaText',      // Week 2's name for the bottom CTA
  cta_button:       'ctaText',
  setup:            'bodyText',     // Week 3's name for the line above the reviews
  setupline:        'bodyText',
  setup_line:       'bodyText',
  subject:          'subjectLine',
  preview:          'previewText',
  finalcta:         'ctaText',      // the workflow's name for the bottom CTA
  finalctaurl:      'ctaUrl',
  preview_line:     'previewText',      // Week 4's name for the preview text
  previewline:      'previewText',
  subhead:          'sectionSubhead',   // Week 4's hero subhead
  bridge_back_text: 'bodyBlock2',       // Week 4's paragraph back to the stay
  bridgebacktext:   'bodyBlock2',
  bridge_back:      'bodyBlock2',
  bridgeback:       'bodyBlock2',
  cta_button_text:  'ctaText',
  ctabuttontext:    'ctaText',
  footer_code_reminder: 'footerLine',
  footercodereminder:   'footerLine',
  intro:            'bodyText',         // Email 6's intro paragraph
  body:             'bodyText',         // Email 8's intro paragraph
  contact_fallback: 'contactFallback',  // Email 8's phone line
  contactfallback:  'contactFallback',
  block_title:      'sectionHeadline',  // Email 6: the heading over the points
  blocktitle:       'sectionHeadline',
  block2_title:     'bodyBlock2Title',  // Email 6: the policy block
  block2title:      'bodyBlock2Title',
  block2:           'bodyBlock2',
  story_lead_in:    'bodyText',         // Email 5's intro paragraph
  storyleadin:      'bodyText',
  section_label:    'sectionEyebrow',   // Week 3's name for the chip above the reviews
  sectionlabel:     'sectionEyebrow',
  code_reminder:    'footerLine',   // Week 2's name for the line under the button
  codereminder:     'footerLine',
  footer_line:      'footerLine',
  pov_angle:        'name',
  povangle:         'name',
  close:            'closingLine',   // Email 9's closing paragraph
}

const JSON_CARD_MAP = {
  card_name:        'name',
  name:             'name',
  card_stats:       'stats',
  stats:            'stats',
  card_description: 'description',
  description:      'description',
  card_cta:         'ctaText',
  cta:              'ctaText',
  cta_text:         'ctaText',
  card_cta_url:     'ctaUrl',
  cta_url:          'ctaUrl',
  // camelCase spellings
  cardname:         'name',
  cardstats:        'stats',
  carddescription:  'description',
  cardcta:          'ctaText',
  cardctaurl:       'ctaUrl',
}

const snakeToCamel = (k) => k.replace(/[_\s]+(\w)/g, (_, c) => c.toUpperCase())

/* The workflow now emits TWO body fields: `introBodyblock` (the paragraph under
   the hero) and `bodyBlock` (the body of the closing nudge, under
   `closingNudgeTitle`). Older payloads sent only `bodyBlock`, and there it held
   the intro copy — so `bodyBlock` means the nudge body only when an intro field
   arrives alongside it. Keyed on presence, not on value, because the workflow
   can legitimately send an empty intro. */
const INTRO_BODY_KEYS = ['introbodyblock', 'introbody', 'intro_body', 'intro_body_block',
                         'setupline', 'setup_line', 'setup',
                         'introline', 'intro_line',
                         'storyleadin', 'story_lead_in',   // Email 5's intro
                         'intro',                          // Email 6's intro
                         'body']                           // Email 8's intro
const BODY_BLOCK_KEYS = ['bodyblock', 'body_block']

/** Pull the first ```json fenced block, or the first bare [ … ] / { … }. */
function findJsonPayload(text) {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidates = []
  if (fence) candidates.push(fence[1])
  const arr = text.match(/\[\s*\{[\s\S]*\}\s*\]/)
  if (arr) candidates.push(arr[0])
  const obj = text.match(/\{[\s\S]*\}/)
  if (obj) candidates.push(obj[0])
  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c.trim())
      if (parsed && (Array.isArray(parsed) || typeof parsed === 'object')) return parsed
    } catch { /* try the next candidate */ }
  }
  return null
}

/* A review is {quote, attribution} however the workflow spells it. */
function mapReview(raw) {
  const out = {}
  const put = (key, v) => { const t = String(v ?? '').trim(); if (t) out[key] = t }
  for (const [k, v] of Object.entries(raw || {})) {
    const lk = k.toLowerCase().replace(/[_\s]/g, '')
    if (lk === 'quote' || lk === 'text' || lk === 'body' || lk === 'review') put('quote', v)
    else if (lk === 'attribution' || lk === 'attrib' || lk === 'byline' || lk === 'source') put('attribution', v)
    /* The parts of the byline, sent separately. Kept as parts so the editor can
       show them individually and the template can assemble the line itself. */
    else if (lk === 'guestfirstname' || lk === 'guestname' || lk === 'firstname' || lk === 'guest') put('guestFirstName', v)
    else if (lk === 'staytype' || lk === 'stay' || lk === 'property' || lk === 'propertyname') put('stayType', v)
    else if (lk === 'monthyear' || lk === 'date' || lk === 'stayed') put('monthYear', v)
    else if (lk === 'platform' || lk === 'via' || lk === 'channel') put('platform', v)
  }
  return out
}

/* The workflow sometimes emits a URL as a markdown link. Unwrap it so the
   href is a URL and not "[text](url)". Anything else passes through. */
const cleanUrl = (s) => {
  const t = String(s ?? '').trim()
  const md = /^\[[^\]]*\]\(\s*(\S+?)\s*\)$/.exec(t)
  return md ? md[1] : t
}

/* An area block is {blockHeader, entries} — the entries collapsed to one
   "Name — detail" line each, so the editor can hold them in one textarea and
   the template can split them back out. */
function mapBlock(raw) {
  const out = { blockHeader: '', entries: '' }
  for (const [k, v] of Object.entries(raw || {})) {
    const lk = k.toLowerCase().replace(/[_\s]/g, '')
    if (lk === 'blockheader' || lk === 'header' || lk === 'title' || lk === 'label'
        || lk === 'blocktitle' || lk === 'blocklabel') {
      const t = String(v ?? '').trim()
      /* "1 of 3" is a position, not a heading — the workflow emits it in the
         title slot. Dropping it leaves the header blank for the writer to fill
         rather than printing "1 of 3" over the block. A real header wins. */
      if (t && !/^\d+\s+of\s+\d+$/i.test(t)) out.blockHeader = t
    }
    if ((lk === 'entries' || lk === 'items') && Array.isArray(v)) {
      out.entries = v.map(e => {
        if (typeof e === 'string') return e.trim()
        const name = String(e?.name ?? e?.placeName ?? e?.title ?? '').trim()
        const detail = String(e?.detail ?? e?.description ?? e?.copy ?? '').trim()
        return name && detail ? `${name} — ${detail}` : (name || detail)
      }).filter(Boolean).join('\n')
    }
    /* Already flattened — an edited variation round-tripping back through. */
    if (lk === 'entries' && typeof v === 'string') out.entries = v
  }
  return out
}

/* A moment is {imageCue, momentCopy} however the workflow spells it. */
function mapMoment(raw) {
  const out = {}
  for (const [k, v] of Object.entries(raw || {})) {
    const lk = k.toLowerCase().replace(/[_\s]/g, '')
    if (lk === 'imagecue'   || lk === 'image')  out.imageCue   = String(v ?? '').trim()
    if (lk === 'momentcopy' || lk === 'copy' || lk === 'text') out.momentCopy = String(v ?? '').trim()
    if (lk === 'label' || lk === 'slot' || lk === 'daytimelabel' || lk === 'daytime'
        || lk === 'momenttitle' || lk === 'title') out.label = String(v ?? '').trim()
  }
  return out
}

function mapCard(raw) {
  const card = {}
  for (const [k, v] of Object.entries(raw || {})) {
    const key = JSON_CARD_MAP[k.toLowerCase()] || (['name','stats','description','ctaText','ctaUrl'].includes(snakeToCamel(k)) ? snakeToCamel(k) : null)
    if (key && v != null && String(v).trim()) card[key] = String(v).trim()
  }
  return card
}

const SECTION_HEAD_KEYS = ['heroheadline', 'hero_headline']

function mapVariation(raw, i) {
  const out = {}
  let cards = []
  let moments = []
  let blocks = []
  let objections = []
  let exampleQuestions = []
  let reviews = []
  const hasIntroBody = Object.keys(raw || {}).some(k => INTRO_BODY_KEYS.includes(k.toLowerCase()))
  /* Some workflows send `heroHeadline` for the photo and a separate `headline`
     for the section beneath it. Where both arrive, the plain one is the section
     heading; where only `headline` comes, it is still the hero's. */
  const hasHeroHead  = Object.keys(raw || {}).some(k => SECTION_HEAD_KEYS.includes(k.toLowerCase()))
  for (const [k, v] of Object.entries(raw || {})) {
    const lk = k.toLowerCase()
    if (lk === 'reviews' || lk === 'review_blocks' || lk === 'reviewblocks' || lk === 'testimonials') {
      reviews = (Array.isArray(v) ? v : []).map(mapReview).filter(r => r.quote || r.attribution || r.guestFirstName)
      continue
    }
    /* A markdown dump of the whole variation the workflow includes alongside
       the fields. Not copy — drop it, or it becomes a 2,000-character field. */
    if (lk === 'rendered') continue
    /* Email 8's objection sweep: keep the question and the answer only. The
       workflow also sends them joined as `text` and a lineNumber; neither is
       copy to edit. */
    if (lk === 'objections' && Array.isArray(v)) {
      objections = v.map(o => ({ objection: String(o?.objection ?? '').trim(), answer: String(o?.answer ?? '').trim() }))
                   .filter(o => o.objection || o.answer)
      continue
    }
    /* Email 9's example questions: the question and the answer only, for the
       same reason — the joined `text` and the lineNumber are not copy. */
    if ((lk === 'examplequestions' || lk === 'example_questions') && Array.isArray(v)) {
      exampleQuestions = v.map(q => ({ question: String(q?.question ?? '').trim(), answer: String(q?.answer ?? '').trim() }))
                          .filter(q => q.question || q.answer)
      continue
    }
    /* A flag about the signature, not a line of the email. The run-level
       reviewFlags carry the same warning to the editor. */
    if (lk === 'unverifiedsignature') continue
    if (lk === 'grouped_blocks' || lk === 'groupedblocks' || lk === 'blocks') {
      blocks = (Array.isArray(v) ? v : []).map(mapBlock).filter(x => x.blockHeader || x.entries)
      continue
    }
    if (lk === 'moments' || lk === 'itinerary' || lk === 'daymoments' || lk === 'day_moments') {
      moments = (Array.isArray(v) ? v : []).map(mapMoment).filter(m => m.imageCue || m.momentCopy)
      continue
    }
    if (lk === 'property_cards' || lk === 'propertycards' || lk === 'cards') {
      cards = (Array.isArray(v) ? v : []).map(mapCard).filter(c => c.name || c.description)
      continue
    }
    if (lk === 'variation' || lk === 'variationnumber' || lk === 'id') continue   // handled below
    /* A repeated block this parser has no mapping for (an email whose template
       is not built yet). Carried through as sent, so the editor can still show
       and edit it — dropping it would lose the workflow's copy silently. */
    if (Array.isArray(v) && v.length && typeof v[0] === 'object') { out[snakeToCamel(k)] = v; continue }
    if ((lk === 'cta_button' || lk === 'ctabutton') && v && typeof v === 'object') {
      if (v.text) out.ctaText = String(v.text).trim()
      if (v.url)  out.ctaUrl  = cleanUrl(v.url)
      continue
    }
    const key = (hasIntroBody && BODY_BLOCK_KEYS.includes(lk))
      ? 'bodyBlock2'                              // the closing block, not the intro
      : (hasHeroHead && lk === 'headline')
      ? 'sectionHeadline'                         // the hero already has its own
      : (JSON_KEY_MAP[lk] || snakeToCamel(k))
    if (v != null && typeof v !== 'object') out[key] = /url$/i.test(key) ? cleanUrl(v) : String(v).trim()
  }
  return {
    id: Number(raw?.variation ?? raw?.variationNumber) || i + 1,
    name: out.name || `Variation ${i + 1}`,
    ...out,
    subhead: out.sectionSubhead || out.subhead || '',
    introCtaText: out.introCtaText || out.ctaText || '',
    ...(cards.length ? { propertyCards: cards } : {}),
    ...(moments.length ? { moments } : {}),
    ...(blocks.length ? { blocks } : {}),
    ...(objections.length ? { objections } : {}),
    ...(exampleQuestions.length ? { exampleQuestions } : {}),
    ...(reviews.length ? { reviews } : {}),
  }
}

/** @returns {Array} variations, or [] if the text holds no usable JSON. */
export function parseWfCopyJson(text) {
  if (typeof text !== 'string' || !text.trim()) return []
  const payload = findJsonPayload(text)
  if (!payload) return []
  const list = Array.isArray(payload)
    ? payload
    : (Array.isArray(payload.variations) ? payload.variations : [payload])
  return list.map(mapVariation).filter(v => v.subjectLine || v.headlineText)
}

export function parseWfCopy(text) {
  if (typeof text !== 'string' || !text.trim()) return []

  return splitVariations(text).map((v, i) => {
    const fields  = parseFields(v.body)
    const cards   = parseCards(v.body)
    const moments = parseMoments(v.body)
    return {
      id: v.num || i + 1,
      name: v.name || `Variation ${i + 1}`,
      ...fields,
      // keep subhead in sync with Section Subhead for any template reading it
      subhead: fields.sectionSubhead || fields.subhead || '',
      // The workflow currently emits no separate Intro CTA — it only labels the
      // hero one. Fall back to the main CTA so the button below the intro line
      // is never blank; it stays editable either way.
      introCtaText: fields.introCtaText || fields.ctaText || '',
      ...(cards.length ? { propertyCards: cards } : {}),
      ...(moments.length ? { moments } : {}),
    }
  }).filter(v => v.subjectLine || v.headlineText)
}

/**
 * n8n's envelope varies, so pull the prose out of whichever shape arrives.
 * Falls through to returning any pre-structured variations untouched.
 */
export function extractWfVariations(payload) {
  if (!payload) return []

  /* The same body sometimes arrives as text rather than parsed JSON, depending
     on the content-type n8n sends. Parse it here so it meets the same array and
     $json unwrapping below — otherwise a wrapped payload silently yields
     nothing, because the fallbacks further down do not unwrap. */
  if (typeof payload === 'string') {
    const t = payload.trim()
    if (t.startsWith('{') || t.startsWith('[')) {
      try { return extractWfVariations(JSON.parse(t)) } catch { /* prose; fall through */ }
    }
  }

  /* n8n works on items, so a workflow that ends with "Respond to Webhook" sends
     the body wrapped in a one-item array: [ { variations: [...] } ]. Unwrap it,
     and merge if several items each carry their own variations. */
  if (Array.isArray(payload)) {
    const merged = payload.flatMap(p => (Array.isArray(p?.variations) ? p.variations : []))
    if (merged.length) payload = { variations: merged }
    else if (payload.length === 1) payload = payload[0]
    else payload = { variations: payload }
  }

  /* n8n's HTTP Request node needs `{{ { ...$json, jobId } }}`. Written without
     the spread it sends `{ $json: {...}, jobId }`, burying everything one level
     down. That is easy to get wrong in the n8n UI and silently yields no copy,
     so unwrap it rather than fail. */
  if (payload.$json && typeof payload.$json === 'object') {
    payload = { ...payload.$json, ...payload }
  }
  /* One variation sent on its own, with no `variations` wrapper around it. */
  if (payload && !Array.isArray(payload.variations)) {
    const looksLikeVariation = ['subjectLine', 'subject_line', 'heroHeadline', 'hero_headline']
      .some(k => typeof payload[k] === 'string' && payload[k].trim())
    if (looksLikeVariation) payload = { variations: [payload] }
  }

  /* A real variations array — but still run it through the key mapper. The
     workflow uses its own names (heroHeadline, introCTA, povName, cardName…)
     and returning it raw would hand the template fields it cannot read. The
     mapping is idempotent, so copy already in our own names passes through. */
  if (Array.isArray(payload.variations) && payload.variations.length) {
    return payload.variations.map(mapVariation).filter(v => v.subjectLine || v.headlineText)
  }

  const text =
    (typeof payload?.structured?.output === 'string' && payload.structured.output) ||
    (typeof payload?.output === 'string' && payload.output) ||
    (typeof payload === 'string' && payload) ||
    ''

  // JSON first — it is exact. Markdown is the fallback for older prose output.
  const fromJson = parseWfCopyJson(text)
  if (fromJson.length) return fromJson
  return parseWfCopy(text)
}
