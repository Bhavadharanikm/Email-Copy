/**
 * Repeat Booking Flow copy, written by Claude. Same two passes as the welcome
 * flow (_wfClaude.js), kept separate so the two flows' prompts and fixes can
 * change independently:
 *
 *   1. write   — the email's prompt, the client brief and brand row, and the
 *                brief typed on the page (the per-run fields) → JSON in the
 *                prompt's own OUTPUT shape
 *   2. review  — the draft checked against the same brief and rules; returns
 *                only fixes, applied here by field path
 */
import Anthropic from '@anthropic-ai/sdk'
import { fetchCopyBrief, fetchBrandRow } from './_wfSources.js'
import * as email1 from './_rbPrompts/email1.js'
import * as email2 from './_rbPrompts/email2.js'
import * as email3 from './_rbPrompts/email3.js'

const MODEL = 'claude-opus-5'
const PROMPTS = { 1: email1, 2: email2, 3: email3 }

/* HiddenGem Test has no copy brief of its own, so it writes from a real one. */
const TEST_CLIENT_STAND_IN = { 'hiddengem test': 'Walden Retreats' }
const sourceClientFor = (name) => TEST_CLIENT_STAND_IN[(name || '').trim().toLowerCase()] || name

export const rbClaudeEnabledFor = (n) => Boolean(process.env.ANTHROPIC_API_KEY && PROMPTS[Number(n)])

const REVIEW_SYSTEM = `You are the reviewer for repeat booking emails sent to guests who have already stayed. You receive the writer's instructions, the client brief and details, the per-run fields typed for this send, and a JSON draft of three variations. Your job is accuracy and rule compliance, not rewriting for taste.

Find the fields that need changing:
- Any code, discount, minimum, validity, amenity, figure or claim that the brief and per-run fields do not support, or that differs from the per-run fields.
- Any line that describes, assumes or evaluates the guest's stay, or names or implies their unit or their name.
- Any urgency beyond what the writer's instructions permit (a stated code expiry, where the email allows one), and any scarcity, season, referral or anniversary language.
- Any line that breaks a rule in the writer's instructions, including field lengths and the one-CTA rule.
- Any line that breaks the voice: one a reader would have to read twice, one that does not make sense on its own, filler that only sounds nice, over-description, a banned word or cliché, sales or status language, pressure or guilt, a negation-built line ("No X. No Y."), or a dark word.
- A subject line that is not a genuine hook, or three subjects with no question among them. Subject lines, previews, headlines or opening lines repeated across variations.
- A location used as the reason to come back rather than as context.
- Grammar and punctuation problems, and any em or en dash.

Return only fixes, never the whole draft. Each fix names the variation (1, 2 or 3), the field path inside that variation (for example "hero_headline" or "closing_line"), the full replacement text, and a short reason. For a field that is the same in every variation (any top-level field of the draft, such as campaign_eyebrow, code_display, sign_off or footer, or an item like featured_units.1.line), use variation 0 and its path from the top level, counting list items from 0.

Never list a fix for a featured unit's name or line (featured_units.N.name, featured_units.N.line): those are copied word for word from the brief and stay as the brief has them, even where they break a style rule.

Fields that already pass are left alone and not listed. If nothing needs changing, return no fixes.`

const REVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['fixes'],
  properties: {
    fixes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['variation', 'path', 'newValue', 'reason'],
        properties: {
          variation: { type: 'integer' },
          path:      { type: 'string' },
          newValue:  { type: 'string' },
          reason:    { type: 'string' },
        },
      },
    },
  },
}

/** Apply review fixes in place. Variation 0 is the top level, where the fixed
    fields live. A fix whose path is not an existing string is skipped. */
function applyFixes(data, fixes) {
  const applied = [], skipped = []
  for (const f of fixes || []) {
    const target = f.variation === 0 ? data : data.variations?.[f.variation - 1]
    const keys = String(f.path).split('.')
    const last = keys.pop()
    const parent = keys.reduce((o, k) => (o == null ? o : o[/^\d+$/.test(k) ? Number(k) : k]), target)
    const key = /^\d+$/.test(last) ? Number(last) : last
    if (parent && typeof parent[key] === 'string') { parent[key] = f.newValue; applied.push(f) }
    else skipped.push(f)
  }
  return { applied, skipped }
}

/* ── Brief facts stay exactly as the brief has them ─────────────────────
   An email's verbatim fields (the featured stays' names and descriptions):
   the review may not rewrite them, the dash cleanup leaves them alone, and
   each is checked against the brief and repaired back to it if it drifted.
   The same approach as the welcome flow's _wfClaude.js. */
