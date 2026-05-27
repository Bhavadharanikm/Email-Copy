/**
 * NewCampaign — simplified wizard
 * Steps: 1 Prompt → 2 Copy → 3 Images → 4 Preview → 5 Approve
 */
import { useCampaignStore } from '../store/campaignStore'
import { useCopyGeneration } from '../hooks/useCopyGeneration'

import PromptForm      from '../components/PromptForm'
import CopyEditor      from '../components/CopyEditor'
import ImagePicker     from '../components/ImagePicker'
import TemplatePreview from '../components/TemplatePreview'
import ApprovalPanel   from '../components/ApprovalPanel'

const STEPS = [
  { id: 1, label: 'Brief'   },
  { id: 2, label: 'Copy'    },
  { id: 3, label: 'Images'  },
  { id: 4, label: 'Preview' },
  { id: 5, label: 'Approve' },
]

export default function NewCampaign() {
  const { generate } = useCopyGeneration()

  const { currentStep, setStep, selectedClient, prompt, error } = useCampaignStore((s) => ({
    currentStep:    s.currentStep,
    setStep:        s.setStep,
    selectedClient: s.selectedClient,
    prompt:         s.prompt,
    error:          s.error,
  }))

  async function handleGenerate() {
    await generate({ client: selectedClient, prompt })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Step progress bar */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1 flex-1">
            <button
              onClick={() => currentStep > s.id && setStep(s.id)}
              className={[
                'step-badge shrink-0',
                currentStep === s.id ? 'bg-brand-700 text-white' :
                currentStep  > s.id ? 'bg-brand-100 text-brand-700 cursor-pointer hover:bg-brand-200' :
                                      'bg-gray-100 text-gray-400 cursor-default',
              ].join(' ')}
            >
              {s.id}
            </button>
            <span className={[
              'text-xs hidden sm:inline truncate',
              currentStep === s.id ? 'text-brand-700 font-semibold' : 'text-gray-400',
            ].join(' ')}>{s.label}</span>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-200 mx-1" />}
          </div>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step content */}
      <div className="card">

        {/* ── Step 1: Client + Prompt ── */}
        {currentStep === 1 && (
          <>
            <h2 className="text-lg font-semibold mb-5">Campaign Brief</h2>
            <PromptForm onGenerate={handleGenerate} />
          </>
        )}

        {/* ── Step 2: Edit copy variations ── */}
        {currentStep === 2 && (
          <>
            <h2 className="text-lg font-semibold mb-4">Generated Copy</h2>
            <CopyEditor />
            <div className="mt-5 flex justify-between">
              <button onClick={() => setStep(1)} className="btn-secondary text-sm">← Back</button>
              <button onClick={() => setStep(3)} className="btn-primary">Next: Pick Images →</button>
            </div>
          </>
        )}

        {/* ── Step 3: Images ── */}
        {currentStep === 3 && (
          <>
            <h2 className="text-lg font-semibold mb-4">Pick Images</h2>
            <ImagePicker />
            <div className="mt-5 flex justify-between">
              <button onClick={() => setStep(2)} className="btn-secondary text-sm">← Back</button>
              <button onClick={() => setStep(4)} className="btn-primary">Next: Preview →</button>
            </div>
          </>
        )}

        {/* ── Step 4: Preview ── */}
        {currentStep === 4 && (
          <>
            <h2 className="text-lg font-semibold mb-4">Live Preview</h2>
            <TemplatePreview />
            <div className="mt-5 flex justify-between">
              <button onClick={() => setStep(3)} className="btn-secondary text-sm">← Back</button>
              <button onClick={() => setStep(5)} className="btn-primary">Looks Good — Approve →</button>
            </div>
          </>
        )}

        {/* ── Step 5: Approve & push ── */}
        {currentStep === 5 && (
          <>
            <h2 className="text-lg font-semibold mb-4">Approve & Push to GHL</h2>
            <ApprovalPanel />
            <div className="mt-3">
              <button onClick={() => setStep(4)} className="btn-secondary text-sm">← Back to Preview</button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
