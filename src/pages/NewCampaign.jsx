/**
 * NewCampaign — simplified wizard
 * Steps: 1 Prompt → 2 Copy → 3 Images → 4 Preview → 5 Approve
 */
import { useCampaignStore } from '../store/campaignStore'
import { useCopyGeneration } from '../hooks/useCopyGeneration'
import { logToSheets } from '../lib/api'

import { motion } from 'framer-motion'
import { IconSparkles } from '@tabler/icons-react'
import PromptForm      from '../components/PromptForm'
import CopyEditor      from '../components/CopyEditor'
import ImagePicker     from '../components/ImagePicker'
import TemplatePreview from '../components/TemplatePreview'
import ApprovalPanel   from '../components/ApprovalPanel'
import { useTheme }    from '../context/ThemeContext'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, delay: i * 0.12, ease: [0.25, 0.4, 0.25, 1] },
  }),
}

const darkBtn = (dark) => dark
  ? { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }
  : {}

const primaryBtn = (dark) => dark
  ? { background: '#f59e0b', color: '#111827', border: '1.5px solid #f59e0b', boxShadow: '0 2px 12px rgba(245,158,11,0.3)' }
  : { background: '#3b82f6', color: '#fff',    border: '1.5px solid #3b82f6', boxShadow: '0 2px 12px rgba(59,130,246,0.25)' }

/* Full-width nav bar — rendered outside the content container */
function StepNav({ step, dark, left, right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '20px 28px',
      width: '100%',
    }}>
      <div style={{ flex: 1 }}>{left || <span />}</div>

      <motion.span
        variants={fadeUp} initial="hidden" animate="visible" custom={0}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 999, flexShrink: 0,
          background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
          border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(59,130,246,0.18)'}`,
          backdropFilter: 'blur(8px)',
          fontSize: 14, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: dark ? 'rgba(255,255,255,0.4)' : '#6b7280',
        }}
      >
        <IconSparkles size={11} color={dark ? '#f59e0b' : '#3b82f6'} stroke={2} />
        {step}
      </motion.span>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>{right || <span />}</div>
    </div>
  )
}

/* Title + subtitle block — rendered inside the content container */
function StepHeading({ title1, title2, sub, dark }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 28 }}>
      <motion.h1
        variants={fadeUp} initial="hidden" animate="visible" custom={1}
        style={{ fontSize: 'clamp(30px, 4vw, 48px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 8 }}
      >
        <span className={`bg-clip-text text-transparent ${dark
          ? 'bg-gradient-to-b from-white to-white/75'
          : 'bg-gradient-to-b from-gray-900 to-gray-700'}`}>
          {title1}
        </span>
        {' '}
        <span className={`bg-clip-text text-transparent ${dark
          ? 'bg-gradient-to-r from-amber-300 via-orange-200 to-yellow-300'
          : 'bg-gradient-to-r from-blue-500 via-indigo-400 to-sky-400'}`}>
          {title2}
        </span>
      </motion.h1>
      <motion.p
        variants={fadeUp} initial="hidden" animate="visible" custom={2}
        style={{ fontSize: 17, color: dark ? 'rgba(255,255,255,0.45)' : '#6b7280', fontWeight: 500, letterSpacing: '0.01em', paddingBottom: 15 }}
      >
        {sub}
      </motion.p>
    </div>
  )
}

const STEPS = [
  { id: 1, label: 'Brief'   },
  { id: 2, label: 'Copy'    },
  { id: 3, label: 'Images'  },
  { id: 4, label: 'Preview' },
  { id: 5, label: 'Approve' },
]