const getPath = (obj, path) => String(path).split('.').reduce((o, k) => (o == null ? o : o[/^\d+$/.test(k) ? Number(k) : k]), obj)
function setPath(obj, path, value) {
  const keys = String(path).split('.'), last = keys.pop()
  const parent = keys.reduce((o, k) => (o == null ? o : o[/^\d+$/.test(k) ? Number(k) : k]), obj)
  if (parent) parent[/^\d+$/.test(last) ? Number(last) : last] = value
}
const normForMatch = (t) => String(t).toLowerCase()
  .replace(/[‘’ʼ]/g, "'").replace(/[“”"*]/g, '')
  .replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim()

/** The sentences of a verbatim value that do not appear in the brief as written. */
function notInBrief(value, briefNorm) {
  return String(value || '').split(/(?<=[.!?])\s+/)
    .map(seg => normForMatch(seg).replace(/^[\s,.;:!?'-]+|[\s,.;:!?'-]+$/g, ''))
    .filter(seg => seg.length > 2 && !briefNorm.includes(seg))
}

const REPAIR_SYSTEM = `You restore text that must be copied word for word from a client's copy brief: the names and descriptions of the client's stay types. For each item you get the field, the draft text, and the part that was flagged. Return the brief's own words for it, exactly as the brief has them: same words, same spelling, same order. You may keep only the first sentence or two of a longer description, and leave out a sentence that gives bed, bath or guest counts. Never reword, never add a word, never join pieces with words of your own. If the brief has nothing that fits, return the draft text unchanged.`

const REPAIR_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['repairs'],
  properties: { repairs: { type: 'array', items: {
    type: 'object', additionalProperties: false, required: ['id', 'text'],
    properties: { id: { type: 'string' }, text: { type: 'string' } },
  } } },
}

/* Em dashes only. An en dash between figures ("30–60 days") is a range and
   stays as written. */
const stripDashes = (s) => s.replace(/\s*—\s*/g, ', ').replace(/\s+–\s+/g, ', ').replace(/,\s*,/g, ',')
/* Copy fields are printed as they stand, so a provenance tag left inside one
   is removed, and a field still holding a placeholder ("[ANNIVERSARY CODE
   PENDING]") is emptied: the template then hides it, and the blocker that
   asks for it is already listed. Flags and blockers are notes, left alone. */
const PROVENANCE_RE  = /\s*\[(?:V|INFER|GAP|CONFLICT)\b[^\]]*\]/g
const PLACEHOLDER_RE = /\[[^\]]*\]|\bTBD\b|\bTBC\b/i
function scrubCopy(data) {
  const emptied = []
  const scrub = (obj, prefix) => {
    for (const [k, v] of Object.entries(obj || {})) {
      if (k === 'flags' || k === 'blockers') continue
      const path = prefix ? `${prefix}.${k}` : k
      if (typeof v === 'string') {
        const t = v.replace(PROVENANCE_RE, '').trim()
        if (PLACEHOLDER_RE.test(t)) { obj[k] = ''; emptied.push(path) } else obj[k] = t
      } else if (v && typeof v === 'object') scrub(v, path)
    }
  }
  scrub(data, '')
  return emptied
}

function deepClean(v) {
  if (typeof v === 'string') return stripDashes(v)
  if (Array.isArray(v)) return v.map(deepClean)
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepClean(x)]))
  return v
}

/**
 * The copy brief's "REPEAT BOOKING FLOW" section: the codes, stay types and
 * other repeat-booking facts the team keeps in the client's brief. It runs
 * from that heading (a paragraph, or a tab of that name) to the next tab, or
 * to the end of the doc. Taking too much is harmless, since the whole brief
 * is sent as well; cutting it short at a sub-heading like "Featured Stays"
 * would lose the stays.
 */
