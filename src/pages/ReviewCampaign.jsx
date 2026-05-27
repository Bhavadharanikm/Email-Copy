/**
 * ReviewCampaign (placeholder)
 * Future: shareable review link so a client or teammate can approve
 * without needing to log in and re-run the wizard.
 * For now, redirects back to the dashboard.
 */
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export default function ReviewCampaign() {
  const { id } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    // TODO: load campaign by ID from persistent storage / Netlify Blobs
    console.log('Review campaign:', id)
  }, [id])

  return (
    <div className="max-w-lg mx-auto text-center py-20 space-y-4">
      <p className="text-2xl">🔗</p>
      <h2 className="text-xl font-semibold">Shareable Review Links</h2>
      <p className="text-gray-500 text-sm">
        Coming soon — approve or reject a campaign from a link without needing to
        open the full studio.
      </p>
      <button onClick={() => navigate('/')} className="btn-secondary text-sm">
        ← Back to Dashboard
      </button>
    </div>
  )
}