export default function NewCampaign() {
  const { generate } = useCopyGeneration()
  const { theme } = useTheme()
  const dark = theme === 'dark'

  const { currentStep, setStep, selectedClient, generatedCopy, prompt, error } = useCampaignStore((s) => ({
    currentStep:    s.currentStep,
    setStep:        s.setStep,
    selectedClient: s.selectedClient,
    generatedCopy:  s.generatedCopy,
    prompt:         s.prompt,
    error:          s.error,
  }))

  async function handlePickImages() {
    try {
      await logToSheets({ client: selectedClient, generatedCopy, variationLabel: 'Variation - Selected' })
    } catch (e) {
      console.warn('[NewCampaign] Sheet log failed (non-fatal):', e.message)
    }
    setStep(3)
  }

  async function handleGenerate() {
    await generate({ client: selectedClient, prompt })
  }

  const isWideStep = currentStep === 2 || currentStep === 3 || currentStep === 4

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>

      {/* ── Full-width step progress bar ── */}
      <div style={{ padding: '20px 28px 0' }}>
        <div className="flex items-center gap-1" style={{
          maxWidth: 560, margin: '0 auto',
          padding: '12px 16px',
          background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          borderRadius: 14,
          border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
        }}>
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1 flex-1">
              <button onClick={() => currentStep > s.id && setStep(s.id)} style={{
                width: 30, height: 30, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                fontSize: 14, fontWeight: 700, border: 'none',
                cursor: currentStep > s.id ? 'pointer' : 'default', transition: 'all 0.18s',
                background: currentStep === s.id ? (dark ? '#f59e0b' : '#3b82f6') :
                            currentStep  > s.id ? (dark ? 'rgba(245,158,11,0.2)' : '#dbeafe') :
                            (dark ? 'rgba(255,255,255,0.06)' : '#f3f4f6'),
                color: currentStep === s.id ? (dark ? '#111827' : '#fff') :
                       currentStep  > s.id ? (dark ? '#f59e0b' : '#3b82f6') :
                       (dark ? 'rgba(255,255,255,0.3)' : '#9ca3af'),
              }}>{s.id}</button>
              <span style={{
                fontSize: 15, fontWeight: currentStep === s.id ? 600 : 400, display: 'none',
                color: currentStep === s.id ? (dark ? '#f59e0b' : '#1d4ed8') : (dark ? 'rgba(255,255,255,0.3)' : '#9ca3af'),
              }} className="sm:inline truncate">{s.label}</span>
              {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, margin: '0 4px', background: dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb' }} />}
            </div>
          ))}
        </div>
      </div>

      {/* ── Full-width nav row (back / badge / next) — always at page edges ── */}
      {currentStep === 1 && <StepNav step="Step 1 of 5" dark={dark} />}
      {currentStep === 2 && <StepNav step="Step 2 of 5" dark={dark}
        left={<button onClick={() => setStep(1)} className="btn-secondary" style={darkBtn(dark)}>← Back</button>}
        right={<button onClick={handlePickImages} style={{ ...primaryBtn(dark), display:'inline-flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:10, fontSize:13, fontWeight:600, fontFamily:'Inter,sans-serif', cursor:'pointer' }}>Next: Pick Images →</button>}
      />}
      {currentStep === 3 && <StepNav step="Step 3 of 5" dark={dark}
        left={<button onClick={() => setStep(2)} className="btn-secondary" style={darkBtn(dark)}>← Back</button>}
        right={<button onClick={() => setStep(4)} style={{ ...primaryBtn(dark), display:'inline-flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:10, fontSize:13, fontWeight:600, fontFamily:'Inter,sans-serif', cursor:'pointer' }}>Next: Preview →</button>}
      />}
      {currentStep === 4 && <StepNav step="Step 4 of 5" dark={dark}
        left={<button onClick={() => setStep(3)} className="btn-secondary" style={darkBtn(dark)}>← Back</button>}
        right={<button onClick={() => setStep(5)} style={{ ...primaryBtn(dark), display:'inline-flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:10, fontSize:13, fontWeight:600, fontFamily:'Inter,sans-serif', cursor:'pointer' }}>Looks Good — Approve →</button>}
      />}
      {currentStep === 5 && <StepNav step="Step 5 of 5" dark={dark}
        left={<button onClick={() => setStep(4)} className="btn-secondary" style={darkBtn(dark)}>← Back to Preview</button>}
      />}

      {/* ── Content container ── */}
      <div style={{ width: '100%', maxWidth: isWideStep ? '100%' : 1100, margin: '0 auto', padding: '0 28px 48px' }}>

        {error && (
          <div style={{ background: 'rgba(254,242,242,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(252,165,165,0.5)', borderRadius: 12, padding: '12px 16px', fontSize: 15, color: '#b91c1c', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {currentStep === 1 && <>
          <StepHeading title1="Campaign" title2="Brief" sub="Select your client and describe the campaign goal." dark={dark} />
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3} className="card"
            style={dark ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'none' } : {}}>
            <PromptForm onGenerate={handleGenerate} dark={dark} />
          </motion.div>
        </>}

        {currentStep === 2 && <>
          <StepHeading title1="Generated" title2="Copy" sub="Review and refine your AI-written email variations." dark={dark} />
          <CopyEditor />
          <div style={{ paddingBottom: 48 }} />
        </>}

        {currentStep === 3 && <>
          <StepHeading title1="Pick" title2="Images" sub="Select visuals from your media library." dark={dark} />
          <ImagePicker />
          <div style={{ paddingBottom: 48 }} />
        </>}

        {currentStep === 4 && <>
          <StepHeading title1="Live" title2="Preview" sub="This is not an actual template — just a visual overview of your content." dark={dark} />
          <TemplatePreview />
          <div style={{ paddingBottom: 48 }} />
        </>}

        {currentStep === 5 && <>
          <StepHeading title1="Approve &" title2="Publish" sub="Push your approved email directly to GoHighLevel." dark={dark} />
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3} className="card"
            style={dark ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'none' } : {}}>
            <ApprovalPanel />
          </motion.div>
        </>}

      </div>
    </div>
  )
}
