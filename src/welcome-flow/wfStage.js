/**
 * Where a welcome-flow email is, as the client page shows it:
 *
 *   Needs update           the client has feedback on it not yet marked fixed
 *   Pushed to GoHighLevel  the latest version is the one in GHL
 *   Pushed to database     the latest version was pushed with Push to Database
 *   Rendered               its images are generated, not pushed anywhere since
 *   Copy ready             copy written, no images yet
 *   Draft                  nothing written yet
 *
 * "The latest version" is decided by a fingerprint of the copy, the baked
 * images and the HTML, taken at each push (email.pushMarks.ghlSig / dbSig). Any
 * edit after a push changes the fingerprint, so the email drops back to
 * Rendered until it is pushed again; opening a page without changing anything
 * leaves it where it was.
 *
 * The stored status column (draft, ready, pushed, needs_update) is not
 * changed by any of this: other tools read it.
 */

/* JSON with keys in a fixed order. The database stores these as jsonb, which
   reorders keys, so a fingerprint taken before saving must still match the
   same email read back after a reload. */
function stable(v) {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`
  return JSON.stringify(v ?? null)
}

/** A short fingerprint of what a push sends. FNV-1a over the JSON. */
export function emailSig(email) {
  const s = stable([
    email?.selectedVariation ?? 0,
    email?.variations || [],
    email?.generatedUrls || {},
    email?.renderedHtml || '',
  ])
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0 }
  return h.toString(36) + ':' + s.length.toString(36)
}

export const WF_STAGE = {
  needs_update: { label: 'Needs update',          tone: 'warn'    },
  in_ghl:       { label: 'Pushed to GoHighLevel', tone: 'good'    },
  in_database:  { label: 'Pushed to database',    tone: 'info'    },
  rendered:     { label: 'Rendered',              tone: 'info'    },
  copy_ready:   { label: 'Copy ready',            tone: 'neutral' },
  draft:        { label: 'Draft',                 tone: 'neutral' },
}

/* Any baked image at all. generatedUrls is { templateId: { hero, btn, … } },
   so an empty set for a template is not a bake. */
const hasBake = (v) => typeof v === 'string' ? !!v.trim()
  : Array.isArray(v) ? v.some(hasBake)
  : v && typeof v === 'object' ? Object.values(v).some(hasBake) : false

/* Pushed to GHL before pushes were fingerprinted (23 Oct 2026). For those the
   stored status cannot be trusted (Approve flipped it to needs_update a moment
   after a good push), and neither can the row's last-changed time (opening a
   page writes the email back). A GHL template and a push time say it went to
   GHL; that is what the page shows until the next push records a fingerprint. */
function pushedBeforeMarks(email) {
  return email.status === 'pushed' || !!(email.ghlTemplateId && email.pushedAt)
}

/** The stage key for one email. openFeedback: client notes not yet fixed. */
export function wfStage(email, openFeedback = 0) {
  if (!email) return 'draft'
  if (openFeedback > 0) return 'needs_update'
  const marks = email.pushMarks || {}
  const sig = emailSig(email)
  if (marks.ghlSig ? marks.ghlSig === sig : pushedBeforeMarks(email)) return 'in_ghl'
  if (marks.dbSig && marks.dbSig === sig) return 'in_database'
  if (hasBake(email.generatedUrls)) return 'rendered'
  if (Array.isArray(email.variations) && email.variations.length) return 'copy_ready'
  return 'draft'
}
