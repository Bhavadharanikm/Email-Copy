/**
 * POST /.netlify/functions/send-test-email
 * Body: { html, subject }
 *
 * Sends the rendered email HTML to a FIXED test inbox using the
 * "HiddenGem Test" GHL location's own API key + location id.
 *
 * Both the sender and the recipient are hardcoded below on purpose —
 * the browser never supplies them, so this endpoint cannot be used to
 * mail an arbitrary address.
 *
 * Flow:
 *   1. Read the HiddenGem Test row from Supabase (ghl_api_key + location_id)
 *   2. Upsert the recipient as a contact in that location (GHL requires a
 *      contactId — its email API is contact-first)
 *   3. POST the HTML to /conversations/messages as type: Email
 *
 * Required env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

const GHL_BASE    = 'https://services.leadconnectorhq.com'
const GHL_VERSION = '2021-07-28'

// ── Fixed test identities — never taken from the request body ──────────────
const TEST_CLIENT_NAME = 'HiddenGem Test'
const EMAIL_FROM       = 'pooja@hiddengem.media'
const EMAIL_TO         = 'kmbhavadharani09@gmail.com'
const CONTACT_TAG      = 'email-template-test'

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' })

  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body

    const { html, subject } = JSON.parse(rawBody || '{}')

    if (!html || typeof html !== 'string') {
      return json(400, { error: 'Missing "html" in request body' })
    }

    // ── 1. Pull the HiddenGem Test credentials from Supabase ───────────────
    const SUPABASE_URL = process.env.SUPABASE_URL
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return json(500, { error: 'Supabase credentials not configured on the server' })
    }

    const supaRes = await fetch(
      `${SUPABASE_URL}/rest/v1/Email_Client_API` +
        `?select=client_name,ghl_api_key,location_id` +
        `&client_name=eq.${encodeURIComponent(TEST_CLIENT_NAME)}&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    )

    if (!supaRes.ok) {
      const t = await supaRes.text()
      return json(502, { error: `Supabase lookup failed (${supaRes.status}): ${t.slice(0, 200)}` })
    }

    const [row] = await supaRes.json()
    if (!row) {
      return json(404, { error: `No client row named "${TEST_CLIENT_NAME}" found in Email_Client_API` })
    }

    const apiKey     = row.ghl_api_key
    const locationId = row.location_id
    if (!apiKey || !locationId) {
      return json(500, {
        error: `"${TEST_CLIENT_NAME}" is missing ${!apiKey ? 'ghl_api_key' : 'location_id'} in Supabase`,
      })
    }

    const ghlHeaders = {
      Authorization:  `Bearer ${apiKey}`,
      Version:        GHL_VERSION,
      'Content-Type': 'application/json',
      Accept:         'application/json',
    }

    // ── 2. Upsert the recipient contact (GHL email API is contact-first) ───
    const upsertRes = await fetch(`${GHL_BASE}/contacts/upsert`, {
      method:  'POST',
      headers: ghlHeaders,
      body: JSON.stringify({
        locationId,
        email:     EMAIL_TO,
        firstName: 'Template',
        lastName:  'Test',
        tags:      [CONTACT_TAG],
      }),
    })

    const upsertData = await upsertRes.json().catch(() => ({}))
    if (!upsertRes.ok) {
      console.error('[send-test-email] contact upsert failed:', upsertRes.status, upsertData)
      return json(502, {
        error: `GHL contact upsert failed (${upsertRes.status}): ${
          upsertData?.message || JSON.stringify(upsertData).slice(0, 300)
        }`,
      })
    }

    // GHL has returned both { contact: { id } } and { id } shapes across versions
    const contactId = upsertData?.contact?.id || upsertData?.id
    if (!contactId) {
      return json(502, {
        error: `GHL upsert returned no contact id. Response: ${JSON.stringify(upsertData).slice(0, 300)}`,
      })
    }

    // ── 3. Send the email into that contact's conversation ─────────────────
    const sendRes = await fetch(`${GHL_BASE}/conversations/messages`, {
      method:  'POST',
      headers: ghlHeaders,
      body: JSON.stringify({
        type:      'Email',
        contactId,
        subject:   subject || '[TEST] Email template preview',
        html,
        emailFrom: EMAIL_FROM,
      }),
    })

    const sendData = await sendRes.json().catch(() => ({}))
    if (!sendRes.ok) {
      console.error('[send-test-email] send failed:', sendRes.status, sendData)
      return json(502, {
        error: `GHL send failed (${sendRes.status}): ${
          sendData?.message || JSON.stringify(sendData).slice(0, 300)
        }`,
      })
    }

    console.log('[send-test-email] sent to', EMAIL_TO, '| contact', contactId, '| msg', sendData?.messageId)

    return json(200, {
      success:   true,
      to:        EMAIL_TO,
      from:      EMAIL_FROM,
      contactId,
      messageId: sendData?.messageId || sendData?.id || null,
    })
  } catch (err) {
    console.error('[send-test-email] Error:', err)
    return json(500, { error: err.message || 'Unknown server error' })
  }
}
