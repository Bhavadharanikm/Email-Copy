/**
 * POST /.netlify/functions/analyze-image-focal
 * Body: { imageUrl: string }
 *
 * Uses OpenRouter vision (Claude 3.5 Haiku) to detect the main subject
 * in an image and return its focal point as x/y percentages.
 * Returns: { focalX: 0-100, focalY: 0-100 }
 */

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'
const MODEL           = 'anthropic/claude-3-5-haiku'

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  try {
    const { imageUrl } = JSON.parse(event.body || '{}')
    if (!imageUrl) return { statusCode: 200, body: JSON.stringify({ focalX: 50, focalY: 50 }) }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) return { statusCode: 200, body: JSON.stringify({ focalX: 50, focalY: 50 }) }

    const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
        'HTTP-Referer':  'https://hiddengem.media',
        'X-Title':       'Email Production Studio',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 60,
        temperature: 0,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: imageUrl }
            },
            {
              type: 'text',
              text: 'Look at this image. Find the main subject or most visually important element (a person, object, building, landscape feature). Where is its center? Reply with ONLY valid JSON, no other text: {"x":<0-100>,"y":<0-100>} where x=horizontal % from left, y=vertical % from top.'
            }
          ]
        }]
      })
    })

    const data = await res.json()
    const text = data.choices?.[0]?.message?.content?.trim() || ''

    // Extract JSON from response
    const match = text.match(/\{[^}]+\}/)
    if (!match) return { statusCode: 200, body: JSON.stringify({ focalX: 50, focalY: 50 }) }

    const parsed = JSON.parse(match[0])
    const focalX = Math.min(100, Math.max(0, Number(parsed.x) || 50))
    const focalY = Math.min(100, Math.max(0, Number(parsed.y) || 50))

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ focalX, focalY }),
    }
  } catch (err) {
    console.error('analyze-image-focal error:', err)
    // Always return a safe fallback — never fail the UI
    return { statusCode: 200, body: JSON.stringify({ focalX: 50, focalY: 50 }) }
  }
}
