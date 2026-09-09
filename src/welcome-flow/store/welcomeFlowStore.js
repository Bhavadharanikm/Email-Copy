/**
 * Welcome Flow store.
 *
 * CLIENTS come from the database — email_wf_clients in the Welcome Flow Supabase
 * project — via /.netlify/functions/wf-clients. They are not persisted locally,
 * so the server is the single source of truth and stale rows cannot linger.
 *
 * EMAILS come from the database too — email_wf_emails, one row per client per
 * week — via wf-emails (read) and wf-push-email (write). Every create and
 * every change writes its row, so opening an email anywhere shows exactly what
 * was last saved: copy, images, baked PNGs, both HTML versions, status. A
 * re-push overwrites the whole row for that client and week.
 *
 * A client only appears here once it has been added on this page. The location_id
 * is the join key: the GHL API key and logo are resolved from the other Supabase
 * project at request time and never stored here.
 *
 * Shape:
 *   clients: [{ id, name, email, locationId, ghlApiKey, folderUrl, folderId }]
 *     - folderUrl/folderId are the "static info" entered once, reused per email
 *   emails:  { [clientId]: [{ id, position, subject, status, templateId,
 *                             copy, selectedImages, generatedUrls, renderedHtml,
 *                             createdAt, updatedAt }] }
 *
 * Status lifecycle:  draft -> ready -> in_review -> approved -> pushed
 *                                                        ↑         ↓
 *                                                    needs_update ←┘
 */

import { create } from 'zustand'
import { authFetch } from '../../lib/session'
import { wfWeek } from '../wfWeeks'

/* Emails used to live only in this browser (localStorage 'welcome-flow-v1').
   Whatever is still there is pushed up to the database the first time that
   client is opened, then the key is dropped. */
const LEGACY_KEY = 'welcome-flow-v1'
function peekLegacyEmails(clientId) {
  try { const parsed = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null'); return parsed?.state?.emails?.[clientId] || [] } catch { return [] }
}
function dropLegacyEmails(clientId) {
  try {
    const parsed = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null'); const all = parsed?.state?.emails || {}
    delete all[clientId]
    if (Object.keys(all).length) localStorage.setItem(LEGACY_KEY, JSON.stringify({ ...parsed, state: { ...parsed.state, emails: all } }))
    else localStorage.removeItem(LEGACY_KEY)
  } catch { /* nothing to drop */ }
}

/** Which of a browser's old copies to carry up. The database wins: a copy whose
    week already has a row is skipped, never written over it. What is imported
    goes up without its old ids, so it lands as a fresh row. Exported for tests. */
export function pickLegacyToImport(legacy, existing) {
  const taken = new Set((existing || []).map(e => e.week).filter(w => w != null))
  const imports = [], skipped = []
  for (const e of legacy || []) {
    if (e.week != null && taken.has(e.week)) { skipped.push(e); continue }
    const { id: _id, dbId: _dbId, ...rest } = e
    imports.push(rest)
  }
  return { imports, skipped }
}

/** The email of this client that already holds a week, if any (another email, not this one). */
export function weekTakenBy(emails, week, exceptEmailId) {
  const w = Number(week); if (!w) return null
  return (emails || []).find(e => e.week === w && e.id !== exceptEmailId) || null
}

/** Write one email's row. Returns the saved row id. Upserts on (client, week) when no id is known. */
async function saveEmail(clientId, clientName, email) {
  /* The row must always say which template its week uses, even for an email
     created before the template existed or with the week set later. */
  const templateId = email.templateId ?? wfWeek(email.week)?.templateId ?? null
  const res  = await authFetch('/.netlify/functions/wf-push-email', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientName, position: email.position, week: email.week ?? null, dbId: email.dbId || null, email: { ...email, templateId } }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error || `Save failed (${res.status})`)
  return body.id
}

/* Changes arrive keystroke by keystroke from the editors; one write per email
   a moment after the last change is enough. */
