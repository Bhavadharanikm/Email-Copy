/**
 * Welcome-flow copy written by Claude directly, replacing the n8n workflow
 * one email at a time. Two passes:
 *
 *   1. write   — the email's own prompt, the copy brief, the client details,
 *                the request and this email's feedback → three variations
 *   2. review  — the draft checked against the same brief and the prompt's
 *                rules. Returns only the fixes, applied here, so it writes a
 *                few lines rather than all three variations again. Replaces
 *                n8n's fact-check agent
 *
 * Effort is medium for both passes: high doubled the time for copy that read
 * much the same, and a low-effort review let fragment lines through. Both passes return JSON, so there is
 * no Markdown to parse and no field-name guessing.
 */
import Anthropic from '@anthropic-ai/sdk'
import { fetchCopyBrief, fetchBrandRow, fetchFeedbackSection } from './_wfSources.js'
import * as email1 from './_wfPrompts/email1.js'
import * as email2 from './_wfPrompts/email2.js'
import * as email3 from './_wfPrompts/email3.js'
import * as email4 from './_wfPrompts/email4.js'
import * as email5 from './_wfPrompts/email5.js'
import * as email6 from './_wfPrompts/email6.js'
import * as email7 from './_wfPrompts/email7.js'
import * as email8 from './_wfPrompts/email8.js'
import * as email9 from './_wfPrompts/email9.js'

const MODEL = 'claude-opus-5'

/* Emails whose prompt has been moved over. The rest stay on n8n. */
const PROMPTS = { 1: email1, 2: email2, 3: email3, 4: email4, 5: email5, 6: email6, 7: email7, 8: email8, 9: email9 }

/* HiddenGem Test is a testing client with no copy brief of its own, so it
   writes from a real client's brief and brand row instead. */
const TEST_CLIENT_STAND_IN = { 'hiddengem test': 'Starlight Haven Hot Springs' }
const sourceClientFor = (name) => TEST_CLIENT_STAND_IN[(name || '').trim().toLowerCase()] || name

export const claudeWeeks = () => Object.keys(PROMPTS).map(Number)

/** Written by Claude when the key is set and the email's prompt exists here. */
export function claudeEnabledFor(week) {
  return Boolean(process.env.ANTHROPIC_API_KEY && PROMPTS[week])
}

/* House standard for every welcome-flow email, appended to each email's own
   prompt and checked by the review. From the team's own read of the output:
   lines that made no sense out of context, fragment lists, pushy phrasing. */