export function repeatBookingSection(text) {
  const lines = String(text || '').split('\n')
  const start = lines.findIndex(l => /^\s*(##\s*)?repeat\s+booking\s+flow\s*:?\s*$/i.test(l))
  if (start === -1) return ''
  const rest = lines.slice(start + 1)
  const end = rest.findIndex(l => /^##\s/.test(l))
  return (end === -1 ? rest : rest.slice(0, end)).join('\n').trim().slice(0, 12000)
}

/* Where each per-run field comes from. Added to every email's prompt so a
   field left blank on the Brief page is read from the brief's own section
   rather than treated as missing. */
const sourcesRule = (email) => `=====================================================================
WHERE THE PER-RUN FIELDS COME FROM (applies above every other input rule)
=====================================================================

The per-run fields have two documented sources, in this order:
1. The PER-RUN INPUT typed for this send. A value typed there always wins.
2. The REPEAT BOOKING FLOW section of the client's copy brief, given in <repeat_booking_section>. A field left empty, or left at its placeholder, in the per-run input is taken from this section when the section states it. That is a documented value, not an inference: use it exactly as written and tag it [V: §Repeat Booking Flow].
A field neither source states is a blocker, as the rules above say. A blocked field is left as an empty string: never write a placeholder such as "[CODE PENDING]" or "TBD" into any field, since every field is printed in the email as it stands. Provenance tags belong in "flags" only, never inside the copy.

${Number(email) === 3
    ? 'This is Email 3: use the ANNIVERSARY code and its terms. Never use the returning-guest code from Emails 1 and 2, even if the section lists it first.'
    : `This is Email ${email}: use the RETURNING-GUEST code and its terms (the same code for Emails 1 and 2). Never use the anniversary code meant for Email 3.`}
Featured stays, the unit roster, the host sign-off and the CTA URL may also come from the section, exactly as it writes them.
For the stay types (UNIT_ROSTER, MULTI_UNIT): when the per-run input leaves them blank, use the featured stays the REPEAT BOOKING FLOW section lists; if it lists none, use the stay types the brief documents in its own section on its stays or units (for example "Focus Units"). A brief that documents more than one stay type means MULTI_UNIT is yes. Their names and descriptions are copied word for word from the brief.`

function assembleContext({ brief, brand, request, clientName }) {
  const brandLines = brand
    ? Object.entries(brand).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n')
    : '(no brand board row for this client)'
  const section = repeatBookingSection(brief.text)
  return [
    `<copy_brief client="${clientName}">\n${brief.text}\n</copy_brief>`,
    `<repeat_booking_section>\n${section || '(this client’s copy brief has no REPEAT BOOKING FLOW section)'}\n</repeat_booking_section>`,
    `<client_details>\n${brandLines}${brief.website ? `\nwebsite (brief sheet): ${brief.website}` : ''}\n</client_details>`,
    `<per_run_input>\n${request}\n</per_run_input>`,
  ].join('\n\n')
}

async function runJson(client, { system, content, schema, effort = 'medium' }) {
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    thinking: { type: 'adaptive' },
    output_config: { effort, format: { type: 'json_schema', schema } },
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content }],
  })
  const msg = await stream.finalMessage()
  if (msg.stop_reason === 'refusal') throw new Error('Claude declined to write this email. Check the brief for anything unusual.')
  if (msg.stop_reason === 'max_tokens') throw new Error('Claude ran out of room before finishing the copy.')
  const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('')
  try { return { data: JSON.parse(text), usage: msg.usage } }
  catch { throw new Error('Claude returned copy that was not valid JSON.') }
}