const pending = new Map()
function scheduleSave(get, set, clientId, emailId) {
  clearTimeout(pending.get(emailId))
  pending.set(emailId, setTimeout(async () => {
    pending.delete(emailId)
    const s = get(); const email = (s.emails[clientId] || []).find(e => e.id === emailId); if (!email) return
    const client = s.clients.find(c => c.id === clientId)
    try {
      const id = await saveEmail(clientId, client?.name || '', email)
      if (id && id !== email.dbId) set(st => ({ emails: { ...st.emails, [clientId]: (st.emails[clientId] || []).map(e => e.id === emailId ? { ...e, dbId: id } : e) } }))
      set({ saveError: null })
    } catch (e) { console.error('[welcome-flow] save failed', e); set({ saveError: e.message }) }
  }, 600))
}

export const WF_STATUS = {
  draft:        { label: 'Draft',        tone: 'neutral' },
  ready:        { label: 'Ready',        tone: 'info'    },
  in_review:    { label: 'In review',    tone: 'warn'    },
  approved:     { label: 'Approved',     tone: 'good'    },
  pushed:       { label: 'Pushed',       tone: 'good'    },
  needs_update: { label: 'Needs update', tone: 'warn'    },
}

// statuses that count as "finished" on the client cards
const DONE = new Set(['approved', 'pushed'])

const uid = () => `wf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`