const WRITING_STANDARD = `<writing_standard>
These apply to every field, above any example.
- Every line makes sense read on its own by someone who has never seen the brief. Name the thing. No vague references such as "one last stop" or "the obvious one" unless the same line says what it is.
- Write like a person talking to a person: complete, natural sentences in words people actually say. No telegraphic lists of fragments ("Forest in the morning, pizza later, gardens at the end"), and no figures or jargon dropped in without the words that make them mean something.
- The subject line, preview text and hero headline earn the open. Each is one clear, inviting idea a reader gets on the first read, specific to this client. Read each one as the reader would; if it sounds like a note to self, rewrite it.
- Warm and inviting, never pushy and never negative. No "the one we'd push hardest", "we'd insist", "you have to". No closures or limitations ("closes Tuesday and Wednesday"), and nothing framed around lack.
- Nothing negative, anywhere, in any form. Say what the stay has, never what it lacks: no "there's no TV", no "the Wi-Fi stops at the lobby", and no absence dressed up as a benefit ("there's no TV, so you can enjoy..."). No negation-built lines ("nothing to do", "nobody is waiting", "nowhere to be", "you don't need", "without the..."): write the positive image instead ("the hot tub is already warm", "the morning is yours"). No words with a dark or violent edge, such as victim, kill, die, dead, attack, fight, struggle, trouble, problem, worry. This covers angle names too.
- No em dashes or en dashes anywhere.
- Never infer a guest's gender from their name. Use he, she or a party ("the two of you", "her sister") only where the brief's own words state it; otherwise use the guest's name or "they".
- CTA: where the brief gives CTA or button wording, use it. Where it does not, write it in the style of the example: 2-4 words, inviting.

Brief facts are exact. Wherever these instructions say a detail comes from the brief word for word (featured stay names, stats and descriptions, review quotes and their attribution, place names, the code and its terms), copy it exactly as the brief has it: same words, same spelling, same order. Write freely only in the copy around those facts.

Working from the prompt:
- Examples, and Right and Wrong lines, show tone and shape only. Never reuse their sentences, their sentence structure, their angle names or their specific images. Write every line fresh for this client.
- Where two instructions pull against each other, or a line would sit uneasily with a rule anywhere in these instructions, take the stricter reading and write about something else. Do not leave a contested claim in the copy and do not ask about it: the prompt is there so the copy comes out right without anybody checking each brief.
- Across the whole welcome sequence: never argue that the minimum stay is enough ("two nights is all it takes", "two nights is a good place to start"), because longer stays are better for the client. Never build a line on one season or its weather (snow, winter evenings, summer heat); subscribers join in any month.

Three variations, three points of view:
- Each variation has a genuinely different point of view on why this stay is worth it: a different reason, a different image, a different reader in mind. The point of view shapes the subject line, preview text and headline, not only the body. Two variations that differ only in adjectives are one variation.
- Every point of view has to make sense for this client, this audience and this email's job.
- No two variations share a subject line, a preview text, a headline or an opening line. Where the prompt fixes a shape for a field, each variation still words it its own way within that shape.
- Fields the prompt says stay identical across variations (facts such as cards, entries, codes, a shared eyebrow) stay identical. Everything else is each variation's own.
</writing_standard>`

const REVIEW_SYSTEM = `You are the reviewer for vacation rental marketing emails. You receive a copy brief, client details, the writer's instructions, and a draft of three email variations. Your job is accuracy and rule compliance, not rewriting for taste.

Read the subject line, preview text and hero headline of each variation first: each must be a clear, complete sentence a reader understands on the first read.

Find the lines that need changing:
- Any place, amenity, figure, drive time, distance, price, hour or claim that the brief and client details do not state.
- Any line that breaks a rule in the writer's instructions.
- Any line reused from the writer's examples, any subject line, preview text, headline or opening line shared between two variations, or two variations whose points of view are really the same.
- Any line arguing the minimum stay is enough, or built on one season or its weather.
- A he or she for a guest, or a party ("the two of you"), that the brief's own words do not state.
- An entry detail padded with words that say nothing about the place: cut it back to what the brief says, or to empty where the brief gives only the name.
- Any line that breaks the writing standard: a line that does not make sense on its own, a vague reference that never names the thing, a list of fragments instead of a sentence, filler with no real detail, pushy or negative phrasing, a closure or limitation in a recommendation.
- Grammar and punctuation problems, and any em dash or en dash.

Return only fixes, never the whole draft. Each fix names the variation (1, 2 or 3), the path of the field, the full replacement text for that field, and a short reason. Paths look like "headlineText", "blocks.0.entries.1.detail" or "dayMoments.2.momentCopy", counting from 0. Where the writer's instructions say a field is identical across all three variations, use variation 0 to change it in all three at once.

Never list a fix for a field the writer's instructions say is copied verbatim from the brief (card names and descriptions, review quotes and attribution, place names): those stay exactly as the brief has them, even where they break a style rule.

Lines that already pass are left alone and not listed. If nothing needs changing, return no fixes.`

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
          path: { type: 'string' },
          newValue: { type: 'string' },
          reason: { type: 'string' },
        },
      },
    },
  },
}

/** Apply review fixes in place. A fix whose path does not lead to an existing
    string is skipped rather than guessed at, and reported. */