/** @returns {{ variations: object[], notes: { flags: string[], blockers: string[], review: string[] }, sources: object, timing: object }} */
export async function generateRbCopy({ email, request, clientName }) {
  const prompt = PROMPTS[Number(email)]
  if (!prompt) throw new Error(`Repeat booking Email ${email} has no prompt yet`)

  const sourceClient = sourceClientFor(clientName)
  const [brief, brand] = await Promise.all([
    fetchCopyBrief(sourceClient),
    fetchBrandRow(sourceClient).catch(() => null),
  ])
  const requestText = sourceClient === clientName ? request
    : `${request}\n\n(Testing: write this for ${sourceClient}, whose brief is attached. Ignore the client name above.)`
  const context = assembleContext({ brief, brand, request: requestText, clientName: sourceClient })
  const client  = new Anthropic()

  const system = `${prompt.SYSTEM}\n\n${sourcesRule(email)}`
  const ask = { system, schema: prompt.SCHEMA,
    content: `${context}\n\nWrite the three variations of this email, each one in full.` }
  const minVariations = prompt.MIN_VARIATIONS || 3
  const complete = (d) => Array.isArray(d?.variations) && d.variations.length >= minVariations
  const t0 = Date.now()
  let draft = await runJson(client, ask)
  if (!complete(draft.data)) {
    console.warn(`[rb-claude] email=${email} draft had ${draft.data?.variations?.length ?? 0} variations, retrying once`)
    draft = await runJson(client, ask)
  }
  if (!complete(draft.data)) throw new Error(`Claude returned ${draft.data?.variations?.length ?? 0} variations, fewer than this email needs. Try again.`)
  const t1 = Date.now()

  let review = { data: { fixes: [] }, usage: { output_tokens: 0 } }
  try {
    review = await runJson(client, {
      system: REVIEW_SYSTEM, schema: REVIEW_SCHEMA,
      content: `<writer_instructions>\n${system}\n</writer_instructions>\n\n${context}\n\n<draft>\n${JSON.stringify(draft.data, null, 2)}\n</draft>\n\nList the fixes this draft needs.`,
    })
  } catch (err) { console.warn('[rb-claude] review failed, keeping the draft:', err.message) }
  const t2 = Date.now()

  const final = structuredClone(draft.data)
  const verbatim = prompt.verbatimPaths ? prompt.verbatimPaths(final) : []
  const protectedFixes = (review.data.fixes || []).filter(f => f.variation === 0 && verbatim.includes(f.path))
  const { applied, skipped } = applyFixes(final, (review.data.fixes || []).filter(f => !protectedFixes.includes(f)))
  const clean = deepClean(final)
  // the dash cleanup is for copy we write: brief facts go back as copied
  verbatim.forEach(path => setPath(clean, path, getPath(final, path)))
  const emptied = scrubCopy(clean)
  if (emptied.length) console.warn(`[rb-claude] email=${email} emptied placeholder fields: ${emptied.join(', ')}`)

  /* A stay name or description that drifted from the brief gets one targeted
     repair back to the brief's own words, checked again before it is used. */
  const briefNorm = normForMatch(`${brief.text}\n${requestText}`)
  const findMismatches = () => verbatim.flatMap(path => {
    const misses = notInBrief(getPath(clean, path), briefNorm)
    return misses.length ? [{ path, text: getPath(clean, path), miss: misses[0] }] : []
  })
  let found = findMismatches()
  let repaired = 0
  if (found.length) {
    try {
      const r = await runJson(client, {
        system: REPAIR_SYSTEM, schema: REPAIR_SCHEMA, effort: 'low',
        content: `<copy_brief>\n${brief.text}\n</copy_brief>\n\n<per_run_input>\n${requestText}\n</per_run_input>\n\n<items>\n${found.map((f, n) => `id: ${n}\nfield: ${f.path}\ndraft: ${f.text}\nflagged: "${f.miss}" is not in the brief as written`).join('\n\n')}\n</items>`,
      })
      for (const { id, text } of r.data.repairs || []) {
        const f = found[Number(id)]
        if (!f || !text || notInBrief(text, briefNorm).length) continue
        setPath(clean, f.path, text); repaired++
      }
    } catch (err) { console.warn('[rb-claude] verbatim repair failed:', err.message) }
    found = findMismatches()
  }
  const briefCheck = !verbatim.length ? ''
    : found.length
      ? `BRIEF CHECK: ${found.length} stay detail${found.length === 1 ? ' is' : 's are'} not word for word from the brief: ${found.map(f => `${f.path.replace(/^featured_units\.(\d+)\./, (_, n) => `stay ${Number(n) + 1} `)} ("${f.miss}")`).join('; ')}.`
      : `BRIEF CHECK: every stay name and description matches the brief word for word.${repaired ? ` ${repaired} had drifted and ${repaired === 1 ? 'was' : 'were'} restored.` : ''}`
  const timing = { writeMs: t1 - t0, reviewMs: t2 - t1, totalMs: Date.now() - t0 }
  console.log(`[rb-claude] email=${email} client="${clientName}" source="${sourceClient}"`,
    `write ${(timing.writeMs / 1000).toFixed(1)}s out=${draft.usage.output_tokens}`,
    `review ${(timing.reviewMs / 1000).toFixed(1)}s fixes=${applied.length}/${(review.data.fixes || []).length}`)

  const { flags, blockers } = prompt.toNotes(clean)
  const hasSection = Boolean(repeatBookingSection(brief.text))
  return {
    variations: prompt.toVariations(clean),
    notes: {
      flags, blockers, briefCheck,
      source: hasSection
        ? `Read the REPEAT BOOKING FLOW section of "${brief.title}".`
        : `"${brief.title}" has no REPEAT BOOKING FLOW section, so only the typed brief was used.`,
      review: [
        ...applied.map(f => `${f.variation ? `V${f.variation}` : 'All variations'} ${f.path}: ${f.reason}`),
        ...skipped.map(f => `Not applied (no such field) V${f.variation} ${f.path}: ${f.newValue}`),
        ...protectedFixes.map(f => `Not applied (word for word from the brief) ${f.path}: ${f.reason}`),
        ...emptied.map(p => `Left empty (it held a placeholder, see Blockers): ${p}`),
      ],
    },
    sources: { briefDoc: brief.title, writtenFor: sourceClient, repeatBookingSection: hasSection },
    timing,
  }
}
