/**
 * GET /.netlify/functions/campaign-suggestions?month=YYYY-MM[&locationId=…]  or  ?locationId=… alone
 *
 * With locationId: every saved suggestion set for that client and month,
 * newest first. Without: { generated: { [locationId]: lastGeneratedAt } } for
 * the month, so the client picker can mark who already has suggestions.
 * locationId alone: { months: { [YYYY-MM]: lastGeneratedAt } } for that client.
 *
 * POST { setId, target, rating?, comment? } saves a rating and/or note on one
 * part of a saved set: 'analysis', or 'first-1' / 'first-2' / 'second-1' /
 * 'second-2' (send, then 1 = Primary, 2 = Backup).
 */
import { withAuth } from './_auth.js'
import { bearerOf, listSuggestionSets, clientsWithSets, monthsWithSets, TARGETS, getSuggestionSet, saveFeedback, feedbackForSets } from './_suggestionsStore.js'

const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

async function postFeedback(event) {
  let body
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Invalid JSON' }) }
  const { setId, target } = body
  const rating = body.rating == null || body.rating === '' ? null : Number(body.rating)
  const comment = String(body.comment || '').trim().slice(0, 4000) || null
  if (!TARGETS.includes(target)) return json(400, { error: `target must be one of ${TARGETS.join(', ')}` })
  if (rating != null && !(Number.isInteger(rating) && rating >= 1 && rating <= 5)) return json(400, { error: 'rating must be 1 to 5' })
  if (rating == null && !comment) return json(400, { error: 'Give a rating, a comment, or both' })

  const token = bearerOf(event)
  try {
    const set = await getSuggestionSet(token, setId)
    if (!set) return json(404, { error: 'That suggestion set was not found' })
    const r = set.result || {}
    const about = target === 'analysis'
      ? { part: 'analysis', summary: r.analysis?.summary || '' }
      : (() => {
          const [slot, rank] = target.split('-')
          const x = (r.suggestions || []).find(y => y.slot === slot && String(y.rank) === rank) || {}
          return { part: `${slot === 'first' ? 'Send 1' : 'Send 2'} ${rank === '1' ? 'Primary' : 'Backup'}`,
            title: x.title, type: x.type, category: x.category, subjectLine: x.subjectLine, hook: x.hook }
        })()
    const row = await saveFeedback(token, {
      set_id: set.id, location_id: set.location_id, month: set.month, target, rating, comment, about,
      created_by: event.session?.email || null,
    })
    return json(200, { feedback: { id: row.id, setId: row.set_id, target, rating, comment, createdBy: row.created_by, createdAt: row.created_at } })
  } catch (err) {
    console.error('[campaign-suggestions] feedback', err.message)
    return json(500, { error: err.message })
  }
}

const rawHandler = async (event) => {
  if (event.httpMethod === 'POST') return postFeedback(event)
  if (event.httpMethod !== 'GET') return json(405, { error: 'GET or POST only' })
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
      /* Feedback is extra: a failure to read it never hides the suggestions. */
      const fb = await feedbackForSets(token, rows.map(r => r.id)).catch(err => { console.error('[campaign-suggestions] feedback read', err.message); return [] })
      return json(200, { sets: rows.map(r => ({
        ...r.result, id: r.id, generatedAt: r.generated_at, generatedBy: r.generated_by,
        feedback: fb.filter(f => f.set_id === r.id).map(f => ({ id: f.id, target: f.target, rating: f.rating, comment: f.comment, createdBy: f.created_by, createdAt: f.created_at })),
      })) })
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
