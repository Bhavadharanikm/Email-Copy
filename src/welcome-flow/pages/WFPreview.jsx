/**
 * Welcome Flow — template preview (step 4 of a WF email).
 *
 * Renders the very same TemplatePreview the Weekly Email Campaign uses, so the
 * Welcome Flow gets every feature that exists there without a second copy of it:
 * Puppeteer image generation, the hero/logo/sub-image edit controls, zoom,
 * mobile view, and the footer pulled from the brand board sheet by client name.
 *
 * TemplatePreview reads its inputs from the campaign store, so this page copies
 * the WF email's client/copy/images in on mount and puts the previous contents
 * back on unmount. Without that restore, opening a WF email would quietly
 * overwrite whatever the user had in progress on the weekly side.
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft } from '@tabler/icons-react'
import { useWelcomeFlowStore } from '../store/welcomeFlowStore'
import { wfWeek, wfWeekLabel } from '../wfWeeks'
import { useCampaignStore } from '../../store/campaignStore'
import { useWfTheme, WfCard, WfButton, WfStepNav } from '../components/wfUi'
import TemplatePreview from '../../components/TemplatePreview'
import { wfTestVariations } from '../wfTestData'

export default function WFPreview() {
  const { clientId, emailId } = useParams()
  const navigate = useNavigate()
  const t = useWfTheme()
  const { getClient, getEmails, updateEmail, ensureClients, ensureEmails, loadingClients, clientsLoaded, loadedEmails } = useWelcomeFlowStore()

  // clients are not persisted — refetch after a reload on this deep route
  useEffect(() => { ensureClients() }, [ensureClients])
  useEffect(() => { ensureEmails(clientId) }, [ensureEmails, clientId])

  /* Resolve the template from the week rather than trusting the id stored on
     the email: the brief only writes templateId when copy is generated, so an
     email whose week was changed since — or created before its template
     existed — would otherwise open on the wrong layout, or on all of them. */
  const client = getClient(clientId)
  const email  = (getEmails(clientId) || []).find(e => e.id === emailId)
  const wfWeekTemplateId = wfWeek(email?.week)?.templateId ?? email?.templateId ?? null

  const [ready, setReady] = useState(false)
  const [usingSample, setUsingSample] = useState(false)
  const snapshot = useRef(null)

  /* Two ways to look at a generated email. 'preview' draws it from the photos
     themselves, so the hero can be re-cropped and the images generated again.
     'rendered' draws it with the PNGs already baked and sitting in the client's
     media library, which is what Approve pushes. Copy edits show in both. */
  const [mode, setMode] = useState('preview')
  const genUrls = useCampaignStore(st => st.generatedUrls)
  const bakedForThis = genUrls?.[wfWeekTemplateId] || null
  const hasBaked = !!bakedForThis && Object.values(bakedForThis).some(Boolean)

  /* The cleanup below runs from an effect that cannot see later renders, so the
     two things it has to know are kept in refs. */
  const modeRef = useRef(mode)
  const hasBakedRef = useRef(hasBaked)
  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { hasBakedRef.current = hasBaked }, [hasBaked])

  /* Pressing Generate should show what it produced. The baked set changing
     after the page has settled means a fresh render just landed, so switch to
     it; the set arriving at open time is just the email's own history. */
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

    // remember what the weekly campaign had, so we can hand it back
    snapshot.current = {
      selectedClient: store.selectedClient,
      generatedCopy:  store.generatedCopy,
      selectedImages: store.selectedImages,
      clientFooter:   store.clientFooter,
      renderedHtml:   store.renderedHtml,
      generatedUrls:  store.generatedUrls,
      imageGenHtml:   store.imageGenHtml,
      locationId:     store.locationId,
    }

    // Only clear clientFooter when the client actually changed. Nulling it on
    // every mount forced a fresh Google Sheets round-trip on every single visit
    // to Preview — if Generate Images was clicked inside that window, the button
    // bake grabbed the pink fallback color instead of the real brand color, and
    // nothing ever re-baked it once the real data arrived.
    const footerStillValid = snapshot.current.selectedClient?.name === client.name
    const hasOwnCopy = !!email.copy && Object.values(email.copy).some(v => Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim() !== '' : v != null && typeof v !== 'object')
    setUsingSample(!hasOwnCopy)

    useCampaignStore.setState({
      selectedClient: {
        name:     client.name,
        logoUrl:  client.logoUrl || '',
        ghl:      { locationId: client.locationId },
      },
      /* The design should always be visible. Until this email has copy of its
         own, the preview draws it with the email's sample copy, and says so. */
      generatedCopy:  hasOwnCopy ? email.copy : (wfTestVariations(email.week)?.[0] || {}),
      selectedImages: email.selectedImages || [],
      clientFooter:   footerStillValid ? snapshot.current.clientFooter : null,
      renderedHtml:   email.renderedHtml || '',
      generatedUrls:  email.generatedUrls || {},
      imageGenHtml:   '',
      locationId:     client.locationId || '',
    })
    setReady(true)

    return () => {
      // persist whatever the preview produced, then restore the weekly state.
      // Not the HTML when it was drawn from sample copy: Approve pushes
      // renderedHtml, and sample copy must never be what gets pushed.
      const after = useCampaignStore.getState()
      /* The preview view renders from the raw photos, so its HTML is not what
         should ever reach a client. Keep the stored HTML only when it was drawn
         with the bakes, or when this email has none to lose. */
      const htmlIsPushable = modeRef.current === 'rendered' || !hasBakedRef.current
      updateEmail(clientId, emailId, {
        ...(hasOwnCopy && htmlIsPushable ? { renderedHtml: after.renderedHtml || '' } : {}),
        ...(hasOwnCopy ? { generatedUrls: after.generatedUrls || {} } : {}),
        templateLabel: after.templateLabel || '',
      })
      if (snapshot.current) useCampaignStore.setState(snapshot.current)
    }
  }, [client?.id, email?.id])   // eslint-disable-line react-hooks/exhaustive-deps

  /* Still fetching: the client list, or this client's emails from the database.
     Not the 'not found' screen — that is only right once loading has finished. */
  if (!clientsLoaded || loadingClients || (client && !email && !loadedEmails[clientId])) {
    return (
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px' }}>
        <WfCard style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: t.muted }}>Loading…</div>
        </WfCard>
      </div>
    )
  }

  if (!client || !email) {
    return (
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px' }}>
        <WfCard style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>That email no longer exists</div>
          <WfButton variant="ghost" style={{ marginTop: 14 }} onClick={() => navigate('/welcome-flow')}>
            <IconArrowLeft size={15} /> All clients
          </WfButton>
        </WfCard>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 24px 64px' }}>
      <WfStepNav
        email={email} step={4}
        backLabel="Images"
        onBack={() => navigate(`/welcome-flow/${clientId}/email/${emailId}/images`)}
        nextLabel="Next: Approve & Push"
        onNext={() => navigate(`/welcome-flow/${clientId}/email/${emailId}/approve`)}
      />

      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: t.text }}>
          Preview &amp; Generate
        </h1>
        <p style={{ fontSize: 13, color: t.muted, margin: '7px 0 0' }}>
          Same controls as the weekly campaign. Adjust the hero, generate the images, then approve.
        </p>
      </div>

      {ready && usingSample && (
        <div style={{ fontSize: 12.5, color: '#b45309', margin: '0 0 12px' }}>
          Showing the design with sample copy for {wfWeekLabel(email?.week)}. Generate copy on the brief to see this email with its own words.
        </div>
      )}
      {ready && hasBaked && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 10, margin: '0 0 14px' }}>
          <div style={{ display: 'inline-flex', padding: 3, borderRadius: 10, background: t.inputBg, border: `1px solid ${t.border}` }}>
            {[
              ['preview',  'Preview',  'Drawn from the photos. Re-crop and generate again'],
              ['rendered', 'Rendered', 'The generated images, exactly as Approve will push them'],
            ].map(([id, label, hint]) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                title={hint}
                style={{
                  padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', fontSize: 12.5, fontWeight: 700,
                  background: mode === id ? t.cardBg : 'transparent',
                  color: mode === id ? t.text : t.muted,
                  boxShadow: mode === id ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 12, color: t.muted }}>
            {mode === 'preview'
              ? 'Showing the live design. Generate images to bake it again.'
              : 'Showing the generated images. Edit the copy and they stay as they are.'}
          </span>
        </div>
      )}

      {ready ? (
        <TemplatePreview
          welcomeFlow
          templateId={wfWeekTemplateId}
          bakedImages={mode === 'rendered'}
          allowGenerate={mode === 'preview'}
        />
      ) : (
        <WfCard style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: t.muted }}>Loading the template…</div>
        </WfCard>
      )}
    </div>
  )
}
