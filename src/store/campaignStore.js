/**
 * campaignStore.js
 * Global state for the active campaign being built.
 * Uses Zustand — no Provider needed, import useCampaignStore anywhere.
 */
import { create } from 'zustand'

const INITIAL_STATE = {
  // Step 1 — client
  selectedClient: null,       // full client object from clients.json

  // Step 2 — free-text prompt sent directly to n8n
  prompt: '',

  // Step 3 — all variations returned by n8n (array of 3)
  variations: [],
  selectedVariation: 0,   // index of the variation the team picked

  // The active copy — starts as variation[0], editable after selection
  generatedCopy: {
    subjectLine:     '',
    previewText:     '',
    headlineText:    '',
    subhead:         '',
    bodyText:        '',
    bodyBlock2Title: '',
    bodyBlock2:      '',
    ctaText:         '',
    ctaUrl:          '',
    closingLine:     '',
  },

  // Step 4 — images
  selectedImages: [],         // array of { id, name, url, thumbnailUrl }

  // Step 5 — rendered HTML (template + copy + images merged)
  renderedHtml: '',

  // Step 6 — approval
  approvalStatus: 'pending',  // 'pending' | 'approved' | 'rejected'
  approvalNotes:  '',

  // Step 7 — push result
  ghlPushResult: null,        // { success, emailId, previewUrl }

  // UI state
  currentStep:  1,            // wizard step 1–7
  isGenerating: false,
  isSaving:     false,
  error:        null,
}

export const useCampaignStore = create((set) => ({
  ...INITIAL_STATE,

  // Actions
  setClient:        (client)  => set({ selectedClient: client }),
  setPrompt:        (prompt)  => set({ prompt }),
  setVariations:    (variations) => set({
    variations,
    selectedVariation: 0,
    generatedCopy: variations[0] || {},
  }),
  pickVariation:    (index) => set((s) => ({
    selectedVariation: index,
    generatedCopy: { ...s.variations[index] },
  })),
  setGeneratedCopy: (copy)    => set({ generatedCopy: copy }),
  setSelectedImages:(images)  => set({ selectedImages: images }),
  setRenderedHtml:  (html)    => set({ renderedHtml: html }),
  setApproval:      (status, notes) => set({ approvalStatus: status, approvalNotes: notes }),
  setGhlPushResult: (result)  => set({ ghlPushResult: result }),
  setStep:          (step)    => set({ currentStep: step }),
  setGenerating:    (val)     => set({ isGenerating: val }),
  setSaving:        (val)     => set({ isSaving: val }),
  setError:         (err)     => set({ error: err }),

  resetCampaign: () => set(INITIAL_STATE),
}))
