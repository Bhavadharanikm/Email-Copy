import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useCampaignStore } from '../store/campaignStore'

export default function Layout() {
  const resetCampaign = useCampaignStore((s) => s.resetCampaign)
  const navigate = useNavigate()

  function handleNewCampaign() {
    resetCampaign()
    navigate('/campaign/new')
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <NavLink to="/" className="text-xl font-bold text-brand-700 tracking-tight">
          Email Production Studio
        </NavLink>
        <button onClick={handleNewCampaign} className="btn-primary text-sm">
          + New Campaign
        </button>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        <Outlet />
      </main>

      <footer className="text-center text-xs text-gray-400 py-4">
        Hidden Gem Media · Email Production Studio
      </footer>
    </div>
  )
}
