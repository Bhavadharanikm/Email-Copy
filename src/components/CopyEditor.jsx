/**
 * CopyEditor — Step 2
 * AI Pick shown as the main full-width editable card.
 * "See 3 variations" button toggles the original V1/V2/V3 panel below.
 */
import { useEffect, useRef, useState } from 'react'
import { useCampaignStore } from '../store/campaignStore'
import { useTheme } from '../context/ThemeContext'

const FIELDS = [
  { key: 'subjectLine',     label: 'Subject Line',      hint: 'Keep under 50 chars'         },
  { key: 'previewText',     label: 'Preview Text',       hint: 'Shows below subject in inbox' },
  { key: 'headlineText',    label: 'Hero Headline',      hint: ''                            },
  { key: 'subhead',         label: 'Subhead',            hint: ''                            },
  { key: 'bodyText',        label: 'Body Copy',          hint: ''                            },
  { key: 'bodyBlock2Title', label: 'Body Block 2 Title', hint: ''                            },
  { key: 'bodyBlock2',      label: 'Body Block 2',       hint: ''                            },
  { key: 'ctaText',         label: 'CTA Button Text',    hint: 'e.g. "Reserve Your Cabin →"' },
  { key: 'ctaUrl',          label: 'CTA URL',            hint: 'Full URL with https://'      },
  { key: 'closingLine',     label: 'Closing Line',       hint: ''                            },
]

function AutoTextarea({ value, onChange, style }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = ref.current.scrollHeight + 'px'
    }
  }, [value])
  return (
    <textarea ref={ref} value={value} onChange={onChange} rows={2}
      style={{ overflow: 'hidden', ...style }} />
  )
}

