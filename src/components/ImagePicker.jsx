/**
 * ImagePicker — Step 3
 * Left: large named slots (Hero, Sub 1, Sub 2) — positions stay fixed on remove.
 * Right: compact scrollable image grid to pick from.
 */
import { useEffect, useState } from 'react'
import { useCampaignStore } from '../store/campaignStore'
import { fetchGhlImages } from '../lib/api'
import { useTheme } from '../context/ThemeContext'

const SLOTS = [
  { key: 'hero', label: 'Hero Image',  desc: 'Main banner at the top' },
  { key: 'sub1', label: 'Sub Image 1', desc: 'Secondary image in body' },
  { key: 'sub2', label: 'Sub Image 2', desc: 'Closing visual'          },
]

export default function ImagePicker() {
  const { theme } = useTheme()
  const dark = theme === 'dark'

  const [images, setImages]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const { selectedClient, locationId, selectedImages, setSelectedImages } = useCampaignStore((s) => ({
    selectedClient:    s.selectedClient,
    locationId:        s.locationId,
    selectedImages:    s.selectedImages,
    setSelectedImages: s.setSelectedImages,
  }))

  useEffect(() => {
    const apiKey = selectedClient?.ghlApiKey
    if (!locationId) { setError('Paste a GHL template URL on Step 1 to load images.'); setLoading(false); return }
    if (!apiKey)     { setError('No API key found for this client.'); setLoading(false); return }
    fetchGhlImages({ locationId, apiKey })
      .then(d => setImages(d.images || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [locationId, selectedClient])

  const slots = [
    selectedImages[0] ?? null,
    selectedImages[1] ?? null,
    selectedImages[2] ?? null,
  ]

  function save(next) { setSelectedImages(next) }

  function handleImageClick(img) {
    const slotIndex = slots.findIndex(s => s?.id === img.id)
    if (slotIndex !== -1) {
      const next = [...slots]; next[slotIndex] = null; save(next)
    } else {
      const emptyIndex = slots.findIndex(s => s === null)
      if (emptyIndex === -1) return
      const next = [...slots]; next[emptyIndex] = img; save(next)
    }
  }

  function removeSlot(i) {
    const next = [...slots]; next[i] = null; save(next)
  }

  const accent = dark ? '#f59e0b' : '#3b82f6'
  const mutedText = dark ? 'rgba(255,255,255,0.3)' : '#9ca3af'

  if (loading) return <p style={{ fontSize: 15, color: mutedText }}>Loading images from GHL Media Library…</p>
  if (error)   return <p style={{ fontSize: 15, color: dark ? '#f87171' : '#ef4444' }}>{error}</p>
  if (!images.length) return <p style={{ fontSize: 15, color: mutedText }}>No images found. Upload photos in GHL → Media Storage.</p>

  const allFull = slots.every(s => s !== null)

  return (
    <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', maxWidth: 900, margin: '0 auto' }}>

      {/* ── Left: Named slots ── */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, width: 230 }}>
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
        <p style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: mutedText, marginBottom: 12 }}>
          Media Library
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, maxHeight: 580, overflowY: 'auto', paddingRight: 4 }}>
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
