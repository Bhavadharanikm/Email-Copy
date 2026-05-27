/**
 * ClientSelector
 * Step 1 — choose which of the 40 agency clients to work on.
 * Fetches the client list from the /clients Netlify function.
 */
import { useEffect, useState } from 'react'
import { useCampaignStore } from '../store/campaignStore'
import { fetchClients } from '../lib/api'

const MOCK_CLIENTS = [
  { id: 'c1', name: 'FLOHOM',               brand: { primaryColor: '#2D6A4F', voice: 'Modern, design-forward, aspirational. Speaks to homeowners who value style and simplicity.' }, ghl: { locationId: 'loc_001' }, googleDrive: { folderId: 'drv_001' } },
  { id: 'c2', name: 'The Cohost Company',   brand: { primaryColor: '#1A4B8C', voice: 'Professional, trustworthy, friendly. Speaks to Airbnb hosts looking to scale their business.' }, ghl: { locationId: 'loc_002' }, googleDrive: { folderId: 'drv_002' } },
  { id: 'c3', name: 'Evergreen Cabins',     brand: { primaryColor: '#3A5A40', voice: 'Warm, rustic, nature-inspired. Speaks to couples and families seeking a peaceful outdoor escape.' }, ghl: { locationId: 'loc_003' }, googleDrive: { folderId: 'drv_003' } },
]

export default function ClientSelector() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const { selectedClient, setClient } = useCampaignStore((s) => ({
    selectedClient: s.selectedClient,
    setClient: s.setClient,
  }))

  useEffect(() => {
    fetchClients()
      .then(setClients)
      .catch(() => {
        // Fallback mock data for local Vite dev (no Netlify functions running)
        setClients(MOCK_CLIENTS)
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <p className="text-gray-500">Loading clients…</p>

  return (
    <div className="space-y-4">
      <input
        type="search"
        placeholder="Search clients…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[480px] overflow-y-auto pr-1">
        {filtered.map((client) => (
          <button
            key={client.id}
            onClick={() => setClient(client)}
            className={[
              'text-left p-4 rounded-xl border-2 transition-all',
              selectedClient?.id === client.id
                ? 'border-brand-700 bg-brand-50 shadow-sm'
                : 'border-gray-200 hover:border-brand-300 bg-white',
            ].join(' ')}
          >
            <p className="font-semibold text-sm">{client.name}</p>
            <p className="text-xs text-gray-400 mt-1 truncate">
              {client.ghl.locationId || 'No GHL ID set'}
            </p>
          </button>
        ))}

        {filtered.length === 0 && (
          <p className="col-span-3 text-gray-400 text-sm py-6 text-center">
            No clients match "{search}"
          </p>
        )}
      </div>
    </div>
  )
}
