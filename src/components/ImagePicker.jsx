/**
 * ImagePicker — Step 3
 * Left: large named slots (Hero, Sub 1–4) — positions stay fixed on remove.
 * Right: compact scrollable image grid to pick from.
 */
import { useEffect, useState, useRef } from 'react'
import { useCampaignStore } from '../store/campaignStore'
import { fetchGhlImages, uploadLogo, analyzeImageFocal } from '../lib/api'
import { useTheme } from '../context/ThemeContext'

const SLOTS = [
  { key: 'hero', label: 'Hero Image',  desc: 'Main banner at the top'     },
  { key: 'sub1', label: 'Sub Image 1', desc: 'Body image · slot 1'        },
  { key: 'sub2', label: 'Sub Image 2', desc: 'Body image · slot 2'        },
  { key: 'sub3', label: 'Sub Image 3', desc: 'Body image · slot 3 (grid)' },
  { key: 'sub4', label: 'Sub Image 4', desc: 'Body image · slot 4 (grid)' },
]

export default function ImagePicker() {
  const { theme } = useTheme()
  const dark = theme === 'dark'

  const [folders,  setFolders]  = useState([])
  const [images,   setImages]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  // Folder navigation — stack for breadcrumb ([] = root)
  const [folderStack, setFolderStack] = useState([])
  const activeFolder = folderStack[folderStack.length - 1] ?? null

  const [logoUploading, setLogoUploading] = useState(false)
  const [logoStatus, setLogoStatus]       = useState('')
  const [logoMsg, setLogoMsg]             = useState('')
  const [clientLogoUrl, setClientLogoUrl] = useState('')
  const logoInputRef = useRef(null)

  const { selectedClient, locationId: storeLocationId, selectedImages, setSelectedImages, setClient } = useCampaignStore((s) => ({
    selectedClient:    s.selectedClient,
    locationId:        s.locationId,
    selectedImages:    s.selectedImages,
    setSelectedImages: s.setSelectedImages,
    setClient:         s.setClient,
  }))

  // Always prefer the client's own locationId from the sheet; fall back to whatever the store has
  const locationId = selectedClient?.ghl?.locationId || storeLocationId

  useEffect(() => {
    setClientLogoUrl(selectedClient?.logoUrl || '')
  }, [selectedClient])


  useEffect(() => {
    const apiKey = selectedClient?.ghlApiKey
    if (!selectedClient) { setError('Select a client on Step 1.'); setLoading(false); return }
    if (!locationId)     { setError('No Location ID found for this client — check the Google Sheet (Column C).'); setLoading(false); return }
    if (!apiKey)         { setError('No API key found for this client.'); setLoading(false); return }
    setError(null)
    setLoading(true)
    fetchGhlImages({ locationId, apiKey, folderId: activeFolder?.id })
      .then(d => {
        setFolders(d.folders || [])
        setImages(d.images   || [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [locationId, selectedClient, folderStack])

  const slots = [
    selectedImages[0] ?? null,
    selectedImages[1] ?? null,
    selectedImages[2] ?? null,
    selectedImages[3] ?? null,
    selectedImages[4] ?? null,
  ]

  function save(next) { setSelectedImages(next) }

  function handleImageClick(img) {
    const slotIndex = slots.findIndex(s => s?.id === img.id)
    if (slotIndex !== -1) {
      // Deselect
      const next = [...slots]; next[slotIndex] = null; save(next)
    } else {
      const emptyIndex = slots.findIndex(s => s === null)
      if (emptyIndex === -1) return
      // Place image immediately, then enrich with focal point in background
      const next = [...slots]; next[emptyIndex] = img; save(next)
      const urlToAnalyze = img.url || img.thumbnailUrl
      if (urlToAnalyze) {
        analyzeImageFocal({ imageUrl: urlToAnalyze })
          .then(({ focalX, focalY }) => {
            // Re-read current slots from store and update this slot
            const current = useCampaignStore.getState().selectedImages
            const updated = [...current]
            // Find the slot that still has this image id
            const idx = updated.findIndex(s => s?.id === img.id)
            if (idx !== -1) {
              updated[idx] = { ...updated[idx], focalX, focalY }
              setSelectedImages(updated)
            }
          })
          .catch(() => {}) // fail silently — default centering is fine
      }
    }
  }

  function removeSlot(i) {
    const next = [...slots]; next[i] = null; save(next)
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !selectedClient) return
    setLogoUploading(true); setLogoStatus(''); setLogoMsg('')
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload  = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const rowIndex = parseInt(selectedClient.id.replace('client-', ''), 10)
      const result = await uploadLogo({
        base64, mimeType: file.type, fileName: file.name,
        locationId: selectedClient.ghl?.locationId,
        apiKey: selectedClient.ghlApiKey,
        clientRowIndex: rowIndex,
      })
      setClientLogoUrl(result.logoUrl)
      setLogoStatus('success')
      setLogoMsg('Logo saved!')
      setClient({ ...selectedClient, logoUrl: result.logoUrl })
    } catch (err) {
      setLogoStatus('error')
      setLogoMsg(err.message || 'Upload failed')
    } finally {
      setLogoUploading(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  const accent = dark ? '#f59e0b' : '#3b82f6'
  const mutedText = dark ? 'rgba(255,255,255,0.3)' : '#9ca3af'

  if (error) return <p style={{ fontSize: 15, color: dark ? '#f87171' : '#ef4444' }}>{error}</p>

  // Show loading only if nothing to display yet
  if (loading && !images.length && !folders.length) return <p style={{ fontSize: 15, color: mutedText }}>Loading images from GHL Media Library…</p>

  const allFull = slots.every(s => s !== null)

  return (
    <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', maxWidth: 900, margin: '0 auto' }}>

      {/* ── Left: Named slots ── */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, width: 230 }}>

        {/* Logo slot */}
        <div style={{
          borderRadius: 12, overflow: 'hidden',
          border: `2px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
          background: dark ? 'rgba(255,255,255,0.03)' : '#f9fafb',
        }}>
          <div style={{ padding: '10px 12px', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}` }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: mutedText, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Client Logo</p>
          </div>
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            {clientLogoUrl ? (
              <div style={{ width: '100%', height: 80, background: '#1a1a1a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
                <img src={clientLogoUrl} alt="Logo" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
              </div>
            ) : (
              <div style={{ width: '100%', height: 80, borderRadius: 8, border: `1.5px dashed ${dark ? 'rgba(255,255,255,0.15)' : '#d1d5db'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 11, color: mutedText }}>No logo yet</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={logoUploading}
              style={{
                width: '100%', fontSize: 12, fontWeight: 600, padding: '7px 0', borderRadius: 8,
                cursor: logoUploading ? 'not-allowed' : 'pointer', opacity: logoUploading ? 0.6 : 1,
                border: `1px solid ${dark ? 'rgba(255,255,255,0.15)' : '#d1d5db'}`,
                background: dark ? 'rgba(255,255,255,0.06)' : '#fff',
                color: dark ? 'rgba(255,255,255,0.7)' : '#374151',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {logoUploading ? 'Uploading…' : clientLogoUrl ? '↑ Replace' : '↑ Upload Logo'}
            </button>
            {logoStatus === 'success' && <span style={{ fontSize: 11, color: '#34d399' }}>✓ {logoMsg}</span>}
            {logoStatus === 'error'   && <span style={{ fontSize: 11, color: '#f87171' }}>⚠ {logoMsg}</span>}
          </div>
          <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" style={{ display: 'none' }} onChange={handleLogoUpload} />
        </div>
        {SLOTS.map((slot, i) => {
          const filled = slots[i]
          return (
            <div key={slot.key} style={{
              borderRadius: 16,
              border: `2px ${filled ? 'solid' : 'dashed'} ${filled ? accent : (dark ? 'rgba(255,255,255,0.12)' : '#d1d5db')}`,
              overflow: 'hidden',
              transition: 'border-color 0.2s',
            }}>
              {filled ? (
                <div style={{ position: 'relative' }}>
                  <img src={filled.thumbnailUrl} alt={filled.name} style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} />
                  {/* Check badge */}
                  <div style={{
                    position: 'absolute', top: 10, right: 10, width: 28, height: 28,
                    background: accent, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 700, color: dark ? '#111827' : '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  }}>✓</div>
                  {/* Remove button */}
                  <button
                    onClick={() => removeSlot(i)}
                    style={{
                      position: 'absolute', top: 10, left: 10, width: 28, height: 28,
                      background: 'rgba(0,0,0,0.55)', borderRadius: '50%', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, fontWeight: 700, color: '#fff', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.55)'}
                    title="Remove"
                  >×</button>
                  <div style={{ padding: '10px 14px', background: dark ? 'rgba(255,255,255,0.04)' : '#fff' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: dark ? 'rgba(255,255,255,0.85)' : '#111827' }}>{slot.label}</p>
                    <p style={{ fontSize: 14, color: mutedText, marginTop: 2 }}>{filled.name.replace(/\.[^.]+$/, '')}</p>
                  </div>
                </div>
              ) : (
                <div style={{
                  height: 130, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: dark ? 'rgba(255,255,255,0.02)' : '#f9fafb',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    border: `2px dashed ${dark ? 'rgba(255,255,255,0.15)' : '#d1d5db'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 10,
                  }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: dark ? 'rgba(255,255,255,0.2)' : '#d1d5db' }}>{i + 1}</span>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: dark ? 'rgba(255,255,255,0.5)' : '#6b7280' }}>{slot.label}</p>
                  <p style={{ fontSize: 14, color: mutedText, marginTop: 4, textAlign: 'center', padding: '0 16px' }}>{slot.desc}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Right: Media library ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header row: breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {/* Root crumb */}
          <button
            type="button"
            onClick={() => setFolderStack([])}
            style={{
              fontSize: 13, fontWeight: folderStack.length === 0 ? 700 : 500,
              color: folderStack.length === 0 ? (dark ? '#fff' : '#111827') : mutedText,
              background: 'none', border: 'none', cursor: folderStack.length === 0 ? 'default' : 'pointer',
              padding: 0, fontFamily: 'Inter, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase',
            }}
          >Media Library</button>

          {folderStack.map((f, i) => (
            <span key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: mutedText }}>›</span>
              <button
                type="button"
                onClick={() => setFolderStack(folderStack.slice(0, i + 1))}
                style={{
                  fontSize: 13, fontWeight: i === folderStack.length - 1 ? 700 : 500,
                  color: i === folderStack.length - 1 ? (dark ? '#fff' : '#111827') : mutedText,
                  background: 'none', border: 'none',
                  cursor: i === folderStack.length - 1 ? 'default' : 'pointer',
                  padding: 0, fontFamily: 'Inter, sans-serif',
                }}
              >{f.name}</button>
            </span>
          ))}

          {folderStack.length > 0 && (
            <button
              type="button"
              onClick={() => setFolderStack(s => s.slice(0, -1))}
              style={{
                marginLeft: 'auto', fontSize: 12, fontWeight: 600,
                padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                border: `1px solid ${dark ? 'rgba(255,255,255,0.15)' : '#d1d5db'}`,
                background: dark ? 'rgba(255,255,255,0.06)' : '#fff',
                color: dark ? 'rgba(255,255,255,0.6)' : '#6b7280',
                fontFamily: 'Inter, sans-serif',
              }}
            >← Back</button>
          )}
        </div>

        {/* Folder / subfolder chips */}
        {folders.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {folders.map(folder => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setFolderStack(s => [...s, folder])}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20,
                  cursor: 'pointer',
                  border: `1px solid ${dark ? 'rgba(255,255,255,0.15)' : '#d1d5db'}`,
                  background: dark ? 'rgba(255,255,255,0.06)' : '#f3f4f6',
                  color: dark ? 'rgba(255,255,255,0.75)' : '#374151',
                  fontFamily: 'Inter, sans-serif',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'
                  e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.3)' : '#9ca3af'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.06)' : '#f3f4f6'
                  e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.15)' : '#d1d5db'
                }}
              >
                <span style={{ fontSize: 13 }}>📁</span>
                {folder.name}
              </button>
            ))}
          </div>
        )}

        {/* Loading spinner inside folder */}
        {loading && (
          <p style={{ fontSize: 13, color: mutedText, marginBottom: 10 }}>Loading…</p>
        )}

        {/* Empty folder message */}
        {!loading && folderStack.length > 0 && !images.length && !folders.length && (
          <p style={{ fontSize: 14, color: mutedText, marginTop: 8 }}>No images or subfolders in this folder.</p>
        )}

        {/* Empty root message (no folders, no images) */}
        {!loading && folderStack.length === 0 && !images.length && !folders.length && (
          <p style={{ fontSize: 14, color: mutedText, marginTop: 8 }}>No images found. Upload photos in GHL → Media Storage.</p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, maxHeight: 870, overflowY: 'auto', paddingRight: 4 }}>
          {images.map(img => {
            const slotIndex = slots.findIndex(s => s?.id === img.id)
            const isSelected = slotIndex !== -1
            const isDisabled = !isSelected && allFull
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => handleImageClick(img)}
                disabled={isDisabled}
                title={img.name}
                style={{
                  position: 'relative', borderRadius: 10, overflow: 'hidden', textAlign: 'left',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled ? 0.3 : 1,
                  border: `2px solid ${isSelected ? accent : (dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb')}`,
                  boxShadow: isSelected ? `0 0 0 3px ${dark ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.15)'}` : 'none',
                  background: dark ? 'rgba(255,255,255,0.03)' : '#f3f4f6',
                  transition: 'all 0.15s',
                  padding: 0,
                  fontFamily: 'Inter, sans-serif',
                }}
                onMouseEnter={e => { if (!isDisabled && !isSelected) e.currentTarget.style.borderColor = dark ? 'rgba(245,158,11,0.4)' : 'rgba(59,130,246,0.4)' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }}
              >
                <div style={{ width: '100%', aspectRatio: '1/1', overflow: 'hidden' }}>
                  <img src={img.thumbnailUrl} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
                </div>
                <div style={{ padding: '6px 8px', background: dark ? 'rgba(255,255,255,0.04)' : '#fff' }}>
                  <p style={{ fontSize: 14, color: mutedText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {img.name.replace(/\.[^.]+$/, '')}
                  </p>
                </div>
                {isSelected && (
                  <div style={{
                    position: 'absolute', top: 6, right: 6, width: 20, height: 20,
                    background: accent, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: dark ? '#111827' : '#fff',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  }}>✓</div>
                )}
              </button>
            )
          })}
        </div>
      </div>

    </div>
  )
}
