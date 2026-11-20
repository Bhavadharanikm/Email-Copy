/**
 * useWeeklySave
 * Saves the weekly draft to weekly_emails (weekly-data). The first save gives
 * the email its code; every save after that updates the same row.
 */
import { useCallback, useState } from 'react'
import { useCampaignStore, pickDraft } from '../store/campaignStore'
import { saveWeeklyEmail } from '../lib/api'

export function useWeeklySave() {
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const save = useCallback(async ({ status } = {}) => {
    const s = useCampaignStore.getState()
    if (!s.selectedClient?.name) { setError('Pick a client before saving'); return null }
    setSaving(true); setError('')
    try {
      const res = await saveWeeklyEmail({
        id:            s.weeklyEmailId || undefined,
        clientName:    s.selectedClient.name,
        locationId:    s.selectedClient.ghl?.locationId || s.locationId || null,
        templateLabel: s.templateLabel || '',
        subjectLine:   s.generatedCopy?.subjectLine || '',
        status:        status || (s.ghlPushResult ? 'pushed' : 'draft'),
        state:         pickDraft(s),
        renderedHtml:  s.renderedHtml || '',
      })
      s.markSaved(res)
      return res
    } catch (e) {
      setError(e.message)
      return null
    } finally {
      setSaving(false)
    }
  }, [])

  return { save, saving, error }
}
