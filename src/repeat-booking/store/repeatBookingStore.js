/**
 * Repeat Booking Flow store.
 *
 * Client details come from the client database (Email_Client_API, VD project)
 * through wf-clients?directory=1: name, location and logo, never the GHL key.
 *
 * The clients started here and their emails live in the shared database
 * (rb_clients and rb_emails.state on foiykssauiqmzawwmdrm, through rb-data),
 * so everyone signed in sees the same roster and the same drafts. load() reads
 * them once per visit; every change is written back, an email's a moment after
 * the last edit so a slider drag is one save, not fifty. Two people editing the
 * same email at once: the later save wins.
 *
 * Before the database, all of this was kept in each browser under
 * 'repeat-booking-v1'. The first load() in a browser that still has that
 * uploads it (see uploadLocal), then never reads it again.
 *
 * Email shape: { id, email (1-3), templateId, status, brief, variations,
 *   selectedVariation, copy, subject, notes, selectedImages, generatedUrls,
 *   editorSettings, renderedHtml, templateLabel, ghlTemplateId, pushedAt,
 *   reviewNotes, createdAt, updatedAt }
 * Status: draft -> ready -> pushed, needs_update when a pushed email changes.
 */

import { create } from 'zustand'
import { authFetch } from '../../lib/session'
import { rbEmail } from '../rbEmails'

const DONE = new Set(['approved', 'pushed'])
const API = '/.netlify/functions/rb-data'
const LOCAL_KEY = 'repeat-booking-v1'
const LOCAL_UPLOADED = 'repeat-booking-v1-uploaded'
const SAVE_DELAY_MS = 700

/* What goes to GHL. Changing any of these on a pushed email makes GHL stale;
   re-saving the same value (opening a page writes back what it read) does not. */
const CONTENT_KEYS = ['variations', 'selectedVariation', 'copy', 'selectedImages', 'generatedUrls', 'renderedHtml']
const changes = (e, patch) => CONTENT_KEYS.some(k => k in patch && JSON.stringify(patch[k] ?? null) !== JSON.stringify(e[k] ?? null))

const uid = () => `rb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`

const blankEmail = (n) => {
  const now = new Date().toISOString()
  return {
    id: uid(), email: Number(n), templateId: rbEmail(n)?.templateId ?? null, status: 'draft',
    brief: '', variations: [], selectedVariation: 0, copy: {}, subject: '', notes: null,
    selectedImages: [], generatedUrls: {}, editorSettings: null, renderedHtml: '',
    templateLabel: '', ghlTemplateId: null, pushedAt: null, reviewNotes: '',
    createdAt: now, updatedAt: now,
  }
}

const fromClientRow = (r) => ({
  id: r.location_id, name: r.client_name, locationId: r.location_id, logoUrl: r.logo_url || '',
  folderUrl: r.folder_url || '', folderId: r.folder_id || '', addedAt: r.created_at,
})

/** A row saved before it carried any state (only the finished HTML) still opens. */
const fromEmailRow = (r) => {
  const s = r.state && typeof r.state === 'object' ? r.state : {}
  if (s.id && s.email) return s
  return { ...blankEmail(r.email_number), id: `rb_db_${r.id}`, status: 'approved',
           renderedHtml: r.rendered_html || '', createdAt: r.updated_at, updatedAt: r.updated_at }
}

async function call(init) {
  const res = await authFetch(API, init)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}
/* While the page is closing, a request only survives with keepalive, which
   the browser allows for bodies up to 64 KB. */
let closing = false
const postJson = (body) => {
  const text = JSON.stringify(body)
  return call({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: text,
                ...(closing && text.length < 60_000 ? { keepalive: true } : {}) })
}

function readLocal() {
  try {
    if (localStorage.getItem(LOCAL_UPLOADED)) return null
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null')
    const st = raw?.state
    return st && (st.clients?.length || Object.keys(st.emails || {}).length) ? st : null
  } catch { return null }
}

/* Per-key debounce: the last edit within SAVE_DELAY_MS is the one saved. */
const timers = new Map()
const queued = new Map()
const failed = new Map()   // saves that errored, kept so Retry can send them again
let loading = null

