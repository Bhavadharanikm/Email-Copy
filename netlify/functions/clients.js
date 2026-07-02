/**
 * GET /.netlify/functions/clients
 * Reads client list from Supabase Email_Client_API table.
 * Required env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

export const handler = async () => {
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase credentials not set')

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/Email_Client_API?select=id,client_name,ghl_api_key,location_id,logo_url&order=id.asc`,
      {
        headers: {
          apikey:        SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    )

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Supabase error ${res.status}: ${text}`)
    }

    const rows = await res.json()

    const clients = rows.map((row, i) => ({
      id:        `client-${i}`,
      name:      row.client_name || '',
      ghlApiKey: row.ghl_api_key || '',
      ghl: {
        locationId: row.location_id || '',
      },
      logoUrl:     row.logo_url || '',
      brandColors: null,
      brand:       {},
    }))

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clients),
    }
  } catch (err) {
    console.error('[clients] Error:', err.message)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
