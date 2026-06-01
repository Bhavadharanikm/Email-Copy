/**
 * CopyEditor — Step 2
 * 3 variations side-by-side in a solid outer container, each as a full column card.
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
      <p style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.3)' : '#9ca3af' }}>{elapsed}s elapsed</p>
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

  useEffect(() => {
    if (variations.length > 0 && !localVars)
      setLocalVars(variations.map(v => ({ ...v })))
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

  const accent = dark ? '#f59e0b' : '#3b82f6'

  /* ── Outer + inner colors ── */
  const outerBg     = dark ? '#0f0f0f' : '#f1f3f5'
  const outerBorder = dark ? 'rgba(255,255,255,0.07)' : '#e2e4e7'
  const cardBg      = dark ? '#161616' : '#ffffff'
  const cardBgSel   = dark ? '#1c1800' : '#f0f6ff'
  const fieldBorder = dark ? 'rgba(255,255,255,0.06)' : '#eeeff1'
  const labelColor  = dark ? 'rgba(255,255,255,0.28)' : '#a0a6b1'
  const hintColor   = dark ? 'rgba(255,255,255,0.16)' : '#c4c8d0'
  const inputBg     = dark ? '#1f1f1f' : '#f8f9fa'
  const inputBgSel  = dark ? '#242010' : '#fff'
  const inputBorder = dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'
  const inputBorderSel = dark ? 'rgba(245,158,11,0.3)' : '#bfdbfe'
  const textColor   = dark ? 'rgba(255,255,255,0.85)' : '#111827'

  if (isGenerating) return <GeneratingSpinner dark={dark} />

  /* ── Single variation ── */
  if (variations.length <= 1) {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto',
        background: outerBg, border: `1px solid ${outerBorder}`,
        borderRadius: 20, padding: 24,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {FIELDS.map(({ key, label, hint }) => (
            <div key={key}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5, color: labelColor }}>
                {label}{hint && <span style={{ marginLeft: 6, fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: hintColor }}>{hint}</span>}
              </label>
              <AutoTextarea
                value={generatedCopy[key] || ''}
                onChange={e => setGeneratedCopy({ ...generatedCopy, [key]: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 10, fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none', resize: 'none', backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textColor }}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const cols = localVars || variations

  return (
    /* ── Outer shell ── */
    <div style={{
      background: outerBg,
      border: `1px solid ${outerBorder}`,
      borderRadius: 22,
      padding: 16,
      maxWidth: 1160,
      margin: '0 auto',
    }}>
      <p style={{ fontSize: 12, color: labelColor, textAlign: 'center', marginBottom: 14 }}>
        Edit any variation — click <strong style={{ color: dark ? 'rgba(255,255,255,0.55)' : '#374151' }}>Select</strong> to use it for the next step.
      </p>

      {/* ── 3 column cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {cols.map((v, i) => {
          const sel = selectedVariation === i
          return (
            <div key={i} style={{
              background: sel ? cardBgSel : cardBg,
              border: `2px solid ${sel ? accent : outerBorder}`,
              borderRadius: 16,
              overflow: 'hidden',
              transition: 'border-color 0.18s, background 0.18s',
            }}>

              {/* Card header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px',
                background: sel
                  ? (dark ? 'rgba(245,158,11,0.12)' : 'rgba(59,130,246,0.08)')
                  : (dark ? 'rgba(255,255,255,0.03)' : '#f8f9fa'),
                borderBottom: `1px solid ${sel ? (dark ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.15)') : fieldBorder}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: sel ? accent : labelColor }}>
                    V{i + 1}
                  </span>
                  {v.name && (
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: sel ? accent : labelColor }}>
                      {v.name}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => selectVariation(i)}
                  style={{
                    fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 8,
                    cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Inter, sans-serif',
                    background: sel ? accent : 'transparent',
                    color: sel ? (dark ? '#111827' : '#fff') : labelColor,
                    border: `1.5px solid ${sel ? accent : (dark ? 'rgba(255,255,255,0.15)' : '#d1d5db')}`,
                  }}
                >
                  {sel ? '✓ Selected' : 'Select'}
                </button>
              </div>

              {/* Fields */}
              {FIELDS.map(({ key, label, hint }, fi) => (
                <div key={key} style={{
                  padding: '10px 14px',
                  borderBottom: fi < FIELDS.length - 1 ? `1px solid ${fieldBorder}` : 'none',
                }}>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5, color: labelColor }}>
                    {label}
                    {hint && <span style={{ marginLeft: 4, fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 9, color: hintColor }}>{hint}</span>}
                  </label>
                  <AutoTextarea
                    value={v[key] || ''}
                    onChange={e => updateLocal(i, key, e.target.value)}
                    style={{
                      width: '100%', padding: '7px 10px', borderRadius: 8,
                      fontSize: 12, fontFamily: 'Inter, sans-serif',
                      outline: 'none', resize: 'none',
                      backgroundColor: sel ? inputBgSel : inputBg,
                      border: `1px solid ${sel ? inputBorderSel : inputBorder}`,
                      color: textColor,
                      lineHeight: 1.5,
                      transition: 'border-color 0.15s, background-color 0.15s',
                    }}
                  />
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