export const useRepeatBookingStore = create((set, get) => {
  async function run(key, fn) {
    queued.delete(key); timers.delete(key)
    set(s => ({ saving: s.saving + 1 }))
    try { await fn(); failed.delete(key); if (!failed.size) set({ saveError: null }) }
    catch (e) { failed.set(key, fn); set({ saveError: e.message }) }
    finally { set(s => ({ saving: s.saving - 1 })) }
  }
  function queue(key, fn, delay = SAVE_DELAY_MS) {
    clearTimeout(timers.get(key))
    queued.set(key, fn)
    timers.set(key, setTimeout(() => run(key, fn), delay))
  }

  const saveClientNow = (client, isNew = false) => postJson({ kind: 'client', client: { ...client, isNew } })
  const saveEmailNow = (clientId, emailId) => {
    const client = get().getClient(clientId)
    const email = get().getEmail(clientId, emailId)
    if (!client || !email) return Promise.resolve()
    return postJson({ kind: 'email', clientName: client.name, locationId: client.locationId, email })
  }
  const queueEmail = (clientId, emailId, delay) => queue(`e:${emailId}`, () => saveEmailNow(clientId, emailId), delay)

  /** Anything this browser kept before the database: clients the database
      lacks, and emails it lacks or holds an older copy of. */
  async function uploadLocal(local, clients, emails) {
    const byId = new Map(clients.map(c => [c.id, c]))
    for (const c of local.clients || []) {
      const db = byId.get(c.id)
      if (!db || (!db.folderUrl && c.folderUrl)) await saveClientNow({ ...db, ...c }, !db)
    }
    const names = new Map([...clients, ...(local.clients || [])].map(c => [c.id, c]))
    for (const [clientId, list] of Object.entries(local.emails || {})) {
      const client = names.get(clientId)
      if (!client) continue
      for (const e of list || []) {
        const db = (emails[clientId] || []).find(x => x.email === e.email)
        if (!db || db.backfilled || (e.updatedAt || '') > (db.updatedAt || '')) {
          await postJson({ kind: 'email', clientName: client.name, locationId: client.locationId, email: e })
        }
      }
    }
  }

  return {
    clients:        [],       // [{ id (= locationId), name, locationId, logoUrl, folderUrl, folderId, addedAt }]
    emails:         {},       // { [clientId]: [email, …] }
    loaded:         false,
    loadError:      null,
    saving:         0,
    saveError:      null,
    directory:      null,     // every client in the client database, once fetched
    directoryError: null,

    load: () => {
      if (loading) return loading
      if (get().saving || queued.size || failed.size) return Promise.resolve()   // a refresh now would show the old copy
      loading = get()._load().finally(() => { loading = null })
      return loading
    },

    _load: async () => {
      set({ loadError: null })
      try {
        const read = async () => {
          const data = await call()
          const clients = (data.clients || []).map(fromClientRow)
          const emails = {}
          for (const r of data.emails || []) {
            const id = r.location_id || clients.find(c => c.name === r.client_name)?.id
            if (id) (emails[id] ||= []).push(fromEmailRow(r))
          }
          return { clients, emails }
        }
        let { clients, emails } = await read()
        const local = readLocal()
        if (local) {
          await uploadLocal(local, clients, emails)
          try { localStorage.setItem(LOCAL_UPLOADED, new Date().toISOString()) } catch { /* private mode */ }
          ;({ clients, emails } = await read())
        }
        set({ clients, emails, loaded: true })
      } catch (e) {
        set({ loadError: e.message, loaded: true })
      }
    },

    /** Sends again every save that failed. */
    retry: () => Promise.all([...failed.entries()].map(([k, fn]) => run(k, fn))),

    /** Sends whatever is waiting now, rather than after the delay. */
    flush: () => Promise.all([...queued.keys()].map(k => { clearTimeout(timers.get(k)); return run(k, queued.get(k)) })),

    fetchDirectory: async () => {
      if (get().directory) return
      set({ directoryError: null })
      try {
        const res  = await authFetch('/.netlify/functions/wf-clients?directory=1')
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
        set({ directory: data.directory || [] })
      } catch (e) { set({ directoryError: e.message }) }
    },

    addClient: ({ name, locationId, logoUrl }) => {
      if (!get().clients.some(c => c.locationId === locationId)) {
        const client = { id: locationId, name, locationId, logoUrl: logoUrl || '', folderUrl: '', folderId: '', addedAt: new Date().toISOString() }
        set(s => ({ clients: [...s.clients, client].sort((a, b) => a.name.localeCompare(b.name)) }))
        queue(`c:${locationId}`, () => saveClientNow(client, true), 0)
      }
      return locationId
    },

    updateClient: (id, patch) => {
      set(s => ({ clients: s.clients.map(c => (c.id === id ? { ...c, ...patch } : c)) }))
      queue(`c:${id}`, () => saveClientNow(get().getClient(id)))
    },

    getClient: (id) => get().clients.find(c => c.id === id) || null,
    getEmails: (clientId) => get().emails[clientId] || [],
    getEmail:  (clientId, emailId) => (get().emails[clientId] || []).find(e => e.id === emailId) || null,

    /** One email per position per client: opening a row that already has one returns it. */
    addEmail: (clientId, n) => {
      const existing = (get().emails[clientId] || []).find(e => e.email === Number(n))
      if (existing) return existing.id
      const email = blankEmail(n)
      set(s => ({ emails: { ...s.emails, [clientId]: [...(s.emails[clientId] || []), email] } }))
      queueEmail(clientId, email.id, 0)
      return email.id
    },

    updateEmail: (clientId, emailId, patch) => {
      set(s => ({
        emails: {
          ...s.emails,
          [clientId]: (s.emails[clientId] || []).map(e => {
            if (e.id !== emailId) return e
            const status = patch.status
              || (e.status === 'pushed' && changes(e, patch) ? 'needs_update' : e.status)
            const { backfilled, ...rest } = e   // an edit makes it a real draft
            return { ...rest, ...patch, status, updatedAt: new Date().toISOString() }
          }),
        },
      }))
      queueEmail(clientId, emailId)
    },

    /** Slider positions: saved with the email, never a status change. */
    saveEditorSettings: (clientId, emailId, editorSettings) => {
      set(s => ({
        emails: {
          ...s.emails,
          [clientId]: (s.emails[clientId] || []).map(e => (e.id === emailId ? { ...e, editorSettings } : e)),
        },
      }))
      queueEmail(clientId, emailId)
    },

    counts: (clientId) => {
      const list = get().emails[clientId] || []
      return {
        done:       list.filter(e => DONE.has(e.status)).length,
        inProgress: list.filter(e => !DONE.has(e.status)).length,
        lastActive: list.reduce((a, e) => (e.updatedAt > a ? e.updatedAt : a), ''),
      }
    },
  }
})

/* Closing the tab inside the delay would drop the last edit: send it first,
   and have the browser ask before leaving while a save is still out. */
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => { closing = true; if (queued.size) useRepeatBookingStore.getState().flush() })
  window.addEventListener('beforeunload', (e) => {
    if (queued.size || useRepeatBookingStore.getState().saving) { e.preventDefault(); e.returnValue = '' }
  })
}
