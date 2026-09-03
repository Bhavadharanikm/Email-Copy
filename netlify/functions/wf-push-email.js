/**
 * POST /.netlify/functions/wf-push-email
 * Body: { clientId, clientName, position, dbId?, email }
 * Returns: { id, action: 'inserted' | 'updated' }
 *
 * Saves one Welcome Flow email into email_wf_emails in the Welcome Flow
 * Supabase project (iymhjrmmgwrxdggcvmjn). Writes:
 *
 *   copy            all three variations plus which one is selected
 *   preview_html    the HTML the preview rendered
 *   rendered_html   the same HTML that gets pushed to GHL
 *   images          the picked media-library images, slot by slot
 *   generated_urls  the baked Puppeteer PNGs
 *   subject_line / preview_text   pulled from the selected variation
 *
 * The table has no column for the variation list, so `copy` holds
 * { selectedVariation, variations } rather than only the chosen one — nothing
 * is lost and the schema is untouched.
 *
 * Re-pushing the same email updates its row instead of adding another: the
 * caller passes back the dbId it got the first time.
 */

import { withAuth } from './_auth.js'
const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

const env = () => ({
  url: process.env.WF_SUPABASE_URL,
  key: process.env.WF_SUPABASE_SERVICE_KEY,
})

const headers = (key) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
})

const rawHandler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' })

  try {
    const { url, key } = env()
    if (!url || !key) {
      return json(500, { error: 'WF_SUPABASE_URL / WF_SUPABASE_SERVICE_KEY not configured' })
    }

    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body
    const { clientId, clientName, position, week, dbId, email } = JSON.parse(raw || '{}')

    if (!clientId) return json(400, { error: 'clientId is required' })
    if (!email)    return json(400, { error: 'email is required' })

    const variations = Array.isArray(email.variations) ? email.variations : []
    const selected   = Number.isInteger(email.selectedVariation) ? email.selectedVariation : 0
    const chosen     = variations[selected] || email.copy || {}

    const row = {
      client_id:      clientId,
      client_name:    clientName || '',
      position:       position ?? email.position ?? 1,
      week:           week ?? email.week ?? null,
      subject_line:   chosen.subjectLine || '',
      preview_text:   chosen.previewText || '',
      status:         email.status || 'ready',
      template_id:    email.templateId ?? null,
      brief:          email.brief || '',
      copy:           { selectedVariation: selected, variations },
      images:         email.selectedImages || [],
      generated_urls: email.generatedUrls || {},
      preview_html:   email.previewHtml || email.renderedHtml || '',
      rendered_html:  email.renderedHtml || '',
      ghl_template_id: email.ghlTemplateId || null,
      pushed_at:      email.pushedAt || null,
      updated_at:     new Date().toISOString(),
    }

    /* Three ways in, in order of certainty:
         - a known row id            -> PATCH that row
         - a client + week           -> upsert on the (client_id, week) unique
                                        index, so re-running a week overwrites
                                        it instead of stacking rows
         - neither                   -> plain insert
       The middle case is what Approve & Push uses: it has no dbId the first
       time, but the week identifies the row just as well. */
    const upsertOnWeek = !dbId && row.week != null

    const target = dbId
      ? `${url}/rest/v1/email_wf_emails?id=eq.${encodeURIComponent(dbId)}`
      : upsertOnWeek
      ? `${url}/rest/v1/email_wf_emails?on_conflict=client_id,week`
      : `${url}/rest/v1/email_wf_emails`

    const res = await fetch(target, {
      method: dbId ? 'PATCH' : 'POST',
      headers: {
        ...headers(key),
        // on_conflict goes in the query string; merge-duplicates turns the
        // insert into an update when the (client_id, week) pair already exists
        Prefer: upsertOnWeek
          ? 'return=representation,resolution=merge-duplicates'
          : 'return=representation',
      },
      body: JSON.stringify(row),
    })

    const text = await res.text()
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${text.slice(0, 300)}`)

    const [saved] = JSON.parse(text)
    if (!saved) throw new Error('Supabase accepted the write but returned no row')

    console.log(`[wf-push-email] ${dbId ? 'updated' : upsertOnWeek ? 'upserted week ' + row.week : 'inserted'} ${saved.id} ` +
                `(${variations.length} variations, rendered ${row.rendered_html.length} bytes)`)

    return json(200, {
      id: saved.id,
      action: dbId ? 'updated' : upsertOnWeek ? 'upserted' : 'inserted',
      week:   row.week,
      variations: variations.length,
      renderedBytes: row.rendered_html.length,
    })

  } catch (err) {
    console.error('[wf-push-email]', err.message)
    return json(500, { error: err.message })
  }
}

export const handler = withAuth(rawHandler)
