/**
 * GET /.netlify/functions/campaign-suggestions?month=YYYY-MM[&locationId=…]
 *
 * With locationId: every saved suggestion set for that client and month,
 * newest first. Without: { generated: { [locationId]: lastGeneratedAt } } for
 * the month, so the client picker can mark who already has suggestions.
 */
import { withAuth } from './_auth.js'
import { bearerOf, listSuggestionSets, clientsWithSets } from './_suggestionsStore.js'

const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

const rawHandler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'GET only' })
  const { month, locationId } = event.queryStringParameters || {}
  if (!/^\d{4}-\d{2}$/.test(month || '')) return json(400, { error: 'month (YYYY-MM) is required' })
  const token = bearerOf(event)

  try {
    if (locationId) {
      const rows = await listSuggestionSets(token, locationId, month)
      return json(200, { sets: rows.map(r => ({ ...r.result, id: r.id, generatedAt: r.generated_at, generatedBy: r.generated_by })) })
    }
    const generated = {}
    for (const r of await clientsWithSets(token, month)) generated[r.location_id] ||= r.generated_at
    return json(200, { generated })
  } catch (err) {
    console.error('[campaign-suggestions]', err.message)
    return json(500, { error: err.message })
  }
}

export const handler = withAuth(rawHandler)