function applyFixes(data, fixes) {
  const applied = [], skipped = []
  for (const f of fixes || []) {
    const targets = f.variation === 0 ? data.variations : [data.variations[f.variation - 1]].filter(Boolean)
    let hit = false
    for (const v of targets) {
      const keys = String(f.path).split('.')
      const last = keys.pop()
      const parent = keys.reduce((o, k) => (o == null ? o : o[/^\d+$/.test(k) ? Number(k) : k]), v)
      const key = /^\d+$/.test(last) ? Number(last) : last
      if (parent && typeof parent[key] === 'string') { parent[key] = f.newValue; hit = true }
    }
    ;(hit ? applied : skipped).push(f)
  }
  return { applied, skipped }
}

/* ── Brief facts stay exactly as the brief has them ─────────────────────
   Each email names its verbatim fields (card names and descriptions, review
   quotes and attribution, place names): the review may not rewrite them, the
   dash cleanup leaves them alone, and each one is checked against the brief. */

const getPath = (obj, path) => String(path).split('.').reduce((o, k) => (o == null ? o : o[/^\d+$/.test(k) ? Number(k) : k]), obj)
function setPath(obj, path, value) {
  const keys = String(path).split('.'), last = keys.pop()
  const parent = keys.reduce((o, k) => (o == null ? o : o[/^\d+$/.test(k) ? Number(k) : k]), obj)
  if (parent) parent[/^\d+$/.test(last) ? Number(last) : last] = value
}

const normForMatch = (t) => String(t).toLowerCase()
  .replace(/[\u2018\u2019\u02bc]/g, "'").replace(/[\u201c\u201d"]/g, '')
  .replace(/[\u2013\u2014]/g, '-').replace(/\s+/g, ' ').trim()

/** The pieces of a verbatim value that do not appear in the brief. Cuts marked
    with an ellipsis are allowed, so each piece between them is checked alone. */
function notInBrief(value, briefNorm, fuzzy = false) {
  return String(value || '').split(/\s*(?:\.\.\.|\u2026)\s*/)
    .map(seg => normForMatch(seg).replace(/^[\s,.;:!?'-]+|[\s,.;:!?'-]+$/g, ''))
    .filter(seg => seg.length > 2 && !briefNorm.includes(seg) && !(fuzzy && nearlyInBrief(seg, briefNorm)))
}

/* For a quote the prompt lets the writer correct for spelling and grammar
   (Email 5's guest story): most of its word pairs must still appear in the
   brief, so a fixed typo passes and a reworded or added phrase does not. */
function nearlyInBrief(seg, briefNorm) {
  const words = seg.replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter(Boolean)
  if (words.length < 4) return false
  const briefWords = ` ${briefNorm.replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ')} `
  let hit = 0
  for (let k = 0; k < words.length - 1; k++) if (briefWords.includes(` ${words[k]} ${words[k + 1]} `)) hit++
  return hit / (words.length - 1) >= 0.85
}

const REPAIR_SYSTEM = `You restore text that must be copied word for word from a client's copy brief. For each item you get the field, the draft text, and why it was flagged. Return the brief's own words for it, exactly as the brief has them: same words, same spelling, same order. You may leave out whole sentences, or a clause at the start or end, where the writer's instructions say to drop something (for example a location clause in a card description); mark a cut inside a quote with an ellipsis. Never reword, never add a word, never join pieces with words of your own. If the brief has nothing that fits, return the draft text unchanged.`

const REPAIR_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['repairs'],
  properties: { repairs: { type: 'array', items: {
    type: 'object', additionalProperties: false, required: ['id', 'text'],
    properties: { id: { type: 'string' }, text: { type: 'string' } },
  } } },
}

/* ── Nothing negative in the copy we write ─────────────────────────────
   The writer and the review are both told; this catches what still slips
   through, and rewrites just those lines. Brief text (quotes, card
   descriptions, place names) is left as the brief has it. */
const NEGATIVE_RE = /\b(no|not|never|nothing|nobody|nowhere|none|neither|nor|without|don'?t|doesn'?t|didn'?t|can'?t|cannot|won'?t|isn'?t|aren'?t|wasn'?t|weren'?t|shouldn'?t|couldn'?t|wouldn'?t|haven'?t|hasn'?t|lack|lacks|lacking|missing|stops?|victims?|kill|kills|killer|killing|die|dies|dying|dead|death|deadly|attack|fight|struggle|trouble|problems?|worry|worries|hassle|fail|fails|failing|worst|ignore)\b/i

const REWRITE_SYSTEM = `You rewrite lines of vacation rental email copy so that nothing in them reads as negative. For each item you get the field and the line. Rewrite it to say what the stay or the reader gets, as a positive image, in the same voice, at about the same length, doing the same job in the email. Keep every fact, name, number, code and term exactly as it is. Never state an absence or a limitation, never frame an absence as a benefit, and do not use any of these words: no, not, never, nothing, nobody, nowhere, none, neither, nor, without, don't, doesn't, can't, won't, isn't, aren't, lack, missing, stop, victim, kill, die, dead, attack, fight, struggle, trouble, problem, worry, hassle, fail, worst, ignore. No em dashes. Where a code or its terms appear, keep them word for word.`

const REWRITE_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['rewrites'],
  properties: { rewrites: { type: 'array', items: {
    type: 'object', additionalProperties: false, required: ['id', 'text'],
    properties: { id: { type: 'string' }, text: { type: 'string' } },
  } } },
}

