/**
 * GET /.netlify/functions/campaign-suggestions?month=YYYY-MM[&locationId=…]  or  ?locationId=… alone
 *
 * With locationId: every saved suggestion set for that client and month,
 * newest first. Without: { generated: { [locationId]: lastGeneratedAt } } for
 * the month, so the client picker can mark who already has suggestions.
 * locationId alone: { months: { [YYYY-MM]: lastGeneratedAt } } for that client.
 */
import { withAuth } from './_auth.js'
import { bearerOf, listSuggestionSets, clientsWithSets, monthsWithSets } from './_suggestionsStore.js'

const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

const rawHandler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'GET only' })
  const { month, locationId } = event.queryStringParameters || {}
  const token = bearerOf(event)
  if (locationId && !month) {
    try {
      const months = {}
      for (const r of await monthsWithSets(token, locationId)) months[r.month] ||= r.generated_at
      return json(200, { months })
    } catch (err) { return json(500, { error: err.message }) }
  }
  if (!/^\d{4}-\d{2}$/.test(month || '')) return json(400, { error: 'month (YYYY-MM) is required' })

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
