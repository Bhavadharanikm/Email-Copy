/**
 * DELETE /.netlify/functions/delete-client
 * Body: { client_name }
 * Deletes a client from Supabase Email_Client_API by name.
 * Required env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase credentials not set')

    const { client_name } = JSON.parse(event.body || '{}')
    if (!client_name?.trim()) return { statusCode: 400, body: JSON.stringify({ error: 'Client name is required' }) }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/Email_Client_API?client_name=eq.${encodeURIComponent(client_name.trim())}`,
      {
        method: 'DELETE',
        headers: {
          apikey:        SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Prefer:        'return=minimal',
        },
      }
    )

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Supabase error ${res.status}: ${text}`)
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true }),
    }
  } catch (err) {
    console.error('[delete-client] Error:', err.message)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