function GeneratingSpinner({ dark }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const msg =
    elapsed < 10 ? 'Sending brief to n8n…' :
    elapsed < 20 ? 'n8n is researching your brand…' :
    elapsed < 35 ? 'Writing copy variations…' :
                   'Almost done, finishing variation 3…'
  const accent = dark ? '#f59e0b' : '#3b82f6'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 0', gap: 16 }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: `4px solid ${dark ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.2)'}`,
        borderTopColor: accent,
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ fontSize: 14, fontWeight: 500, color: dark ? 'rgba(255,255,255,0.6)' : '#6b7280' }}>{msg}</p>
      <p style={{ fontSize: 14, color: dark ? 'rgba(255,255,255,0.3)' : '#9ca3af' }}>{elapsed}s elapsed</p>
      <div style={{ width: 180, height: 4, background: dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: accent, borderRadius: 4, transition: 'width 1s', width: `${Math.min((elapsed / 45) * 100, 95)}%` }} />
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function CopyEditor() {
  const { theme } = useTheme()
  const dark = theme === 'dark'

  const {
    variations, selectedVariation, pickVariation,
    generatedCopy, setGeneratedCopy, isGenerating,
  } = useCampaignStore(s => ({
    variations:        s.variations,
    selectedVariation: s.selectedVariation,
    pickVariation:     s.pickVariation,
    generatedCopy:     s.generatedCopy,
    setGeneratedCopy:  s.setGeneratedCopy,
    isGenerating:      s.isGenerating,
  }))

  const [localVars, setLocalVars] = useState(null)
  const [showPanel, setShowPanel] = useState(false)

  useEffect(() => {
    if (variations.length > 0 && !localVars)
      setLocalVars(variations.map(v => ({ ...v })))
  }, [variations])

  // Reset local state when variations change (new generation)
  useEffect(() => {
    setLocalVars(variations.map(v => ({ ...v })))
    setShowPanel(false)
  }, [variations])

  function updateLocal(varIndex, field, value) {
    setLocalVars(prev => {
      const updated = prev.map((v, i) => i === varIndex ? { ...v, [field]: value } : v)
      if (varIndex === selectedVariation)
        setGeneratedCopy({ ...generatedCopy, [field]: value })
      return updated
    })
  }

  function selectVariation(i) {
    pickVariation(i)
    if (localVars?.[i]) setGeneratedCopy({ ...localVars[i] })
  }

  const accent      = dark ? '#f59e0b' : '#3b82f6'
  const outerBg     = dark ? '#0f0f0f' : '#f1f3f5'
  const outerBorder = dark ? 'rgba(255,255,255,0.07)' : '#e2e4e7'
  const cardBg      = dark ? '#161616' : '#ffffff'
  const fieldBorder = dark ? 'rgba(255,255,255,0.06)' : '#eeeff1'
  const labelColor  = dark ? 'rgba(255,255,255,0.75)' : '#111827'
  const hintColor   = dark ? 'rgba(255,255,255,0.16)' : '#c4c8d0'
  const inputBg     = dark ? '#1f1f1f' : '#f8f9fa'
  const inputBorder = dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'
  const textColor   = dark ? 'rgba(255,255,255,0.85)' : '#111827'

  if (isGenerating) return <GeneratingSpinner dark={dark} />

  const cols = localVars || variations

  // ── Detect whether we have an AI Pick at index 0 ──────────────────────────
  const hasAiPick = variations.length >= 2 && variations[0]?.name === 'AI Pick'

  // ── Fallback: no AI Pick → show classic 3-col grid ───────────────────────
  if (!hasAiPick) {
    if (variations.length <= 1) {
      return (
        <div style={{ maxWidth: 680, margin: '0 auto', background: outerBg, border: `1px solid ${outerBorder}`, borderRadius: 20, padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {FIELDS.map(({ key, label, hint }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5, color: labelColor }}>
                  {label}{hint && <span style={{ marginLeft: 6, fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: hintColor }}>{hint}</span>}
                </label>
                <AutoTextarea
                  value={generatedCopy[key] || ''}
                  onChange={e => setGeneratedCopy({ ...generatedCopy, [key]: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 10, fontSize: 15, fontFamily: 'Inter, sans-serif', outline: 'none', resize: 'none', backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textColor }}
                />
              </div>
            ))}
          </div>
        </div>
      )
    }
    return (
      <div style={{ background: outerBg, border: `1px solid ${outerBorder}`, borderRadius: 22, padding: 16, maxWidth: 1160, margin: '0 auto' }}>
        <p style={{ fontSize: 14, color: labelColor, textAlign: 'center', marginBottom: 14 }}>
          Edit any variation — click <strong style={{ color: dark ? 'rgba(255,255,255,0.55)' : '#374151' }}>Select</strong> to use it for the next step.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, alignItems: 'start' }}>
          {cols.map((v, i) => {
            const sel = selectedVariation === i
            return (
              <div key={i} style={{ background: sel ? (dark ? '#1c1800' : '#f0f6ff') : cardBg, border: `2px solid ${sel ? accent : outerBorder}`, borderRadius: 16, overflow: 'hidden', transition: 'border-color 0.18s' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: sel ? (dark ? 'rgba(245,158,11,0.12)' : 'rgba(59,130,246,0.08)') : (dark ? 'rgba(255,255,255,0.03)' : '#f8f9fa'), borderBottom: `1px solid ${fieldBorder}` }}>
                  <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: sel ? accent : labelColor }}>V{i + 1} {v.name}</span>
                  <button onClick={() => selectVariation(i)} style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Inter, sans-serif', background: sel ? accent : 'transparent', color: sel ? (dark ? '#111827' : '#fff') : labelColor, border: `1.5px solid ${sel ? accent : (dark ? 'rgba(255,255,255,0.15)' : '#d1d5db')}` }}>
                    {sel ? '✓ Selected' : 'Select'}
                  </button>
                </div>
                {FIELDS.map(({ key, label, hint }, fi) => (
                  <div key={key} style={{ padding: '10px 14px', borderBottom: fi < FIELDS.length - 1 ? `1px solid ${fieldBorder}` : 'none' }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5, color: labelColor }}>{label}</label>
                    <AutoTextarea value={v[key] || ''} onChange={e => updateLocal(i, key, e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, fontSize: 14, fontFamily: 'Inter, sans-serif', outline: 'none', resize: 'none', backgroundColor: sel ? (dark ? '#242010' : '#fff') : inputBg, border: `1px solid ${sel ? (dark ? 'rgba(245,158,11,0.3)' : '#bfdbfe') : inputBorder}`, color: textColor, lineHeight: 1.5 }} />
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── AI Pick layout ────────────────────────────────────────────────────────
  const mainIdx   = selectedVariation            // 0 = AI Pick, 1/2/3 = originals
  const mainCard  = cols[mainIdx] || cols[0]
  const originals = cols.slice(1)                // V1, V2, V3

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Main editable card ── */}
      <div style={{
        background: cardBg,
        border: `2px solid ${accent}`,
        borderRadius: 20,
        overflow: 'hidden',
      }}>
        {/* Card header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px',
          background: dark ? 'rgba(245,158,11,0.08)' : 'rgba(59,130,246,0.06)',
          borderBottom: `1px solid ${dark ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.12)'}`,
        }}>
          {/* Left: variation label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {mainIdx === 0 ? (
              <>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: accent, background: dark ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.1)', padding: '3px 10px', borderRadius: 6 }}>
                  ✦ AI Pick
                </span>
              </>
            ) : (
              <span style={{ fontSize: 13, fontWeight: 700, color: labelColor }}>
                V{mainIdx} — {mainCard.name}
              </span>
            )}
          </div>

          {/* Right: Selected badge + toggle button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 8,
              background: accent, color: dark ? '#111827' : '#fff',
              fontFamily: 'Inter, sans-serif',
            }}>
              ✓ Selected
            </span>
            <button
              onClick={() => setShowPanel(p => !p)}
              style={{
                fontSize: 12, fontWeight: 600, padding: '4px 14px', borderRadius: 8,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                background: 'transparent',
                color: labelColor,
                border: `1.5px solid ${dark ? 'rgba(255,255,255,0.15)' : '#d1d5db'}`,
                display: 'flex', alignItems: 'center', gap: 5,
                transition: 'border-color 0.15s',
              }}
            >
              {showPanel ? 'Hide variations ↑' : 'See 3 variations ↓'}
            </button>
          </div>
        </div>

        {/* Fields */}
        <div>
          {FIELDS.map(({ key, label, hint }, fi) => (
            <div key={key} style={{
              padding: '12px 20px',
              borderBottom: fi < FIELDS.length - 1 ? `1px solid ${fieldBorder}` : 'none',
            }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6, color: labelColor }}>
                {label}
                {hint && <span style={{ marginLeft: 6, fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: hintColor }}>{hint}</span>}
              </label>
              <AutoTextarea
                value={mainCard[key] || ''}
                onChange={e => updateLocal(mainIdx, key, e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 10,
                  fontSize: 14, fontFamily: 'Inter, sans-serif',
                  outline: 'none', resize: 'none',
                  backgroundColor: dark ? '#1a1a1a' : '#fafafa',
                  border: `1px solid ${dark ? 'rgba(245,158,11,0.2)' : '#e0e7ff'}`,
                  color: textColor,
                  lineHeight: 1.6,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Collapsible variations panel ── */}
      {showPanel && (
        <div style={{
          background: outerBg,
          border: `1px solid ${outerBorder}`,
          borderRadius: 18,
          padding: 14,
          animation: 'fadeSlideIn 0.18s ease',
        }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: dark ? 'rgba(255,255,255,0.35)' : '#9ca3af', textAlign: 'center', marginBottom: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Original variations — click Select to use one
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, alignItems: 'start' }}>
            {originals.map((v, idx) => {
              const realIdx = idx + 1  // offset because AI Pick is at 0
              const sel = selectedVariation === realIdx
              return (
                <div key={realIdx} style={{
                  background: sel ? (dark ? '#1c1800' : '#f0f6ff') : cardBg,
                  border: `2px solid ${sel ? accent : outerBorder}`,
                  borderRadius: 14,
                  overflow: 'hidden',
                  transition: 'border-color 0.18s',
                }}>
                  {/* Mini header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: sel ? (dark ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.07)') : (dark ? 'rgba(255,255,255,0.03)' : '#f8f9fa'),
                    borderBottom: `1px solid ${fieldBorder}`,
                  }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 800, color: sel ? accent : labelColor }}>V{realIdx}</span>
                      {v.name && <span style={{ fontSize: 11, fontWeight: 600, color: sel ? accent : hintColor, marginLeft: 6 }}>{v.name}</span>}
                    </div>
                    <button
                      onClick={() => { selectVariation(realIdx); setShowPanel(false) }}
                      style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 7,
                        cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                        background: sel ? accent : 'transparent',
                        color: sel ? (dark ? '#111827' : '#fff') : labelColor,
                        border: `1.5px solid ${sel ? accent : (dark ? 'rgba(255,255,255,0.15)' : '#d1d5db')}`,
                      }}
                    >
                      {sel ? '✓ Selected' : 'Select'}
                    </button>
                  </div>

                  {/* Show key fields only */}
                  {FIELDS.map(({ key, label }, fi) => (
                    <div key={key} style={{
                      padding: '8px 12px',
                      borderBottom: fi < FIELDS.length - 1 ? `1px solid ${fieldBorder}` : 'none',
                    }}>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 4, color: hintColor }}>{label}</label>
                      <AutoTextarea
                        value={v[key] || ''}
                        onChange={e => updateLocal(realIdx, key, e.target.value)}
                        style={{
                          width: '100%', padding: '6px 9px', borderRadius: 7,
                          fontSize: 13, fontFamily: 'Inter, sans-serif',
                          outline: 'none', resize: 'none',
                          backgroundColor: sel ? (dark ? '#242010' : '#fff') : inputBg,
                          border: `1px solid ${sel ? (dark ? 'rgba(245,158,11,0.25)' : '#bfdbfe') : inputBorder}`,
                          color: textColor,
                          lineHeight: 1.5,
                        }}
                      />
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(-6px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  )
}
