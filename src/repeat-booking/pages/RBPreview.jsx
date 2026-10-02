/**
 * Repeat Booking — preview (step 4).
 *
 * The welcome flow's preview step: the same TemplatePreview, opened on this
 * email's template, with the sliders, Generate Images, zoom and mobile view.
 * TemplatePreview reads the campaign store, so this page copies the email in
 * on mount and puts the weekly campaign's contents back on unmount.
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRepeatBookingStore } from '../store/repeatBookingStore'
import { rbEmail, RB_SAMPLE_COPY } from '../rbEmails'
import { useCampaignStore } from '../../store/campaignStore'
import { useWfTheme, WfCard, WfStepNav } from '../../welcome-flow/components/wfUi'
import TemplatePreview from '../../components/TemplatePreview'
import { useRbEmail, rbPath, RBMissing } from '../components/rbShared'

const hasAnyCopy = (c) => !!c && Object.values(c).some(v => Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim() !== '' : v != null && typeof v !== 'object')

export default function RBPreview() {
  const navigate = useNavigate()
  const t = useWfTheme()
  const { clientId, emailId, client, email, navEmail } = useRbEmail()
  const { updateEmail, saveEditorSettings } = useRepeatBookingStore()
  const templateId = rbEmail(email?.email)?.templateId ?? null

  const [ready, setReady] = useState(false)
  const [usingSample, setUsingSample] = useState(false)
  const snapshot = useRef(null)

  /* 'preview' draws from the photos (re-crop, generate again); 'rendered' draws
     with the baked PNGs, which is what Approve pushes. */
  const [mode, setMode] = useState('preview')
  const genUrls = useCampaignStore(st => st.generatedUrls)
  const bakedForThis = genUrls?.[templateId] || null
  const hasBaked = !!bakedForThis && Object.values(bakedForThis).some(Boolean)
  const modeRef = useRef(mode)
  const hasBakedRef = useRef(hasBaked)
  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { hasBakedRef.current = hasBaked }, [hasBaked])

  /* A fresh bake landing after the page settled switches to the rendered view. */
  const bakedSig = JSON.stringify(bakedForThis || {})
  const openedWith = useRef(null)
  useEffect(() => {
    if (!ready) return
    if (openedWith.current === null) { openedWith.current = bakedSig; return }
    if (bakedSig !== openedWith.current) { openedWith.current = bakedSig; setMode('rendered') }
  }, [ready, bakedSig])

  useEffect(() => {
    if (!client || !email) return
    const store = useCampaignStore.getState()
    snapshot.current = {
      selectedClient: store.selectedClient, generatedCopy: store.generatedCopy, selectedImages: store.selectedImages,
      clientFooter: store.clientFooter, renderedHtml: store.renderedHtml, generatedUrls: store.generatedUrls,
      imageGenHtml: store.imageGenHtml, locationId: store.locationId, editorSettings: store.editorSettings,
    }
    const footerStillValid = snapshot.current.selectedClient?.name === client.name
    const hasOwnCopy = hasAnyCopy(email.copy)
    setUsingSample(!hasOwnCopy)

    useCampaignStore.setState({
      selectedClient: { name: client.name, logoUrl: client.logoUrl || '', ghl: { locationId: client.locationId } },
      generatedCopy:  hasOwnCopy ? email.copy : (RB_SAMPLE_COPY[email.email] || {}),
      selectedImages: email.selectedImages || [],
      clientFooter:   footerStillValid ? snapshot.current.clientFooter : null,
      renderedHtml:   email.renderedHtml || '',
      generatedUrls:  email.generatedUrls || {},
      imageGenHtml:   '',
      locationId:     client.locationId || '',
      editorSettings: email.editorSettings || null,
    })
    setReady(true)

    return () => {
      /* Keep the HTML only when it was drawn with the bakes (or there are none),
         and never when it was drawn from sample copy: Approve pushes it. */
      const after = useCampaignStore.getState()
      const htmlIsPushable = modeRef.current === 'rendered' || !hasBakedRef.current
      if (hasOwnCopy) {
        updateEmail(clientId, emailId, {
          ...(htmlIsPushable ? { renderedHtml: after.renderedHtml || '' } : {}),
          generatedUrls: after.generatedUrls || {},
        })
      }
      if (snapshot.current) useCampaignStore.setState(snapshot.current)
    }
  }, [client?.id, email?.id])   // eslint-disable-line react-hooks/exhaustive-deps

  /* Slider positions are saved with the email as they change. */
  useEffect(() => {
    if (!ready || !email) return
    return useCampaignStore.subscribe((st, prev) => {
      if (st.editorSettings && st.editorSettings !== prev.editorSettings) saveEditorSettings(clientId, emailId, st.editorSettings)
    })
  }, [ready, email?.id, clientId, emailId, saveEditorSettings])   // eslint-disable-line react-hooks/exhaustive-deps

  if (!client || !email) return <RBMissing />

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 24px 64px' }}>
      <WfStepNav
        email={navEmail} step={4}
        backLabel="Images"
        onBack={() => navigate(rbPath(clientId, emailId, 'images'))}
        nextLabel="Next: Approve & Push"
        onNext={() => navigate(rbPath(clientId, emailId, 'approve'))}
      />

      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: t.text }}>Preview &amp; Generate</h1>
        <p style={{ fontSize: 13, color: t.muted, margin: '7px 0 0' }}>
          Adjust the photos, generate the images, then approve.
        </p>
      </div>

      {ready && usingSample && (
        <div style={{ fontSize: 12.5, color: '#b45309', margin: '0 0 12px' }}>
          Showing the design with sample copy. Generate copy on the brief to see this email with its own words.
        </div>
      )}
      {ready && hasBaked && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 10, margin: '0 0 14px' }}>
          <div style={{ display: 'inline-flex', padding: 3, borderRadius: 10, background: t.inputBg, border: `1px solid ${t.border}` }}>
            {[['preview', 'Preview', 'Drawn from the photos. Re-crop and generate again'],
              ['rendered', 'Rendered', 'The generated images, exactly as Approve will push them']].map(([id, label, hint]) => (
              <button key={id} onClick={() => setMode(id)} title={hint}
                style={{ padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                         fontSize: 12.5, fontWeight: 700, background: mode === id ? t.cardBg : 'transparent',
                         color: mode === id ? t.text : t.muted, boxShadow: mode === id ? '0 1px 4px rgba(0,0,0,0.12)' : 'none' }}>
                {label}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 12, color: t.muted }}>
            {mode === 'preview' ? 'Showing the live design. Generate images to bake it again.' : 'Showing the generated images, as Approve will push them.'}
          </span>
        </div>
      )}

      {ready ? (
        <TemplatePreview welcomeFlow templateId={templateId} bakedImages={mode === 'rendered'} allowGenerate={mode === 'preview'} />
      ) : (
        <WfCard style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: t.muted }}>Loading the template…</div>
        </WfCard>
      )}
    </div>
  )
}
