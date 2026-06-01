/**
 * campaignStore.js
 * Global state for the active campaign being built.
 * Uses Zustand with localStorage persistence — state survives navigation
 * and is only cleared when the user explicitly clicks "+ New Campaign".
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const INITIAL_STATE = {
  // Step 1 — client
  selectedClient: null,

  // Step 1 — GHL template (URL pasted by user, ID + locationId extracted)
  templateUrl: '',
  templateId:  '',
  locationId:  '',

  // Step 2 — free-text prompt sent directly to n8n
  prompt: '',

  // Step 3 — all variations returned by n8n (array of 3)
  variations: [],
  selectedVariation: 0,

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
  selectedImages: [],

  // Step 5 — rendered HTML
  renderedHtml: '',

  // Step 6 — approval
  approvalStatus: 'pending',
  approvalNotes:  '',

  // Step 7 — push result
  ghlPushResult: null,

  // UI state — NOT persisted (always reset on page load)
  currentStep:  1,
  isGenerating: false,
  isSaving:     false,
  error:        null,
}

export const useCampaignStore = create(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      // Actions
      setClient:         (client)   => set({ selectedClient: client }),
      setTemplateUrl:    (url)      => {
        // Extract templateId (24-char hex) and locationId from GHL URL
        const templateMatch  = url.match(/([a-f0-9]{24})/i)
        const locationMatch  = url.match(/\/location\/([A-Za-z0-9]+)/)
        set({
          templateUrl: url,
          templateId:  templateMatch ? templateMatch[1] : '',
          locationId:  locationMatch ? locationMatch[1] : '',
        })
      },
      setPrompt:         (prompt)   => set({ prompt }),
      setVariations:     (variations) => set({
        variations,
        selectedVariation: 0,
        generatedCopy: variations[0] || {},
      }),
      pickVariation:     (index)    => set((s) => ({
        selectedVariation: index,
        generatedCopy: { ...s.variations[index] },
      })),
      setGeneratedCopy:  (copy)     => set({ generatedCopy: copy }),
      setSelectedImages: (images)   => set({ selectedImages: images }),
      setRenderedHtml:   (html)     => set({ renderedHtml: html }),
      setApproval:       (status, notes) => set({ approvalStatus: status, approvalNotes: notes }),
      setGhlPushResult:  (result)   => set({ ghlPushResult: result }),
      setStep:           (step)     => set({ currentStep: step }),
      setGenerating:     (val)      => set({ isGenerating: val }),
      setSaving:         (val)      => set({ isSaving: val }),
      setError:          (err)      => set({ error: err }),

      // Only called when user explicitly clicks "+ New Campaign"
      resetCampaign: () => set(INITIAL_STATE),
    }),
    {
      name: 'hgm-campaign-v2',  // localStorage key (v2 clears old stale client config)
      // Don't persist transient UI state
      partialize: (state) => {
        const { isGenerating, isSaving, error, ...rest } = state
        return rest
      },
    }
  )
)
