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

  // Step 1 — GHL folder (URL pasted by user, folderId extracted)
  folderUrl: '',
  folderId:  '',

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

  // Step 4b — AI template recommendation
  headerStyle:      1,   // 1–4
  imageStyle:       2,   // 1–4
  aiReasoning:      '',
  aiRecommendDone:  false,

  // Step 4c — selected template label (e.g. "Week 1", "Week 2")
  templateLabel: '',

  // Step 5 — rendered HTML
  renderedHtml:   '',
  imageGenHtml:   '',   // html2image.net assembled email — persists across nav

  // Step 6 — approval
  approvalStatus: 'pending',
  approvalNotes:  '',

  // Step 7 — push result
  ghlPushResult: null,

  // Footer data fetched from brand board sheet
  clientFooter: null,

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
      setClient:         (client)   => set((s) => ({
        selectedClient: client,
        // Seed locationId from the sheet so images load without needing a template URL
        locationId: s.locationId || client?.ghl?.locationId || '',
      })),
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
      setFolderUrl:      (url)      => {
        // Extract folderId from GHL folder URL
        // Handles: ?folderId=abc123  OR  /folders/abc123  OR  /folder/abc123
        const qsMatch      = url.match(/[?&]folderId=([A-Za-z0-9_-]+)/)
        const pathMatch    = url.match(/\/folders?\/([A-Za-z0-9_-]+)/)
        const folderId     = (qsMatch || pathMatch)?.[1] || ''
        // Also extract locationId from folder URL as fallback
        const locationMatch = url.match(/\/location\/([A-Za-z0-9]+)/)
        const locFromFolder = locationMatch?.[1] || ''
        set((s) => ({
          folderUrl: url,
          folderId,
          // Use locationId from folder URL only if no template URL has set it yet
          locationId: s.locationId || locFromFolder,
        }))
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
      setTemplateStyle:  ({ headerStyle, imageStyle, aiReasoning, boldedCopy }) =>
        set((s) => ({
          headerStyle,
          imageStyle,
          aiReasoning,
          aiRecommendDone: true,
          // Merge bolded copy fields over the existing generatedCopy
          generatedCopy: {
            ...s.generatedCopy,
            ...(boldedCopy || {}),
          },
        })),
      setHeaderStyle:    (v) => set({ headerStyle: v }),
      setImageStyle:     (v) => set({ imageStyle: v }),
      setTemplateLabel:  (label)    => set({ templateLabel: label }),
      setRenderedHtml:   (html)     => set({ renderedHtml: html }),
      setImageGenHtml:   (html)     => set({ imageGenHtml: html }),
      setApproval:       (status, notes) => set({ approvalStatus: status, approvalNotes: notes }),
      setGhlPushResult:  (result)   => set({ ghlPushResult: result }),
      setClientFooter:   (footer)   => set({ clientFooter: footer }),
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
