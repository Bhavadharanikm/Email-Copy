/**
 * POST /.netlify/functions/notify-chat
 * Body: { clientName, previewUrl, approvedBy }
 * Sends a Google Chat webhook message with the GHL preview link.
 *
 * TODO: Add GOOGLE_CHAT_WEBHOOK_URL to Netlify env vars.
 * Google Chat webhook docs: https://developers.google.com/chat/how-tos/webhooks
 */

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { clientName, previewUrl, approvedBy } = JSON.parse(event.body)
    const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL

    const message = {
      cards: [
        {
          header: {
            title:    '✅ Email Approved & Pushed to GHL',
            subtitle: clientName,
          },
          sections: [
            {
              widgets: [
                {
                  keyValue: {
                    topLabel:    'Approved by',
                    content:     approvedBy || 'Team',
                  },
                },
                {
                  keyValue: {
                    topLabel: 'Preview link',
                    content:  previewUrl,
                    onClick: {
                      openLink: { url: previewUrl },
                    },
                  },
                },
                {
                  buttons: [
                    {
                      textButton: {
                        text:    'View in GHL →',
                        onClick: { openLink: { url: previewUrl } },
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }

    // ── STUB guard — skip real call if no webhook URL set ─────────────────
    if (!webhookUrl) {
      console.log('[STUB] GOOGLE_CHAT_WEBHOOK_URL not set. Message would be:', JSON.stringify(message))
      return {
        statusCode: 200,
        body: JSON.stringify({ stub: true, message }),
      }
    }

    const res = await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(message),
    })

    if (!res.ok) throw new Error(`Google Chat webhook error: ${res.status}`)

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
