/**
 * PromptForm
 * Step 1 — select client + write the prompt that goes directly to n8n.
 * The prompt format matches what your n8n workflow already expects.
 */
import { useState, useEffect } from 'react'
import { useCampaignStore } from '../store/campaignStore'
import { fetchClients } from '../lib/api'

const PLACEHOLDER = `Client Name: Evergreen Cabins
Theme: "Summer Weekends are Going Fast"
Target audience: Couples looking for a romantic escape`

export default function PromptForm({ onGenerate }) {
  const [clients, setClients]   = useState([])
  const [loading, setLoading]   = useState(true)

  const { selectedClient, setClient, prompt, setPrompt } = useCampaignStore((s) => ({
    selectedClient: s.selectedClient,
    setClient:      s.setClient,
    prompt:         s.prompt,
    setPrompt:      s.setPrompt,
  }))

  useEffect(() => {
    fetchClients()
      .then(setClients)
      .catch(() => setClients(MOCK_CLIENTS))
      .finally(() => setLoading(false))
  }, [])

  // Auto-fill client name at top of prompt when client is selected
  function handleClientChange(e) {
    const client = clients.find((c) => c.id === e.target.value)
    if (!client) return
    setClient(client)
    // Prepend client name if prompt is empty or only has a previous client name line
    setPrompt(`Client Name: ${client.name}\n`)
  }

  const canGenerate = selectedClient && prompt.trim().length > 10

  return (
    <div className="space-y-5">

      {/* Client dropdown */}
      <div>
        <label className="block text-sm font-medium mb-1">Client *</label>
        {loading ? (
          <p className="text-sm text-gray-400">Loading clients…</p>
        ) : (
          <select
            value={selectedClient?.id || ''}
            onChange={handleClientChange}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white"
          >
            <option value="">Select a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
        {/* Show brand voice as context */}
        {selectedClient?.brand?.voice && (
          <p className="text-xs text-brand-700 mt-1.5 italic px-1">
            Brand voice: {selectedClient.brand.voice.slice(0, 90)}…
          </p>
        )}
      </div>

      {/* Prompt textarea */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Prompt
          <span className="ml-2 text-xs text-gray-400 font-normal">sent directly to your n8n workflow</span>
        </label>
        <textarea
          rows={6}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={PLACEHOLDER}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none font-mono"
        />
        <p className="text-xs text-gray-400 mt-1">
          Use the same format your n8n workflow expects. Client name is pre-filled when you select above.
        </p>
      </div>

      <button
        onClick={onGenerate}
        disabled={!canGenerate}
        className="btn-primary w-full justify-center py-3 text-base"
      >
        Generate Copy with n8n →
      </button>
    </div>
  )
}

const MOCK_CLIENTS = [
  { id: 'c1', name: 'FLOHOM',             brand: { primaryColor: '#2D6A4F', voice: 'Modern, design-forward, aspirational. Speaks to homeowners who value style and simplicity.' }, ghl: { locationId: 'loc_001' }, googleDrive: { folderId: 'drv_001' } },
  { id: 'c2', name: 'The Cohost Company', brand: { primaryColor: '#1A4B8C', voice: 'Professional, trustworthy, friendly. Speaks to Airbnb hosts looking to scale their business.' }, ghl: { locationId: 'loc_002' }, googleDrive: { folderId: 'drv_002' } },
  { id: 'c3', name: 'Evergreen Cabins',   brand: { primaryColor: '#3A5A40', voice: 'Warm, rustic, nature-inspired. Speaks to couples and families seeking a peaceful outdoor escape.' }, ghl: { locationId: 'loc_003' }, googleDrive: { folderId: 'drv_003' } },
]
