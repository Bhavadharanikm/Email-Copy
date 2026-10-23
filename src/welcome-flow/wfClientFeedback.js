/**
 * Client feedback on welcome-flow emails: the notes the client's platform writes
 * into email_wf_emails.feedback, and which of them an account manager has
 * marked fixed (wf-feedback-fixed). Shared by the clients page and a client's
 * own page, so both count the same way.
 */

/** The client's feedback on one email as a list of notes. The client's
    platform writes the column: a JSON list is one note per item (a string, or
    an object with its text under feedback/text/comment/message), anything
    else is one note. */
export function clientFeedbackItems(raw) {
  const text = typeof raw === 'string' ? raw.trim() : ''
  if (!text) return []
  try {
    const parsed = JSON.parse(text)
    const list = Array.isArray(parsed) ? parsed : [parsed]
    const items = list.map(x => {
      if (typeof x === 'string') return { text: x.trim() }
      if (x && typeof x === 'object') {
        return {
          text: String(x.feedback ?? x.text ?? x.comment ?? x.message ?? '').trim(),
          by:   x.author || x.by || x.name || '',
          at:   x.created_at || x.createdAt || x.date || '',
        }
      }
      return { text: String(x ?? '').trim() }
    }).filter(i => i.text)
    if (items.length) return items
  } catch { /* plain text */ }
  return [{ text }]
}

/** The fixed mark for one note, or undefined. Matched by the note's text. */
export function isNoteFixed(fixedMarks, wfEmailId, text) {
  const want = String(text || '').trim()
  return (fixedMarks || []).find(f => f.wfEmailId === wfEmailId && String(f.noteText).trim() === want)
}

/** Notes not yet marked fixed, across the given emails. */
export function openNoteCount(emails, fixedMarks) {
  let n = 0
  for (const e of emails || []) {
    for (const item of clientFeedbackItems(e?.clientFeedback)) if (!isNoteFixed(fixedMarks, e.id, item.text)) n++
  }
  return n
}
