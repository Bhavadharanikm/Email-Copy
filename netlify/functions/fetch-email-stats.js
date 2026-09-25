/**
 * GET /.netlify/functions/fetch-email-stats
 *
 * Required header: x-api-key: <STATS_API_KEY>
 * Optional query:  ?locationId=XXX  → single client only
 *                  (omit)           → all clients from Supabase
 *
 * Returns: { clients: [...], total }
 * Each client includes locationId, clientName, and their campaigns array.
 * Clients with no campaigns return an empty array. Stats scope errors return zeros.
 */

import { withAuth } from './_auth.js'
import { createClient } from '@supabase/supabase-js'

const GHL_BASE         = 'https://services.leadconnectorhq.com'
const STATS_VERSION    = 'v3'
const SCHEDULE_VERSION = '2021-07-28'
const PAGE_LIMIT       = 100

function scheduleHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}`, Version: SCHEDULE_VERSION, 'Content-Type': 'application/json' }
}

function statsHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}`, Version: STATS_VERSION, 'Content-Type': 'application/json' }
}

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
}

async function getAllClients() {
  const { data, error } = await supabase()
    .from('Email_Client_API')
    .select('client_name, location_id, ghl_api_key')
    .order('client_name', { ascending: true })
  if (error) throw new Error(`Supabase fetch failed: ${error.message}`)
  return data || []
}

async function getSingleClient(locationId) {
  const { data, error } = await supabase()
    .from('Email_Client_API')
    .select('client_name, location_id, ghl_api_key')
    .eq('location_id', locationId)
    .single()
  if (error || !data) throw new Error(`No client found for locationId: ${locationId}`)
  return [data]
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

/* GHL rate-limits per location, and a client with 90 sends means 90 of these.
   Asking for them all at once got nearly all of them refused, and because a
   refusal came back as null the campaign was reported with its real sent and
   delivered counts — those come off the schedule — beside a flat zero for
   opens and clicks. Every number the suggestions would rest on, quietly wrong.
   So: a few at a time, back off and retry when told to, and say so in the log
   rather than passing a zero off as a fact. */
const STATS_CONCURRENCY = 4
const STATS_RETRIES     = 4

async function fetchStats(apiKey, locationId, bulkRequestId, attempt = 0) {
  try {
    const res = await fetch(
      `${GHL_BASE}/emails/locations/${locationId}/campaigns/stats/bulk-actions/${bulkRequestId}`,
      { headers: statsHeaders(apiKey) }
    )
    if (res.status === 429 || res.status >= 500) {
      if (attempt < STATS_RETRIES) {
        await sleep(400 * 2 ** attempt)
        return fetchStats(apiKey, locationId, bulkRequestId, attempt + 1)
      }
      console.warn(`[fetch-email-stats] ${bulkRequestId}: gave up after ${res.status}`)
      return null
    }
    if (!res.ok) {
      console.warn(`[fetch-email-stats] ${bulkRequestId}: ${res.status}`)
      return null
    }
    const data = await res.json()
    return data.stats || null
  } catch (err) {
    console.warn(`[fetch-email-stats] ${bulkRequestId}: ${err.message}`)
    return null
  }
}

/** Run fn over items, no more than `limit` at a time, results in order. */
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++
      if (i >= items.length) return
      out[i] = await fn(items[i], i)
    }
  }))
  return out
}

async function fetchAllSchedules(apiKey, locationId) {
  const schedules = []
  let skip = 0

  while (true) {
    const res = await fetch(
      `${GHL_BASE}/emails/schedule?locationId=${locationId}&limit=${PAGE_LIMIT}&skip=${skip}`,
      { headers: scheduleHeaders(apiKey) }
    )
    if (!res.ok) break
    const data = await res.json()
    const page = data.schedules || []
    schedules.push(...page)
    if (page.length < PAGE_LIMIT) break
    skip += PAGE_LIMIT
  }

  return schedules
}

async function fetchClientCampaigns(client) {
  const { client_name, location_id, ghl_api_key } = client

  try {
    const schedules = await fetchAllSchedules(ghl_api_key, location_id)

    // Deduplicate by bulkRequestId — GHL returns parent + child records per send
    const seen = new Set()
    const sent = schedules.filter(s => {
      if (!s.bulkRequestId) return false
      if (seen.has(s.bulkRequestId)) return false
      seen.add(s.bulkRequestId)
      return true
    })

    if (sent.length === 0) {
      return { clientName: client_name, locationId: location_id, campaigns: [], total: 0 }
    }

    const statsResults = await mapLimit(sent, STATS_CONCURRENCY,
      s => fetchStats(ghl_api_key, location_id, s.bulkRequestId))
    const missing = statsResults.filter(x => !x).length
    if (missing) console.warn(`[fetch-email-stats] ${client_name}: ${missing} of ${sent.length} campaigns returned no stats`)

    const campaigns = sent.map((s, i) => {
      const stats = statsResults[i]
      const sentDate = s.dateScheduled
        ? new Date(s.dateScheduled).toLocaleString('en-US', {
            timeZone: 'America/New_York',
            month: 'short', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true,
          })
        : null

      return {
        locationId:      location_id,
        clientName:      client_name,
        id:              s._id,
        bulkRequestId:   s.bulkRequestId,
        name:            s.name,
        subject:         s.subject || '',
        sentDate,
        sentTimestamp:   s.dateScheduled,
        status:          s.emailStatus,
        sent:            stats?.sent            ?? s.totalCount   ?? 0,
        delivered:       stats?.delivered       ?? s.successCount ?? 0,
        failed:          stats?.permanentFail   ?? s.failed       ?? 0,
        opened:          stats?.opened          ?? 0,
        clicked:         stats?.clicked         ?? 0,
        unsubscribed:    stats?.unsubscribed    ?? 0,
        complained:      stats?.complained      ?? 0,
        openRate:        stats?.openRate        ?? 0,
        clickRate:       stats?.clickRate       ?? 0,
        unsubscribeRate: stats?.unsubscribeRate ?? 0,
        bounceRate:      stats?.bounceRate      ?? 0,
        complaintRate:   stats?.complaintRate   ?? 0,
        replyRate:       stats?.replyRate       ?? 0,
        previewUrl:      s.downloadUrl          || '',
        templateType:    s.templateType         || '',
      }
    })

    campaigns.sort((a, b) => (b.sentTimestamp || 0) - (a.sentTimestamp || 0))

    return { clientName: client_name, locationId: location_id, campaigns, total: campaigns.length }

  } catch (err) {
    console.error(`[fetch-email-stats] Error for ${client_name}:`, err.message)
    return { clientName: client_name, locationId: location_id, campaigns: [], total: 0, error: err.message }
  }
}

const rawHandler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' }

  // ── API key auth ──────────────────────────────────────────────────────────
  const incomingKey = event.headers['x-api-key']
  if (!incomingKey || incomingKey !== process.env.STATS_API_KEY) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const { locationId } = event.queryStringParameters || {}

  try {
    const clients = locationId ? await getSingleClient(locationId) : await getAllClients()

    // Fetch all clients in parallel
    const results = await Promise.all(clients.map(fetchClientCampaigns))

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ clients: results, total: results.length }),
    }

  } catch (err) {
    console.error('[fetch-email-stats] Error:', err.message)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}

/* Public: this endpoint authenticates callers with its own x-api-key check. */
export const handler = withAuth(rawHandler, { public: true })
