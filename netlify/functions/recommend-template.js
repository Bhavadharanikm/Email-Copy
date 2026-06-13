/**
 * POST /.netlify/functions/recommend-template
 * Body: { copy: { subjectLine, headlineText, subhead, bodyText, ctaText, closingLine } }
 *
 * Calls OpenRouter (Claude 3.5 Haiku) to:
 *   1. Recommend header style (1–4) + image style (1–4)
 *   2. Return copy fields with key phrases wrapped in <strong> tags
 *
 * Header styles:
 *   1 — Dark logo bar (brand/luxury)
 *   2 — Minimal centered logo on white
 *   3 — Full-width colour band with headline text
 *   4 — Split: logo left + subhead tagline right
 *
 * Image styles:
 *   1 — Hero full-width banner only
 *   2 — Polaroid collage (Favorite Memories)
 *   3 — Side-by-side two images
 *   4 — Mosaic: one large left + two stacked right
 */

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'
const MODEL           = 'anthropic/claude-3-5-haiku'

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  try {
    const { copy } = JSON.parse(event.body)
    const apiKey   = process.env.OPENROUTER_API_KEY
    if (!apiKey) throw new Error('OPENROUTER_API_KEY not set')

    // Pick a random seed combo to force the AI to explore different options each call
    const seedH = Math.ceil(Math.random() * 4)
    const seedI = Math.ceil(Math.random() * 4)

    const prompt = `You are an email design assistant for a short-term rental / hospitality brand.

Given the following email copy, do TWO things:

1. Choose a HEADER STYLE and IMAGE STYLE. You MUST explore the full range — consider all 4 options for each and pick the most creative fit for this specific copy. Do NOT default to the same combination every time. Today's exploration seed: header ${seedH}, image ${seedI} — use this as inspiration to try a fresh angle.
2. Return the copy fields with important phrases wrapped in <strong> tags (max 3–4 bolded phrases total, only truly key words like a property name, season, or strong action phrase).

HEADER STYLES:
1 — Mountain: dark navy overlay with rugged/luxury feel
2 — Forest: deep green overlay, earthy and grounded
3 — Ocean/Water: warm brown tones, coastal or romantic
4 — Desert: terracotta warmth, sunset adventurous feel

IMAGE STYLES:
1 — 2×2 grid of 4 photos (great for showcasing multiple spaces or moments)
2 — Polaroid collage "Favorite Memories" (nostalgic, lifestyle, emotional)
3 — Two overlapping tilted photos (intimate, editorial)
4 — Single circular feature image (bold, focused, modern)

EMAIL COPY:
Subject: ${copy.subjectLine || ''}
Headline: ${copy.headlineText || ''}
Subhead: ${copy.subhead || ''}
Body: ${copy.bodyText || ''}
CTA: ${copy.ctaText || ''}
Closing: ${copy.closingLine || ''}

Respond ONLY with valid JSON in this exact shape:
{
  "headerStyle": <1|2|3|4>,
  "imageStyle": <1|2|3|4>,
  "reasoning": "<one sentence why this specific combination fits>",
  "boldedCopy": {
    "headlineText": "<headline with <strong> tags>",
    "subhead": "<subhead with <strong> tags>",
    "bodyText": "<body with <strong> tags>",
    "closingLine": "<closing with <strong> tags>"
  }
}`

    const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://hiddengem.media',
        'X-Title':      'HiddenGem Email Studio',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 800,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`OpenRouter error ${res.status}: ${text}`)
    }

    const data    = await res.json()
    const content = data.choices?.[0]?.message?.content || ''

    // Strip markdown fences if present
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result  = JSON.parse(jsonStr)

    console.log(`[recommend-template] header=${result.headerStyle} image=${result.imageStyle} — ${result.reasoning}`)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    }
  } catch (err) {
    console.error('[recommend-template] Error:', err.message)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