/** Every string field of a variation, by path, e.g. "blocks.0.entries.1.detail". */
function stringLeaves(obj, prefix = '') {
  if (typeof obj === 'string') return [[prefix, obj]]
  if (Array.isArray(obj)) return obj.flatMap((x, i) => stringLeaves(x, prefix ? `${prefix}.${i}` : String(i)))
  if (obj && typeof obj === 'object') return Object.entries(obj).flatMap(([k, x]) => stringLeaves(x, prefix ? `${prefix}.${k}` : k))
  return []
}

const PLAN_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['blocked', 'angles', 'shared', 'notes'],
  properties: {
    blocked: { type: 'boolean' },
    angles: { type: 'array', items: {
      type: 'object', additionalProperties: false, required: ['name', 'case'],
      properties: { name: { type: 'string' }, case: { type: 'string' } },
    } },
    shared: { type: 'string' },
    notes: { type: 'string' },
  },
}

const PLAN_ASK = (week) => `Plan Email ${week} before it is written. Write no copy. Return:
- blocked: true only where these instructions say the email cannot be written for this client; otherwise false.
- angles: the three angles, points of view or cases, as these instructions define them for this email, each with one or two sentences on the case it makes. Genuinely different from each other, and each supported by the brief.
- shared: every decision all three variations must use identically, so they can be written separately and still agree: which items are featured and in what order (stays, reviews, moments, blocks and entries, benefits, sweep facts, questions), the exact figure to use wherever the brief gives more than one, the offer terms, and the exact wording of every field these instructions say is identical across variations.
- notes: what belongs in the email's notes (the checks and questions these instructions ask for).`

function assembleContext({ brief, brand, feedback, request, clientName }) {
  const brandLines = brand
    ? Object.entries(brand).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n')
    : '(no brand board row for this client)'
  return [
    `<copy_brief client="${clientName}">\n${brief.text}\n</copy_brief>`,
    `<client_details>\n${brandLines}${brief.website ? `\nwebsite (brief sheet): ${brief.website}` : ''}\n</client_details>`,
    `<feedback>\n${feedback || '(no feedback filed for this email)'}\n</feedback>`,
    `<request>\n${request}\n</request>`,
  ].join('\n\n')
}

function stripDashes(s) {
  return s.replace(/\s*[—–]\s*/g, ', ').replace(/,\s*,/g, ',')
}

function deepClean(v) {
  if (typeof v === 'string') return stripDashes(v)
  if (Array.isArray(v)) return v.map(deepClean)
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepClean(x)]))
  return v
}

