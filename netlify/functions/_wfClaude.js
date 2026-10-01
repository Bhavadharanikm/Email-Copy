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
import * as email2 from './_wfPrompts/email2.js'
import * as email4 from './_wfPrompts/email4.js'

const MODEL = 'claude-opus-5'

/* Emails whose prompt has been moved over. The rest stay on n8n. */
const PROMPTS = { 2: email2, 4: email4 }

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
- No em dashes or en dashes anywhere.
- CTA: where the brief gives CTA or button wording, use it. Where it does not, write it in the style of the example: 2-4 words, inviting.
</writing_standard>`

const REVIEW_SYSTEM = `You are the reviewer for vacation rental marketing emails. You receive a copy brief, client details, the writer's instructions, and a draft of three email variations. Your job is accuracy and rule compliance, not rewriting for taste.

Read the subject line, preview text and hero headline of each variation first: each must be a clear, complete sentence a reader understands on the first read.

Find the lines that need changing:
- Any place, amenity, figure, drive time, distance, price, hour or claim that the brief and client details do not state.
- Any line that breaks a rule in the writer's instructions.
- An entry detail padded with words that say nothing about the place: cut it back to what the brief says, or to empty where the brief gives only the name.
- Any line that breaks the writing standard: a line that does not make sense on its own, a vague reference that never names the thing, a list of fragments instead of a sentence, filler with no real detail, pushy or negative phrasing, a closure or limitation in a recommendation.
- Grammar and punctuation problems, and any em dash or en dash.

Return only fixes, never the whole draft. Each fix names the variation (1, 2 or 3), the path of the field, the full replacement text for that field, and a short reason. Paths look like "headlineText", "blocks.0.entries.1.detail" or "dayMoments.2.momentCopy", counting from 0. Where the writer's instructions say a field is identical across all three variations, use variation 0 to change it in all three at once.

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
export async function generateWfCopy({ week, request, clientName }) {
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

  const ask = { system: `${prompt.SYSTEM}\n\n${WRITING_STANDARD}`, schema: prompt.SCHEMA, effort: 'medium',
    content: `${context}\n\nWrite the three variations of Email ${week}, each one in full.` }
  const complete = (d) => Array.isArray(d?.variations) && d.variations.length >= 3
  const t0 = Date.now()
  let draft = await runJson(client, ask)
  if (!complete(draft.data)) {
    console.warn(`[wf-claude] week=${week} draft had ${draft.data?.variations?.length ?? 0} variations, retrying once`)
    draft = await runJson(client, ask)
  }
  if (!complete(draft.data)) {
    throw new Error(`Claude returned ${draft.data?.variations?.length ?? 0} of the 3 variations. Try again.`)
  }
  const t1 = Date.now()

  /* The review lists fixes rather than rewriting all three variations, so it
     only writes what changes. A failed review keeps the draft. */
  let review = { data: { fixes: [] }, usage: { input_tokens: 0, output_tokens: 0 } }
  try {
    review = await runJson(client, {
      system: REVIEW_SYSTEM, schema: REVIEW_SCHEMA, effort: 'medium',
      content: `<writer_instructions>\n${prompt.SYSTEM}\n\n${WRITING_STANDARD}\n</writer_instructions>\n\n${context}\n\n<draft>\n${JSON.stringify(draft.data.variations, null, 2)}\n</draft>\n\nList the fixes this draft needs.`,
    })
  } catch (err) { console.warn('[wf-claude] review failed, keeping the draft:', err.message) }
  const t2 = Date.now()

  const final = structuredClone(draft.data)
  const { applied, skipped } = applyFixes(final, review.data.fixes)
  const fixNotes = [
    applied.length ? `REVIEW FIXES:\n${applied.map(f => `- ${f.variation ? `V${f.variation}` : 'All variations'} ${f.path}: ${f.reason}`).join('\n')}` : 'REVIEW: no fixes needed.',
    skipped.length ? `REVIEW FIXES NOT APPLIED (path not found):\n${skipped.map(f => `- V${f.variation} ${f.path}: ${f.newValue}`).join('\n')}` : '',
  ].filter(Boolean).join('\n\n')

  const clean = deepClean(final)
  clean.notes = [clean.notes, fixNotes].filter(Boolean).join('\n\n')
  const timing = { writeMs: t1 - t0, reviewMs: t2 - t1, totalMs: t2 - t0 }
  console.log(`[wf-claude] week=${week} client="${clientName}" source="${sourceClient}" variations=${clean.variations.length}`,
    `write ${(timing.writeMs / 1000).toFixed(1)}s out=${draft.usage.output_tokens}`,
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
    timing,
  }
}
