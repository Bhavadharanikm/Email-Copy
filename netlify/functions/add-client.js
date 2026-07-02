/**
 * POST /.netlify/functions/add-client
 * Inserts a new client into the Supabase Email_Client_API table.
 * Required env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase credentials not set')

    const { client_name, ghl_api_key, location_id, logo_url } = JSON.parse(event.body || '{}')

    if (!client_name?.trim()) return { statusCode: 400, body: JSON.stringify({ error: 'Client name is required' }) }
    if (!ghl_api_key?.trim()) return { statusCode: 400, body: JSON.stringify({ error: 'GHL API key is required' }) }
    if (!location_id?.trim()) return { statusCode: 400, body: JSON.stringify({ error: 'Location ID is required' }) }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/Email_Client_API`, {
      method: 'POST',
      headers: {
        apikey:        SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer:        'return=representation',
      },
      body: JSON.stringify({
        client_name: client_name.trim(),
        ghl_api_key: ghl_api_key.trim(),
        location_id: location_id.trim(),
        logo_url:    logo_url?.trim() || null,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Supabase error ${res.status}: ${text}`)
    }

    const [row] = await res.json()
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, id: row?.id }),
    }
  } catch (err) {
    console.error('[add-client] Error:', err.message)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
