/**
 * CopyEditor — Step 3
 * Shows all 3 n8n-generated variations as tabs.
 * User picks one, then can tweak any field inline before moving to images.
 */
import { useEffect, useState } from 'react'
import { useCampaignStore } from '../store/campaignStore'

const FIELDS = [
  { key: 'subjectLine',     label: 'Subject Line',       tag: 'input',    hint: 'Keep under 50 chars' },
  { key: 'previewText',     label: 'Preview Text',        tag: 'input',    hint: 'Shows below subject in inbox' },
  { key: 'headlineText',    label: 'Hero Headline',       tag: 'input',    hint: '' },
  { key: 'subhead',         label: 'Subhead',             tag: 'input',    hint: '' },
  { key: 'bodyText',        label: 'Body Copy',           tag: 'textarea', hint: '' },
  { key: 'bodyBlock2Title', label: 'Body Block 2 Title',  tag: 'input',    hint: '' },
  { key: 'bodyBlock2',      label: 'Body Block 2',        tag: 'textarea', hint: '' },
  { key: 'ctaText',         label: 'CTA Button Text',     tag: 'input',    hint: 'e.g. "Reserve Your Cabin →"' },
  { key: 'ctaUrl',          label: 'CTA URL',             tag: 'input',    hint: 'Full URL with https://' },
  { key: 'closingLine',     label: 'Closing Line',        tag: 'input',    hint: '' },
]

// ── Elapsed timer shown while n8n is running ──────────────────────────────
function GeneratingSpinner() {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const msg =
    elapsed < 10 ? 'Sending brief to n8n…' :
    elapsed < 20 ? 'n8n is researching your brand…' :
    elapsed < 35 ? 'Writing copy variations…' :
                   'Almost done, finishing variation 3…'

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-gray-500">
      <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm font-medium">{msg}</p>
      <p className="text-xs text-gray-400">{elapsed}s elapsed</p>
      <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-500 rounded-full transition-all duration-1000"
          style={{ width: `${Math.min((elapsed / 45) * 100, 95)}%` }}
        />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────
export default function CopyEditor() {
  const {
    variations, selectedVariation, pickVariation,
    generatedCopy, setGeneratedCopy,
    isGenerating,
  } = useCampaignStore((s) => ({
    variations:        s.variations,
    selectedVariation: s.selectedVariation,
    pickVariation:     s.pickVariation,
    generatedCopy:     s.generatedCopy,
    setGeneratedCopy:  s.setGeneratedCopy,
    isGenerating:      s.isGenerating,
  }))

  function update(field, value) {
    setGeneratedCopy({ ...generatedCopy, [field]: value })
  }

  if (isGenerating) return <GeneratingSpinner />

  return (
    <div className="space-y-5">

      {/* Variation tabs — only show if n8n returned multiple */}
      {variations.length > 1 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            n8n generated {variations.length} variations — pick one to work with:
          </p>
          <div className="flex gap-2 flex-wrap">
            {variations.map((v, i) => (
              <button
                key={v.id}
                onClick={() => pickVariation(i)}
                className={[
                  'px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all text-left',
                  selectedVariation === i
                    ? 'border-brand-700 bg-brand-50 text-brand-900'
                    : 'border-gray-200 text-gray-600 hover:border-brand-300',
                ].join(' ')}
              >
                <span className="font-semibold">V{v.id}</span>
                {v.name && <span className="ml-1 text-xs font-normal opacity-70">— {v.name}</span>}
                {/* Subject line preview */}
                {v.subjectLine && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">
                    {v.subjectLine}
                  </p>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Selected: <strong>Variation {selectedVariation + 1}</strong> — all fields below are editable.
          </p>
        </div>
      )}

      {/* Editable fields for the selected variation */}
      <div className="space-y-4">
        {FIELDS.map(({ key, label, tag, hint }) => (
          <div key={key}>
            <label className="block text-sm font-medium mb-1">
              {label}
              {hint && <span className="ml-2 text-xs text-gray-400 font-normal">{hint}</span>}
            </label>
            {tag === 'textarea' ? (
              <textarea
                rows={key === 'bodyText' ? 6 : 3}
                value={generatedCopy[key] || ''}
                onChange={(e) => update(key, e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
              />
            ) : (
              <input
                type="text"
                value={generatedCopy[key] || ''}
                onChange={(e) => update(key, e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
