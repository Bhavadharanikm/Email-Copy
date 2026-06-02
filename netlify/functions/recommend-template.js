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

    const prompt = `You are an email design assistant for a short-term rental / hospitality brand.

Given the following email copy, do TWO things:

1. Recommend the best HEADER STYLE and IMAGE STYLE from the options below.
2. Return the copy fields with important phrases wrapped in <strong> tags (max 3–4 bolded phrases total, only truly key words like a property name, season, strong action phrase).

HEADER STYLES:
1 — Dark branded logo bar (luxury, premium feel)
2 — Minimal centered logo on white (clean, editorial)
3 — Full-width colour band with large headline text (bold, campaign-style)
4 — Split layout: logo left + tagline right (modern, informational)

IMAGE STYLES:
1 — Single hero full-width banner (dramatic, one strong image)
2 — Polaroid collage with "Favorite Memories" label (nostalgic, lifestyle)
3 — Side-by-side two equal images (comparison, showcase)
4 — Mosaic: one large left + two stacked right (editorial, variety)

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
  "reasoning": "<one sentence why>",
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
        temperature: 0.3,
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