async function runJson(client, { system, content, schema, effort }) {
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

/**
 * @returns {{ variations: object[], markdown: string, notes: string, sources: object }}
 */
export async function generateWfCopy({ week, request, clientName, parallel = true }) {
  const prompt = PROMPTS[week]
  if (!prompt) throw new Error(`Email ${week} has not been moved to Claude yet`)

  const sourceClient = sourceClientFor(clientName)
  const [brief, brand, feedback] = await Promise.all([
    fetchCopyBrief(sourceClient),
    fetchBrandRow(sourceClient).catch(() => null),
    fetchFeedbackSection(week).catch(() => ''),
  ])
  /* The request names the client too; for the stand-in it names the test
     client, so say which client the copy is for. */
  const requestText = sourceClient === clientName ? request
    : `${request}\n\n(Testing: write this for ${sourceClient}, whose brief is attached. Ignore the client name above.)`
  const context = assembleContext({ brief, brand, feedback, request: requestText, clientName: sourceClient })
  const client  = new Anthropic()

  /* Effort per pass, medium unless the email's prompt says otherwise (Email 8's
     long checklist made a medium review alone run past 80s). */
  const effort = { write: 'medium', review: 'medium', ...(prompt.EFFORT || {}) }
  const system = `${prompt.SYSTEM}\n\n${WRITING_STANDARD}`
  const complete = (d) => Array.isArray(d?.variations) && d.variations.length >= 3
  const blockedError = (notes) => new Error(`Email ${week} can't be written yet. ${String(notes || '').trim() || 'The brief or request is missing what this email needs.'}`)
  const sharedPaths = prompt.SHARED_PATHS || []
  const usage = { write: 0, review: 0 }
  const t0 = Date.now()
  let draft

  if (parallel) {
    /* 1. Plan: the three angles and every choice the variations share, no copy.
       2. Three writers at once, one variation each, each told the others' angles.
       Fields the prompt keeps identical are then copied from variation 1. */
    const plan = await runJson(client, {
      system, schema: PLAN_SCHEMA, effort: 'low',
      content: `${context}\n\n${PLAN_ASK(week)}`,
    })
    usage.write += plan.usage.output_tokens
    if (plan.data?.blocked) throw blockedError(plan.data.notes)
    const angles = (plan.data.angles || []).slice(0, 3)
    if (angles.length < 3) throw new Error(`Claude planned ${angles.length} of the 3 variations. Try again.`)
    const planText = `<plan>\nAngles:\n${angles.map((x, k) => `${k + 1}. ${x.name}: ${x.case}`).join('\n')}\n\nShared, identical in every variation:\n${plan.data.shared}\n</plan>`
    const writeOne = (n) => runJson(client, {
      system, schema: prompt.SCHEMA, effort: effort.write,
      content: `${context}\n\n${planText}\n\nWrite variation ${n} only, angle "${angles[n - 1].name}": ${angles[n - 1].case} The other two variations take the other angles in the plan and are being written at the same time, so this one's subject line, preview text, headline and opening are its own. Use the shared plan exactly. Return exactly one variation, in full, in variations, and notes only for anything specific to this variation.`,
    })
    const one = async (n) => {
      let r = await writeOne(n)
      if (!r.data?.variations?.[0]) r = await writeOne(n)
      return r
    }
    const parts = await Promise.all([1, 2, 3].map(one))
    parts.forEach(r => { usage.write += r.usage.output_tokens })
    if (parts.some(r => r.data?.blocked)) throw blockedError(parts.find(r => r.data?.blocked).data.notes)
    const variations = parts.map(r => r.data?.variations?.[0]).filter(Boolean)
    if (variations.length < 3) throw new Error(`Claude returned ${variations.length} of the 3 variations. Try again.`)
    for (const v of variations.slice(1)) for (const k of sharedPaths) if (k in variations[0]) v[k] = structuredClone(variations[0][k])
    draft = { data: { variations, notes: [plan.data.notes, ...parts.map((r, k) => r.data.notes ? `V${k + 1}: ${r.data.notes}` : '')].filter(Boolean).join('\n\n') } }
  } else {
    const ask = { system, schema: prompt.SCHEMA, effort: effort.write,
      content: `${context}\n\nWrite the three variations of Email ${week}, each one in full.` }
    draft = await runJson(client, ask)
    /* An email whose prompt can refuse to ship (Email 9, when replies are not
       monitored): show the writer's questions for the client instead of copy. */
    if (draft.data?.blocked) throw blockedError(draft.data.notes)
    if (!complete(draft.data)) {
      console.warn(`[wf-claude] week=${week} draft had ${draft.data?.variations?.length ?? 0} variations, retrying once`)
      draft = await runJson(client, ask)
    }
    if (!complete(draft.data)) {
      throw new Error(`Claude returned ${draft.data?.variations?.length ?? 0} of the 3 variations. Try again.`)
    }
    usage.write += draft.usage.output_tokens
  }
  const t1 = Date.now()

  /* The review lists fixes rather than rewriting the variations, so it only
     writes what changes. In parallel mode one reviewer per variation, each
     seeing all three so it can still catch a shared subject or opening. A
     failed review keeps the draft. */
  const reviewText = `<writer_instructions>\n${system}\n</writer_instructions>\n\n${context}\n\n<draft>\n${JSON.stringify(draft.data.variations, null, 2)}\n</draft>`
  const reviewOne = (n) => runJson(client, {
    system: REVIEW_SYSTEM, schema: REVIEW_SCHEMA, effort: effort.review,
    content: n
      ? `${reviewText}\n\nReview variation ${n} only. The other two are shown so you can flag anything in variation ${n} that shares a subject line, preview text, headline or opening with them. List fixes for variation ${n} only.`
      : `${reviewText}\n\nList the fixes this draft needs.`,
  }).catch(err => { console.warn('[wf-claude] review failed, keeping the draft:', err.message); return { data: { fixes: [] }, usage: { output_tokens: 0 } } })
  const reviews = parallel ? await Promise.all([1, 2, 3].map(reviewOne)) : [await reviewOne(0)]
  reviews.forEach(r => { usage.review += r.usage.output_tokens || 0 })
  const review = { data: { fixes: reviews.flatMap((r, k) => (r.data.fixes || []).flatMap(f => {
    if (!parallel) return [f]
    const top = String(f.path).split('.')[0]
    /* A fix to a shared field comes from the first reviewer only, for all three. */
    if (sharedPaths.includes(top)) return k === 0 ? [{ ...f, variation: 0 }] : []
    return [{ ...f, variation: k + 1 }]
  })) }, usage: { output_tokens: usage.review } }
  const t2 = Date.now()

  const final = structuredClone(draft.data)
  /* An email's verbatim fields: a path, or { path, fuzzy } where the prompt
     allows spelling and grammar fixes inside the quote. */
  const verbatimSpecs = (v) => (prompt.verbatimPaths ? prompt.verbatimPaths(v) : []).map(p => (typeof p === 'string' ? { path: p } : p))
  const verbatimOf = (v) => verbatimSpecs(v).map(p => p.path)
  const isVerbatim = (f) => (f.variation === 0 ? final.variations : [final.variations[f.variation - 1]].filter(Boolean))
    .some(v => verbatimOf(v).includes(f.path))
  const protectedFixes = (review.data.fixes || []).filter(isVerbatim)
  const { applied, skipped } = applyFixes(final, (review.data.fixes || []).filter(f => !isVerbatim(f)))
  const fixNotes = [
    applied.length ? `REVIEW FIXES:\n${applied.map(f => `- ${f.variation ? `V${f.variation}` : 'All variations'} ${f.path}: ${f.reason}`).join('\n')}` : 'REVIEW: no fixes needed.',
    skipped.length ? `REVIEW FIXES NOT APPLIED (path not found):\n${skipped.map(f => `- V${f.variation} ${f.path}: ${f.newValue}`).join('\n')}` : '',
    protectedFixes.length ? `REVIEW FIXES NOT APPLIED (verbatim from the brief, left as written):\n${protectedFixes.map(f => `- V${f.variation || 'all'} ${f.path}: ${f.reason}`).join('\n')}` : '',
  ].filter(Boolean).join('\n\n')

  const clean = deepClean(final)
  /* The dash cleanup is for copy we write. Verbatim fields go back exactly as
     the writer copied them from the brief. */
  clean.variations.forEach((v, i) => verbatimOf(final.variations[i]).forEach(path => setPath(v, path, getPath(final.variations[i], path))))

  const briefNorm = normForMatch(`${brief.text}\n${requestText}`)
  const findMismatches = () => clean.variations.flatMap((v, i) => verbatimSpecs(v).flatMap(({ path, fuzzy }) => {
    const misses = notInBrief(getPath(v, path), briefNorm, fuzzy)
    return misses.length ? [{ i, path, text: getPath(v, path), miss: misses[0] }] : []
  }))
  let found = findMismatches()
  /* A verbatim field that drifted from the brief gets one targeted repair,
     back to the brief's own words, instead of a note asking someone to fix it.
     Repaired once per distinct text, then copied to every variation using it. */
  let repaired = 0
  if (found.length) {
    const distinct = [...new Map(found.map(f => [f.text, f])).values()]
    try {
      const r = await runJson(client, {
        system: REPAIR_SYSTEM, schema: REPAIR_SCHEMA, effort: 'low',
        content: `<writer_instructions>\n${prompt.SYSTEM}\n</writer_instructions>\n\n<copy_brief>\n${brief.text}\n</copy_brief>\n\n<items>\n${distinct.map((f, n) => `id: ${n}\nfield: ${f.path}\ndraft: ${f.text}\nflagged: "${f.miss}" is not in the brief as written`).join('\n\n')}\n</items>`,
      })
      for (const { id, text } of r.data.repairs || []) {
        const f = distinct[Number(id)]
        if (!f || !text || notInBrief(text, briefNorm, verbatimSpecs(clean.variations[f.i]).find(p => p.path === f.path)?.fuzzy).length) continue
        found.filter(x => x.text === f.text).forEach(x => setPath(clean.variations[x.i], x.path, text))
        repaired++
      }
    } catch (err) { console.warn('[wf-claude] verbatim repair failed:', err.message) }
    found = findMismatches()
  }
  const mismatches = found.map(f => `- V${f.i + 1} ${f.path}: "${f.miss}" is not in the brief as written`)

  /* An email may ban more words outright (Email 7: the days of the week). */
  const flagged = (text) => NEGATIVE_RE.test(text) || Boolean(prompt.bannedRe && prompt.bannedRe.test(text))
  const negatives = () => clean.variations.flatMap((v, i) => {
    const skip = new Set([...verbatimOf(v), ...(prompt.toneExemptPaths ? prompt.toneExemptPaths(v) : [])])
    return stringLeaves(v).filter(([path, text]) => !skip.has(path) && flagged(text)).map(([path, text]) => ({ i, path, text }))
  })
  let negFound = negatives(), rewritten = 0
  if (negFound.length) {
    const distinct = [...new Map(negFound.map(f => [f.text, f])).values()]
    try {
      const r = await runJson(client, {
        system: REWRITE_SYSTEM, schema: REWRITE_SCHEMA, effort: 'low',
        content: `${prompt.bannedNote ? `${prompt.bannedNote}\n\n` : ''}<copy_brief>\n${brief.text}\n</copy_brief>\n\n<items>\n${distinct.map((f, n) => `id: ${n}\nfield: ${f.path}\nline: ${f.text}`).join('\n\n')}\n</items>`,
      })
      for (const { id, text } of r.data.rewrites || []) {
        const f = distinct[Number(id)]
        if (!f || !text || flagged(text)) continue
        const fresh = stripDashes(text)
        negFound.filter(x => x.text === f.text).forEach(x => setPath(clean.variations[x.i], x.path, fresh))
        rewritten++
      }
    } catch (err) { console.warn('[wf-claude] positive rewrite failed:', err.message) }
    negFound = negatives()
  }
  /* Figures in money and policy copy (Email 6): every number must be one the
     brief or the request states. Phone numbers compare digit for digit. */
  const sourceText = `${brief.text}\n${requestText}\n${Object.values(brand || {}).join('\n')}`
  const sourceNums = new Set([
    ...(sourceText.match(/\d+(?:[.,]\d+)?/g) || []).map(n => n.replace(',', '.')),
    ...(sourceText.match(/\d[\d\s().-]{6,}\d/g) || []).map(n => n.replace(/\D/g, '')),
  ])
  const numberIssues = prompt.numberCheckedPaths ? clean.variations.flatMap((v, i) => prompt.numberCheckedPaths(v).flatMap(path => {
    const text = String(getPath(v, path) || '')
    const phones = (text.match(/\d[\d\s().-]{6,}\d/g) || [])
    const rest = phones.reduce((t, ph) => t.replace(ph, ' '), text)
    const bad = [
      ...phones.filter(ph => !sourceNums.has(ph.replace(/\D/g, ''))),
      ...((rest.match(/\d+(?:[.,]\d+)?/g) || []).filter(n => !sourceNums.has(n.replace(',', '.')))),
    ]
    return bad.length ? [`- V${i + 1} ${path}: ${bad.join(', ')} is not a figure the brief states`] : []
  })) : []
  const numberNote = numberIssues.length
    ? `CHECK THESE FIGURES: every number here should come from the brief, and these do not. Correct them on the Copy page before sending.\n${numberIssues.join('\n')}`
    : (prompt.numberCheckedPaths ? 'FIGURE CHECK: every number in the copy is one the brief states.' : '')

  const negativeNote = negFound.length
    ? `STILL READS NEGATIVE: reword these on the Copy page.\n${negFound.map(f => `- V${f.i + 1} ${f.path}: ${f.text}`).join('\n')}`
    : (rewritten ? `TONE CHECK: ${rewritten} line${rewritten > 1 ? 's' : ''} with negative wording rewritten to say what the stay has.` : '')
  const verbatimNote = mismatches.length
    ? `CHECK AGAINST THE BRIEF: these should be word for word from the brief and are not. Correct them on the Copy page.\n${mismatches.join('\n')}`
    : (clean.variations.some(v => verbatimOf(v).length)
        ? `BRIEF CHECK: every verbatim field matches the brief.${repaired ? ` ${repaired} drifted from the brief's wording and was restored to it.` : ''}` : '')
  clean.notes = [verbatimNote, numberNote, negativeNote, clean.notes, fixNotes].filter(Boolean).join('\n\n')
  const t3 = Date.now()
  const timing = { writeMs: t1 - t0, reviewMs: t2 - t1, repairMs: t3 - t2, totalMs: t3 - t0 }
  console.log(`[wf-claude] week=${week} client="${clientName}" source="${sourceClient}" variations=${clean.variations.length}`,
    `write ${(timing.writeMs / 1000).toFixed(1)}s out=${usage.write}${parallel ? ' (parallel)' : ''}`,
    `review ${(timing.reviewMs / 1000).toFixed(1)}s out=${review.usage.output_tokens} fixes=${applied.length}/${(review.data.fixes || []).length}`,
    `total ${(timing.totalMs / 1000).toFixed(1)}s`)

  /* After the dash cleanup: an email's own shaping may add separators the
     template needs (Email 4's "Name — detail" entry lines). */
  const variations = clean.variations.map((v, i) => ({ ...(prompt.toVariation ? prompt.toVariation(v) : v), variationNumber: i + 1 }))
  return {
    variations,
    markdown: prompt.toMarkdown ? prompt.toMarkdown(variations) : '',
    notes: clean.notes || '',
    sources: { briefDoc: brief.title, writtenFor: sourceClient, feedbackUsed: Boolean(feedback) },
    briefMismatches: mismatches.length,
    negativeLines: negFound.length,
    figureIssues: numberIssues.length,
    timing,
  }
}
