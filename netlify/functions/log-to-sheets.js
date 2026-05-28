/**
 * POST /.netlify/functions/log-to-sheets
 * Body: { client, generatedCopy, variationLabel }
 *
 * Forwards the selected variation to an n8n webhook which appends
 * a "Variation - Selected" row to the Google Sheet.
 *
 * Required env var: N8N_LOG_WEBHOOK_URL
 * (set to your n8n "log-selected" production webhook URL)
 */

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { client, generatedCopy, variationLabel = 'Variation - Selected' } = JSON.parse(event.body)
    const webhookUrl = process.env.N8N_LOG_WEBHOOK_URL

    if (!webhookUrl) {
      console.warn('[log-to-sheets] N8N_LOG_WEBHOOK_URL not set — skipping sheet log.')
      return { statusCode: 200, body: JSON.stringify({ stub: true }) }
    }

    const res = await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName:      client.name,
        locationId:      client.ghl?.locationId || '',
        variation:       variationLabel,
        pov:             generatedCopy.name        || '',
        subjectLine:     generatedCopy.subjectLine  || '',
        previewText:     generatedCopy.previewText  || '',
        headlineText:    generatedCopy.headlineText || '',
        subhead:         generatedCopy.subhead      || '',
        bodyText:        generatedCopy.bodyText     || '',
        bodyBlock2Title: generatedCopy.bodyBlock2Title || '',
        bodyBlock2:      generatedCopy.bodyBlock2   || '',
        ctaText:         generatedCopy.ctaText      || '',
        closingLine:     generatedCopy.closingLine  || '',
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`n8n log webhook returned ${res.status}: ${text}`)
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) }

  } catch (err) {
    console.error('[log-to-sheets] Error:', err.message)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
