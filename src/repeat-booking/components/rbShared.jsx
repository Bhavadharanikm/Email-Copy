/**
 * Bits every repeat booking step page shares. The look comes from the
 * welcome flow's wfUi, so both flows read as one app.
 */

import { useEffect } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
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
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>That email isn't in the database</div>
        <div style={{ fontSize: 12.5, color: t.muted, marginTop: 6 }}>
          The link may be from before it was saved. Open the client from the list instead.
        </div>
        <WfButton variant="ghost" style={{ marginTop: 14 }} onClick={() => navigate('/repeat-booking')}>
          <IconArrowLeft size={15} /> All clients
        </WfButton>
      </WfCard>
    </div>
  )
}

/** Wraps every /repeat-booking page: reads the shared data once per visit,
    holds the pages until it has, and shows when a save is out or failed. */
export function RBLayout() {
  const t = useWfTheme()
  const loaded    = useRepeatBookingStore(s => s.loaded)
  const loadError = useRepeatBookingStore(s => s.loadError)
  const saving    = useRepeatBookingStore(s => s.saving)
  const saveError = useRepeatBookingStore(s => s.saveError)
  const { load, retry } = useRepeatBookingStore.getState()
  useEffect(() => { load() }, [load])

  if (!loaded) {
    return <div style={{ maxWidth: 820, margin: '0 auto', padding: '64px 24px', textAlign: 'center', fontSize: 13, color: t.muted }}>Loading repeat booking clients…</div>
  }
  if (loadError) {
    return (
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px' }}>
        <WfCard style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Couldn't load the repeat booking clients</div>
          <div style={{ fontSize: 12.5, color: '#dc2626', marginTop: 6 }}>{loadError}</div>
          <WfButton style={{ marginTop: 14 }} onClick={() => { useRepeatBookingStore.setState({ loaded: false }); load() }}>Try again</WfButton>
        </WfCard>
      </div>
    )
  }
  return (
    <>
      <Outlet />
      {(saving > 0 || saveError) && (
        <div role="status" style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 50, display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '9px 14px', borderRadius: 10, fontSize: 12.5, maxWidth: 420,
                                    background: saveError ? '#fef2f2' : (t.dark ? '#1f1f24' : '#ffffff'),
                                    color: saveError ? '#b91c1c' : t.muted,
                                    border: `1px solid ${saveError ? '#fecaca' : t.border}`, boxShadow: '0 4px 14px rgba(0,0,0,0.08)' }}>
          {saveError ? <>Not saved: {saveError}<WfButton variant="subtle" style={{ padding: '4px 10px', fontSize: 12 }} onClick={retry}>Retry</WfButton></> : 'Saving…'}
        </div>
      )}
    </>
  )
}
