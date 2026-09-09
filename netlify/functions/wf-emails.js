/**
 * wf-emails.js — GET /.netlify/functions/wf-emails?clientId=X   → { emails: [...] }
 *                GET /.netlify/functions/wf-emails?id=Y         → { email }
 *
 * The read side of email_wf_emails in the Welcome Flow Supabase project
 * (iymhjrmmgwrxdggcvmjn). wf-push-email writes a row; this hands it back in
 * the shape the browser works with, so opening an email shows exactly what
 * was stored: copy, images, baked PNGs, both HTML versions, status.
 *
 * The row's `copy` column holds { selectedVariation, variations }; here it is
 * unpacked so the browser gets `variations`, `selectedVariation` and `copy`
 * (the chosen variation) as separate fields, the way the pages read them.
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
const headers = (key) => ({ apikey: key, Authorization: `Bearer ${key}` })

/** One database row → the email object the pages use. */
export function rowToEmail(r) {
  const packed     = r.copy && typeof r.copy === 'object' ? r.copy : {}
  const variations = Array.isArray(packed.variations) ? packed.variations : []
  const selected   = Number.isInteger(packed.selectedVariation) ? packed.selectedVariation : 0
  const chosen     = variations[selected] || (variations.length ? {} : packed)
  return {
    id:                r.id,
    dbId:              r.id,
    position:          r.position ?? 1,
    week:              r.week ?? null,
    subject:           r.subject_line || chosen.subjectLine || '',
    status:            r.status || 'draft',
    templateId:        r.template_id ?? null,
    brief:             r.brief || '',
    copy:              chosen,
    variations,
    selectedVariation: selected,
    selectedImages:    Array.isArray(r.images) ? r.images : [],
    generatedUrls:     r.generated_urls && typeof r.generated_urls === 'object' ? r.generated_urls : {},
    previewHtml:       r.preview_html || '',
    renderedHtml:      r.rendered_html || '',
    ghlTemplateId:     r.ghl_template_id || null,
    pushedAt:          r.pushed_at || null,
    createdAt:         r.created_at,
    updatedAt:         r.updated_at,
  }
}

const rawHandler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method Not Allowed' })
  try {
    const { url, key } = env()
    if (!url || !key) return json(500, { error: 'WF_SUPABASE_URL / WF_SUPABASE_SERVICE_KEY not configured' })
    const q = event.queryStringParameters || {}

    if (q.id) {
      const res = await fetch(`${url}/rest/v1/email_wf_emails?id=eq.${encodeURIComponent(q.id)}&limit=1`, { headers: headers(key) })
      if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`)
      const [row] = await res.json()
      return row ? json(200, { email: rowToEmail(row) }) : json(404, { error: 'Email not found' })
    }

    if (!q.clientId) return json(400, { error: 'clientId is required' })
    const res = await fetch(
      `${url}/rest/v1/email_wf_emails?client_id=eq.${encodeURIComponent(q.clientId)}&order=week.asc.nullslast,position.asc`,
      { headers: headers(key) }
    )
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const rows = await res.json()
    return json(200, { emails: rows.map(rowToEmail) })
  } catch (e) {
    console.error('[wf-emails]', e)
    return json(500, { error: e.message })
  }
}

export const handler = withAuth(rawHandler)
