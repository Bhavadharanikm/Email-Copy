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

import { createClient } from '@supabase/supabase-js'

const GHL_BASE         = 'https://services.leadconnectorhq.com'
const STATS_VERSION    = 'v3'
const SCHEDULE_VERSION = '2021-07-28'
const PAGE_LIMIT       = 20

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

async function fetchStats(apiKey, locationId, bulkRequestId) {
  try {
    const res = await fetch(
      `${GHL_BASE}/emails/locations/${locationId}/campaigns/stats/bulk-actions/${bulkRequestId}`,
      { headers: statsHeaders(apiKey) }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.stats || null
  } catch {
    return null
  }
}

async function fetchAllSchedules(apiKey, locationId) {
  const firstRes = await fetch(
    `${GHL_BASE}/emails/schedule?locationId=${locationId}&limit=${PAGE_LIMIT}&skip=0`,
    { headers: scheduleHeaders(apiKey) }
  )
  if (!firstRes.ok) return []
  const firstData = await firstRes.json()

  const total = firstData.count || 0
  const schedules = [...(firstData.schedules || [])]

  if (total > PAGE_LIMIT) {
    const pages = Math.ceil(total / PAGE_LIMIT) - 1
    const pagePromises = Array.from({ length: pages }, (_, i) =>
      fetch(
        `${GHL_BASE}/emails/schedule?locationId=${locationId}&limit=${PAGE_LIMIT}&skip=${(i + 1) * PAGE_LIMIT}`,
        { headers: scheduleHeaders(apiKey) }
      ).then(r => r.json()).then(d => d.schedules || []).catch(() => [])
    )
    const pagesData = await Promise.all(pagePromises)
    pagesData.forEach(page => schedules.push(...page))
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
      if (!(s.emailStatus === 'complete' || s.emailStatus === 'scheduled')) return false
      if (!s.dateScheduled) return false
      if (seen.has(s.bulkRequestId)) return false
      seen.add(s.bulkRequestId)
      return true
    })

    if (sent.length === 0) {
      return { clientName: client_name, locationId: location_id, campaigns: [], total: 0 }
    }

    // Fetch stats for all campaigns in parallel
    const statsResults = await Promise.all(
      sent.map(s => fetchStats(ghl_api_key, location_id, s.bulkRequestId))
    )

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

export const handler = async (event) => {
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
