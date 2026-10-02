/**
 * Bits every repeat booking step page shares. The look comes from the
 * welcome flow's wfUi, so both flows read as one app.
 */

import { useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft } from '@tabler/icons-react'
import { useWfTheme, WfCard, WfButton } from '../../welcome-flow/components/wfUi'
import { useRepeatBookingStore } from '../store/repeatBookingStore'

/** /repeat-booking/:clientId/email/:emailId[/step] */
export const rbPath = (clientId, emailId, step = '') =>
  `/repeat-booking/${encodeURIComponent(clientId)}/email/${emailId}${step ? `/${step}` : ''}`

/** The route's client and email, and the email in the shape WfStepNav names ("Email 1 · Step 2 of 5"). */
export function useRbEmail() {
  const { clientId, emailId } = useParams()
  const client = useRepeatBookingStore(s => s.clients.find(c => c.id === clientId) || null)
  const email  = useRepeatBookingStore(s => (s.emails[clientId] || []).find(e => e.id === emailId) || null)
  return { clientId, emailId, client, email, navEmail: email ? { week: email.email } : null }
}

export function RBMissing() {
  const navigate = useNavigate()
  const t = useWfTheme()
  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px' }}>
      <WfCard style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>That email no longer exists in this browser</div>
        <div style={{ fontSize: 12.5, color: t.muted, marginTop: 6 }}>
          Repeat booking emails are saved in the browser they were made in.
        </div>
        <WfButton variant="ghost" style={{ marginTop: 14 }} onClick={() => navigate('/repeat-booking')}>
          <IconArrowLeft size={15} /> All clients
        </WfButton>
      </WfCard>
    </div>
  )
}
