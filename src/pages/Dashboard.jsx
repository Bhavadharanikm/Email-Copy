/**
 * Dashboard
 * Landing page — shows a quick intro and recent activity placeholder.
 */
import { useNavigate } from 'react-router-dom'
import { useCampaignStore } from '../store/campaignStore'

export default function Dashboard() {
  const navigate = useNavigate()
  const resetCampaign = useCampaignStore((s) => s.resetCampaign)

  function startNew() {
    resetCampaign()
    navigate('/campaign/new')
  }

  return (
    <div className="max-w-2xl mx-auto text-center space-y-8 pt-12">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Email Production Studio</h1>
        <p className="text-gray-500 mt-2">
          Generate, preview, and publish on-brand emails for all 40 clients — powered by Claude AI.
        </p>
      </div>

      <button onClick={startNew} className="btn-primary px-8 py-3 text-base">
        + Start New Campaign
      </button>

      {/* Workflow overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left pt-4">
        {[
          { step: '1', label: 'Select Client',    icon: '🏢' },
          { step: '2', label: 'Write Brief',       icon: '📝' },
          { step: '3', label: 'Claude Generates',  icon: '✨' },
          { step: '4', label: 'Pick Images',       icon: '🖼️' },
          { step: '5', label: 'Live Preview',      icon: '👁️' },
          { step: '6', label: 'Team Approves',     icon: '✅' },
          { step: '7', label: 'Push to GHL',       icon: '🚀' },
          { step: '8', label: 'Chat Notification', icon: '💬' },
        ].map(({ step, label, icon }) => (
          <div key={step} className="card flex items-center gap-3">
            <span className="text-xl">{icon}</span>
            <div>
              <p className="text-xs text-gray-400">Step {step}</p>
              <p className="text-sm font-medium">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
