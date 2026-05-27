/**
 * NewCampaign
 * 7-step wizard that walks through the full email production flow.
 * Steps: Client → Brief → Generate Copy → Pick Images → Preview → Approve → Done
 */
import { useNavigate } from 'react-router-dom'
import { useCampaignStore } from '../store/campaignStore'
import { useCopyGeneration } from '../hooks/useCopyGeneration'

import ClientSelector    from '../components/ClientSelector'
import CampaignBriefForm from '../components/CampaignBriefForm'
import CopyEditor        from '../components/CopyEditor'
import ImagePicker       from '../components/ImagePicker'
import TemplatePreview   from '../components/TemplatePreview'
import ApprovalPanel     from '../components/ApprovalPanel'

const STEPS = [
  { id: 1, label: 'Client'   },
  { id: 2, label: 'Brief'    },
  { id: 3, label: 'Copy'     },
  { id: 4, label: 'Images'   },
  { id: 5, label: 'Preview'  },
  { id: 6, label: 'Approve'  },
]

export default function NewCampaign() {
  const navigate = useNavigate()
  const { generate } = useCopyGeneration()

  const {
    currentStep, setStep,
    selectedClient, brief,
    error,
  } = useCampaignStore((s) => ({
    currentStep:    s.currentStep,
    setStep:        s.setStep,
    selectedClient: s.selectedClient,
    brief:          s.brief,
    error:          s.error,
  }))

  async function handleBriefSubmit() {
    // useCopyGeneration handles: calling n8n, polling if async, updating store, advancing step
    await generate({ client: selectedClient, brief })
  }

  function canProceed() {
    if (currentStep === 1) return !!selectedClient
    return true
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
                currentStep === s.id  ? 'bg-brand-700 text-white' :
                currentStep  > s.id  ? 'bg-brand-100 text-brand-700 cursor-pointer hover:bg-brand-200' :
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
        {currentStep === 1 && (
          <>
            <h2 className="text-lg font-semibold mb-4">Select a Client</h2>
            <ClientSelector />
            <div className="mt-5 flex justify-end">
              <button
                disabled={!canProceed()}
                onClick={() => setStep(2)}
                className="btn-primary"
              >
                Next: Campaign Brief →
              </button>
            </div>
          </>
        )}

        {currentStep === 2 && (
          <>
            <h2 className="text-lg font-semibold mb-4">Campaign Brief</h2>
            <CampaignBriefForm onNext={handleBriefSubmit} />
            <div className="mt-3">
              <button onClick={() => setStep(1)} className="btn-secondary text-sm">← Back</button>
            </div>
          </>
        )}

        {currentStep === 3 && (
          <>
            <h2 className="text-lg font-semibold mb-4">Edit Generated Copy</h2>
            <CopyEditor />
            <div className="mt-5 flex justify-between">
              <button onClick={() => setStep(2)} className="btn-secondary text-sm">← Back</button>
              <button onClick={() => setStep(4)} className="btn-primary">Next: Pick Images →</button>
            </div>
          </>
        )}

        {currentStep === 4 && (
          <>
            <h2 className="text-lg font-semibold mb-4">Pick Images</h2>
            <ImagePicker />
            <div className="mt-5 flex justify-between">
              <button onClick={() => setStep(3)} className="btn-secondary text-sm">← Back</button>
              <button onClick={() => setStep(5)} className="btn-primary">Next: Preview →</button>
            </div>
          </>
        )}

        {currentStep === 5 && (
          <>
            <h2 className="text-lg font-semibold mb-4">Live Preview</h2>
            <TemplatePreview />
            <div className="mt-5 flex justify-between">
              <button onClick={() => setStep(4)} className="btn-secondary text-sm">← Back</button>
              <button onClick={() => setStep(6)} className="btn-primary">Looks Good — Approve →</button>
            </div>
          </>
        )}

        {currentStep === 6 && (
          <>
            <h2 className="text-lg font-semibold mb-4">Approve & Push</h2>
            <ApprovalPanel />
            <div className="mt-3">
              <button onClick={() => setStep(5)} className="btn-secondary text-sm">← Back to Preview</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
