/**
 * POST /.netlify/functions/push-to-ghl
 * Body: { client, renderedHtml, generatedCopy }
 * Returns: { success, emailId, previewUrl }
 *
 * TODO: Wire up GHL API once GHL_API_KEY is provided.
 * GHL API docs: https://highlevel.stoplight.io/docs/integrations
 */

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { client, renderedHtml, generatedCopy } = JSON.parse(event.body)

    const GHL_API_KEY   = process.env.GHL_API_KEY
    const locationId    = client?.ghl?.locationId
    const templateId    = client?.ghl?.templateId

    // ── STUB — replace with real GHL API call ─────────────────────────────
    // const response = await fetch(
    //   `https://services.leadconnectorhq.com/email/templates/${templateId}`,
    //   {
    //     method: 'PUT',
    //     headers: {
    //       'Authorization': `Bearer ${GHL_API_KEY}`,
    //       'Version':       '2021-07-28',
    //       'Content-Type':  'application/json',
    //     },
    //     body: JSON.stringify({
    //       locationId,
    //       html:    renderedHtml,
    //       subject: generatedCopy.subjectLine,
    //     }),
    //   }
    // )
    // ────────────────────────────────────────────────────────────────────────

    console.log(`[STUB] Would push to GHL location ${locationId}, template ${templateId}`)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success:    true,
        emailId:    `stub_email_${Date.now()}`,
        previewUrl: `https://app.gohighlevel.com/email-builder/stub-preview`,
      }),
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