export const useWelcomeFlowStore = create(
    (set, get) => ({
      clients: [],
      emails:  {},
      loadingClients: false,
      clientsError:   null,
      loadedEmails:   {},     // { [clientId]: true } once that client's emails have come from the database
      loadingEmails:  {},
      saveError:      null,

      // ── clients: server-backed ─────────────────────────────────────────
      fetchClients: async () => {
        set({ loadingClients: true, clientsError: null })
        try {
          const res  = await authFetch('/.netlify/functions/wf-clients')
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
          set({ clients: data.clients || [], loadingClients: false })
        } catch (e) {
          set({ clientsError: e.message, loadingClients: false })
        }
      },

      /**
       * Fetch clients only if we don't have them yet.
       *
       * Clients are server-backed and deliberately not persisted, so a reload or
       * a hot-reload on a deep route (…/email/:id/preview) starts with an empty
       * list. Without this, those pages decide the email no longer exists and
       * bounce the user back to the start. Every page that reads a client calls
       * this on mount.
       */
      ensureClients: async () => {
        const s = get()
        if (s.clients.length || s.loadingClients) return
        await s.fetchClients()
      },

      /** Validate a GHL location against the client database before creating. */
      lookupLocation: async (locationId) => {
        const res  = await authFetch('/.netlify/functions/wf-clients?locationId=' + encodeURIComponent(locationId))
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Lookup failed')
        return data.match
      },

      addClient: async (data) => {
        const res  = await authFetch('/.netlify/functions/wf-clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        const body = await res.json()
        if (!res.ok) throw new Error(body.error || `Create failed (${res.status})`)
        set((s) => ({
          clients: [...s.clients, body.client].sort((a, b) => a.name.localeCompare(b.name)),
          emails:  { ...s.emails, [body.client.id]: s.emails[body.client.id] || [] },
        }))
        return body.client.id
      },

      updateClient: (id, patch) => set((s) => ({
        clients: s.clients.map(c => (c.id === id ? { ...c, ...patch } : c)),
      })),

      removeClient: (id) => set((s) => {
        const { [id]: _drop, ...rest } = s.emails
        return { clients: s.clients.filter(c => c.id !== id), emails: rest }
      }),

      getClient: (id) => get().clients.find(c => c.id === id) || null,

      // ── emails: database-backed ─────────────────────────────────────────
      getEmails: (clientId) => get().emails[clientId] || [],

      /** Load a client's emails from the database once; carry up anything this
          browser still held from before, so nothing already written is lost. */
      ensureEmails: async (clientId) => {
        const s = get()
        if (!clientId || s.loadedEmails[clientId] || s.loadingEmails[clientId]) return
        set(st => ({ loadingEmails: { ...st.loadingEmails, [clientId]: true } }))
        try {
          const load = async () => {
            const res  = await authFetch('/.netlify/functions/wf-emails?clientId=' + encodeURIComponent(clientId))
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
            return data.emails || []
          }
          let rows = await load()
          /* Old copies this browser still holds: carry up the ones whose week is
             free, leave the rest (the database already has that week), then
             drop the old store. Written only after the decision, so a failure
             keeps the copy for next time. */
          const legacy = peekLegacyEmails(clientId)
          if (legacy.length) {
            const { imports, skipped } = pickLegacyToImport(legacy, rows)
            const client = s.clients.find(c => c.id === clientId)
            let failed = 0
            for (const e of imports) { try { await saveEmail(clientId, client?.name || '', e) } catch (err) { failed++; console.error('[welcome-flow] legacy import failed', err) } }
            if (skipped.length) console.info(`[welcome-flow] ${skipped.length} old browser cop${skipped.length === 1 ? 'y' : 'ies'} skipped: the database already has that week`)
            if (!failed) dropLegacyEmails(clientId)
            if (imports.length > failed) rows = await load()
          }
          set(st => ({
            emails:        { ...st.emails, [clientId]: rows },
            loadedEmails:  { ...st.loadedEmails, [clientId]: true },
            loadingEmails: { ...st.loadingEmails, [clientId]: false },
          }))
        } catch (e) {
          console.error('[welcome-flow] load emails failed', e)
          set(st => ({ loadingEmails: { ...st.loadingEmails, [clientId]: false }, saveError: e.message }))
        }
      },

      /** Create an email: the row is written first so its id is the database's. */
      addEmail: async (clientId, data = {}) => {
        const s = get()
        const list = s.emails[clientId] || []
        const now = new Date().toISOString()
        const draft = {
          position:       list.length + 1,
          week:           data.week ?? null,
          subject:        data.subject || '',
          status:         'draft',
          templateId:     data.templateId ?? null,
          brief:          data.brief || '',
          copy:           data.copy || {},
          variations:     [],
          selectedVariation: 0,
          selectedImages: [],
          generatedUrls:  {},
          renderedHtml:   '',
          createdAt:      now,
          updatedAt:      now,
        }
        const client = s.clients.find(c => c.id === clientId)
        const id = await saveEmail(clientId, client?.name || '', draft)
        set((st) => ({ emails: { ...st.emails, [clientId]: [...(st.emails[clientId] || []), { ...draft, id, dbId: id }] } }))
        return id
      },

      /** Change an email: shown at once, written to the database a moment later. */
      updateEmail: (clientId, emailId, patch) => {
        set((s) => ({
          emails: {
            ...s.emails,
            [clientId]: (s.emails[clientId] || []).map(e =>
              e.id === emailId
                ? {
                    ...e,
                    ...patch,
                    // editing something already pushed means GHL is now stale
                    status: (e.status === 'pushed' && !patch.status) ? 'needs_update' : (patch.status || e.status),
                    updatedAt: new Date().toISOString(),
                  }
                : e
            ),
          },
        }))
        scheduleSave(get, set, clientId, emailId)
      },

      removeEmail: (clientId, emailId) => set((s) => ({
        emails: {
          ...s.emails,
          [clientId]: (s.emails[clientId] || [])
            .filter(e => e.id !== emailId)
            .map((e, i) => ({ ...e, position: i + 1 })),
        },
      })),

      // ── counts for the client cards ────────────────────────────────────
      counts: (clientId) => {
        const list = get().emails[clientId] || []
        return {
          total:      list.length,
          done:       list.filter(e => DONE.has(e.status)).length,
          inProgress: list.filter(e => !DONE.has(e.status)).length,
          lastActive: list.reduce((a, e) => (e.updatedAt > a ? e.updatedAt : a), ''),
        }
      },
    })
)
