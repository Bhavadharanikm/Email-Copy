/**
 * CampaignBriefForm
 * Step 2 — fill in the campaign brief that guides Claude's copy generation.
 */
import { useState } from 'react'
import { useCampaignStore } from '../store/campaignStore'

const EMAIL_TYPES = [
  'Promotional',
  'Newsletter',
  'Event Announcement',
  'Seasonal Campaign',
  'Re-engagement',
  'Welcome',
  'Post-stay Follow-up',
]

const TONE_OPTIONS = [
  'Warm & Inviting',
  'Elegant & Refined',
  'Playful & Fun',
  'Urgent & Exciting',
  'Soft & Romantic',
  'Professional & Direct',
]

export default function CampaignBriefForm({ onNext }) {
  const { brief, setBrief, selectedClient } = useCampaignStore((s) => ({
    brief: s.brief,
    setBrief: s.setBrief,
    selectedClient: s.selectedClient,
  }))

  const [form, setForm] = useState(brief)
  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  function handleSubmit(e) {
    e.preventDefault()
    setBrief(form)
    onNext()
  }

  const isValid = form.emailType && form.goal

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Show selected client as context */}
      {selectedClient && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 text-sm text-brand-900">
          Client: <strong>{selectedClient.name}</strong>
          {selectedClient.brand?.voice && (
            <p className="text-xs text-brand-700 mt-1 italic">
              Brand voice: {selectedClient.brand.voice.slice(0, 100)}…
            </p>
          )}
        </div>
      )}

      {/* Email type */}
      <div>
        <label className="block text-sm font-medium mb-1">Email Type *</label>
        <select
          value={form.emailType}
          onChange={(e) => update('emailType', e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
          required
        >
          <option value="">Select a type…</option>
          {EMAIL_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      {/* Goal */}
      <div>
        <label className="block text-sm font-medium mb-1">Campaign Goal *</label>
        <input
          type="text"
          value={form.goal}
          onChange={(e) => update('goal', e.target.value)}
          placeholder="e.g. Drive bookings for Valentine's weekend"
          className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
          required
        />
      </div>

      {/* Tone */}
      <div>
        <label className="block text-sm font-medium mb-1">Tone</label>
        <div className="flex flex-wrap gap-2">
          {TONE_OPTIONS.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => update('tone', t)}
              className={[
                'px-3 py-1.5 rounded-full text-xs border transition-colors',
                form.tone === t
                  ? 'bg-brand-700 text-white border-brand-700'
                  : 'border-gray-300 text-gray-600 hover:border-brand-400',
              ].join(' ')}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Offer */}
      <div>
        <label className="block text-sm font-medium mb-1">Offer / Hook</label>
        <input
          type="text"
          value={form.offer}
          onChange={(e) => update('offer', e.target.value)}
          placeholder="e.g. 15% off + complimentary breakfast"
          className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
        />
      </div>

      {/* Additional notes */}
      <div>
        <label className="block text-sm font-medium mb-1">Additional Notes</label>
        <textarea
          rows={3}
          value={form.additionalNotes}
          onChange={(e) => update('additionalNotes', e.target.value)}
          placeholder="Anything else Claude should know…"
          className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
        />
      </div>

      <button type="submit" disabled={!isValid} className="btn-primary w-full justify-center">
        Generate Copy with Claude →
      </button>
    </form>
  )
}
