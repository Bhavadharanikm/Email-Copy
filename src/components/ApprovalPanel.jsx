/**
 * ApprovalPanel
 * Step 6 — team reviews the preview and approves or rejects with optional notes.
 * On approval it triggers: GHL push + Google Chat notification.
 */
import { useState } from 'react'
import { useCampaignStore } from '../store/campaignStore'
import { pushToGHL, notifyChat } from '../lib/api'

export default function ApprovalPanel() {
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const {
    selectedClient,
    generatedCopy,
    renderedHtml,
    approvalStatus,
    setApproval,
    setGhlPushResult,
    setError,
  } = useCampaignStore((s) => ({
    selectedClient:  s.selectedClient,
    generatedCopy:   s.generatedCopy,
    renderedHtml:    s.renderedHtml,
    approvalStatus:  s.approvalStatus,
    setApproval:     s.setApproval,
    setGhlPushResult: s.setGhlPushResult,
    setError:        s.setError,
  }))

  async function handleApprove() {
    setLoading(true)
    setApproval('approved', notes)
    try {
      // 1. Push HTML to GHL
      const ghlResult = await pushToGHL({ client: selectedClient, renderedHtml, generatedCopy })
      setGhlPushResult(ghlResult)

      // 2. Notify Google Chat
      await notifyChat({
        clientName:  selectedClient.name,
        previewUrl:  ghlResult.previewUrl,
        approvedBy:  'Team',
      })

      setDone(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleReject() {
    setApproval('rejected', notes)
  }

  if (done) {
    return (
      <div className="text-center py-12 space-y-3">
        <div className="text-5xl">✅</div>
        <p className="text-xl font-semibold text-brand-700">Email pushed to GHL!</p>
        <p className="text-sm text-gray-500">Google Chat notification sent.</p>
      </div>
    )
  }

  if (approvalStatus === 'rejected') {
    return (
      <div className="text-center py-12 space-y-3">
        <div className="text-5xl">🔄</div>
        <p className="text-xl font-semibold text-gray-700">Sent back for revision</p>
        <p className="text-sm text-gray-500">Notes: {notes || '—'}</p>
        <button onClick={() => setApproval('pending', '')} className="btn-secondary text-sm">
          Re-open
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="card">
        <h3 className="font-semibold mb-1">Review Summary</h3>
        <dl className="text-sm text-gray-600 space-y-1">
          <div><dt className="inline font-medium">Client: </dt><dd className="inline">{selectedClient?.name}</dd></div>
          <div><dt className="inline font-medium">Subject: </dt><dd className="inline">{generatedCopy.subjectLine}</dd></div>
          <div><dt className="inline font-medium">CTA: </dt><dd className="inline">{generatedCopy.ctaText}</dd></div>
        </dl>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Notes (optional)</label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any feedback for the record…"
          className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleApprove}
          disabled={loading}
          className="btn-primary flex-1 justify-center"
        >
          {loading ? 'Pushing to GHL…' : '✅ Approve & Push to GHL'}
        </button>
        <button
          onClick={handleReject}
          disabled={loading}
          className="btn-secondary flex-1 justify-center"
        >
          🔄 Send Back for Revision
        </button>
      </div>
    </div>
  )
}
