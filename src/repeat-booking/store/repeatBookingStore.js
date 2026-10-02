/**
 * Repeat Booking Flow store.
 *
 * Client details come from the client database (Email_Client_API, VD project)
 * through wf-clients?directory=1: name, location and logo, never the GHL key.
 *
 * The clients started here and their emails are kept in this browser only,
 * keyed by GHL location ID, until the flow has tables of its own. Another
 * browser or teammate does not see them yet.
 *
 * Email shape: { id, email (1-3), templateId, status, brief, variations,
 *   selectedVariation, copy, subject, notes, selectedImages, generatedUrls,
 *   editorSettings, renderedHtml, templateLabel, ghlTemplateId, pushedAt,
 *   reviewNotes, createdAt, updatedAt }
 * Status: draft -> ready -> pushed, needs_update when a pushed email changes.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authFetch } from '../../lib/session'
import { rbEmail } from '../rbEmails'

const DONE = new Set(['approved', 'pushed'])

/* What goes to GHL. Changing any of these on a pushed email makes GHL stale;
   re-saving the same value (opening a page writes back what it read) does not. */
const CONTENT_KEYS = ['variations', 'selectedVariation', 'copy', 'selectedImages', 'generatedUrls', 'renderedHtml']
const changes = (e, patch) => CONTENT_KEYS.some(k => k in patch && JSON.stringify(patch[k] ?? null) !== JSON.stringify(e[k] ?? null))

const uid = () => `rb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`

export const useRepeatBookingStore = create(persist((set, get) => ({
  clients:        [],       // [{ id (= locationId), name, locationId, logoUrl, folderUrl, folderId, addedAt }]
  emails:         {},       // { [clientId]: [email, …] }
  directory:      null,     // every client in the client database, once fetched
  directoryError: null,

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
    }
    return locationId
  },

  updateClient: (id, patch) => set(s => ({ clients: s.clients.map(c => (c.id === id ? { ...c, ...patch } : c)) })),

  getClient: (id) => get().clients.find(c => c.id === id) || null,
  getEmails: (clientId) => get().emails[clientId] || [],
  getEmail:  (clientId, emailId) => (get().emails[clientId] || []).find(e => e.id === emailId) || null,

  /** One email per position per client: opening a row that already has one returns it. */
  addEmail: (clientId, n) => {
    const existing = (get().emails[clientId] || []).find(e => e.email === Number(n))
    if (existing) return existing.id
    const now = new Date().toISOString()
    const email = {
      id: uid(), email: Number(n), templateId: rbEmail(n)?.templateId ?? null, status: 'draft',
      brief: '', variations: [], selectedVariation: 0, copy: {}, subject: '', notes: null,
      selectedImages: [], generatedUrls: {}, editorSettings: null, renderedHtml: '',
      templateLabel: '', ghlTemplateId: null, pushedAt: null, reviewNotes: '',
      createdAt: now, updatedAt: now,
    }
    set(s => ({ emails: { ...s.emails, [clientId]: [...(s.emails[clientId] || []), email] } }))
    return email.id
  },

  updateEmail: (clientId, emailId, patch) => set(s => ({
    emails: {
      ...s.emails,
      [clientId]: (s.emails[clientId] || []).map(e => {
        if (e.id !== emailId) return e
        const status = patch.status
          || (e.status === 'pushed' && changes(e, patch) ? 'needs_update' : e.status)
        return { ...e, ...patch, status, updatedAt: new Date().toISOString() }
      }),
    },
  })),

  /** Slider positions: saved with the email, never a status change. */
  saveEditorSettings: (clientId, emailId, editorSettings) => set(s => ({
    emails: {
      ...s.emails,
      [clientId]: (s.emails[clientId] || []).map(e => (e.id === emailId ? { ...e, editorSettings } : e)),
    },
  })),

  counts: (clientId) => {
    const list = get().emails[clientId] || []
    return {
      done:       list.filter(e => DONE.has(e.status)).length,
      inProgress: list.filter(e => !DONE.has(e.status)).length,
      lastActive: list.reduce((a, e) => (e.updatedAt > a ? e.updatedAt : a), ''),
    }
  },
}), {
  name: 'repeat-booking-v1',
  partialize: (s) => ({ clients: s.clients, emails: s.emails }),
}))
