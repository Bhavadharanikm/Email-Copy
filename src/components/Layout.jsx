import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import { useCampaignStore } from '../store/campaignStore'
import { IconDiamond, IconSun, IconMoon, IconMessageCircle, IconCalendar, IconX, IconCheck } from '@tabler/icons-react'
import { useTheme } from '../context/ThemeContext'
import { submitFeedback } from '../lib/api'

const SECTIONS = [
  'Subject Line',
  'Preview Text',
  'Hero Headline',
  'Subhead',
  'Body Text',
  'Body Block 2 Title',
  'Body Block 2',
  'CTA',
  'Closing Line',
  'Hero Image',
  'Polaroid / Gallery Images',
  'Logo',
  'Overall Email',
]

function FeedbackModal({ dark, onClose }) {
  const [section,  setSection]  = useState('')
  const [feedback, setFeedback] = useState('')
  const [sent,     setSent]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error,    setError]    = useState('')
  const modalRef   = useRef(null)
  const clientName = useCampaignStore((s) => s.selectedClient?.name || '')

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (modalRef.current && !modalRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!section || !feedback.trim()) return
    setSubmitting(true)
    setError('')
    try {
      await submitFeedback({ section, feedback, clientName })
      setSent(true)
      setTimeout(() => { setSent(false); setSection(''); setFeedback(''); onClose() }, 1800)
    } catch (err) {
      setError('Could not save feedback. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const border  = dark ? 'rgba(255,255,255,0.1)'  : '#e5e7eb'
  const bg      = dark ? '#141414'                 : '#ffffff'
  const textCol = dark ? 'rgba(255,255,255,0.85)'  : '#111827'
  const subCol  = dark ? 'rgba(255,255,255,0.35)'  : '#9ca3af'
  const inputBg = dark ? 'rgba(255,255,255,0.05)'  : '#f9fafb'

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0,  scale: 1     }}
      exit={{    opacity: 0, y: -8, scale: 0.97  }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      ref={modalRef}
      style={{
        position: 'absolute', top: 52, right: 0, zIndex: 200,
        width: 340,
        background: bg,
        border: `1.5px solid ${border}`,
        borderRadius: 16,
        boxShadow: dark
          ? '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)'
          : '0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
        padding: '20px 20px 16px',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: textCol, letterSpacing: '-0.01em' }}>Leave Feedback</div>
          <div style={{ fontSize: 11, color: subCol, marginTop: 2 }}>Flag a section for revision</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', color: subCol }}>
          <IconX size={16} stroke={2} />
        </button>
      </div>

      {sent ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px 0' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconCheck size={20} color="#fff" stroke={2.5} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: textCol }}>Feedback noted!</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Section picker */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: subCol, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
              Section
            </label>
            <select
              value={section}
              onChange={e => setSection(e.target.value)}
              required
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 9,
                background: inputBg, border: `1.5px solid ${border}`,
                color: section ? textCol : subCol,
                fontSize: 13, fontFamily: 'Inter, sans-serif',
                outline: 'none', cursor: 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
                paddingRight: 32,
              }}
            >
              <option value="" disabled>Select a section…</option>
              {SECTIONS.map(s => (
                <option key={s} value={s} style={{ background: bg, color: textCol }}>{s}</option>
              ))}
            </select>
          </div>

          {/* Feedback textarea */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: subCol, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
              Feedback
            </label>
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              required
              placeholder="What needs to change?"
              rows={4}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 9,
                background: inputBg, border: `1.5px solid ${border}`,
                color: textCol, fontSize: 13, fontFamily: 'Inter, sans-serif',
                resize: 'vertical', outline: 'none', lineHeight: 1.6,
                boxSizing: 'border-box',
              }}
              onFocus={e  => e.target.style.borderColor = dark ? 'rgba(255,255,255,0.3)' : '#6b7280'}
              onBlur={e   => e.target.style.borderColor = border}
            />
          </div>

          {error && (
            <div style={{ fontSize: 11, color: '#ef4444', textAlign: 'center' }}>{error}</div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!section || !feedback.trim() || submitting}
            style={{
              padding: '9px 0', borderRadius: 9, border: 'none',
              background: section && feedback.trim() && !submitting
                ? (dark ? '#f59e0b' : '#111827')
                : (dark ? 'rgba(255,255,255,0.06)' : '#e5e7eb'),
              color: section && feedback.trim() && !submitting
                ? (dark ? '#111827' : '#ffffff')
                : subCol,
              fontSize: 13, fontWeight: 700,
              cursor: section && feedback.trim() && !submitting ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
            }}
          >
            {submitting ? 'Saving…' : 'Submit Feedback'}
          </button>
        </form>
      )}
    </motion.div>
  )
}

/* ─── Floating pill shape ─────────────────────────────────────── */
function BgShape({ className, delay = 0, width = 260, height = 55, rotate = 0, gradient }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -60, rotate: rotate - 10 }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={{ duration: 2.4, delay, ease: [0.23, 0.86, 0.39, 0.96], opacity: { duration: 1.4 } }}
      className={`absolute pointer-events-none ${className}`}
    >
      <motion.div
        animate={{ y: [0, 14, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width, height }}
        className="relative"
      >
        <div className={[
          'absolute inset-0 rounded-full',
          'bg-gradient-to-r to-transparent',
          gradient,
          'backdrop-blur-[2px] border-2 border-white/[0.15]',
          'shadow-[0_8px_32px_0_rgba(255,255,255,0.08)]',
        ].join(' ')} />
      </motion.div>
    </motion.div>
  )
}

export default function Layout() {
  const resetCampaign = useCampaignStore((s) => s.resetCampaign)
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  function handleCalendar() { navigate('/calendar') }

  function handleNewCampaign() {
    resetCampaign()
    navigate('/campaign/new')
  }

  /* ── Shape sets ── */
  const shapes = dark
    ? [
        { delay: 0.2, width: 300, height: 65,  rotate: 12,  gradient: 'from-amber-500/[0.13]',  className: 'left-[-3%]  top-[18%]'    },
        { delay: 0.4, width: 220, height: 50,  rotate: -15, gradient: 'from-orange-500/[0.12]', className: 'right-[-2%] top-[42%]'   },
        { delay: 0.3, width: 160, height: 38,  rotate: -8,  gradient: 'from-yellow-500/[0.12]', className: 'left-[6%]   bottom-[18%]' },
        { delay: 0.5, width: 120, height: 30,  rotate: 20,  gradient: 'from-amber-400/[0.16]',  className: 'right-[14%] top-[7%]'    },
        { delay: 0.6, width: 85,  height: 22,  rotate: -25, gradient: 'from-orange-300/[0.12]', className: 'left-[22%]  top-[5%]'    },
        { delay: 0.7, width: 180, height: 44,  rotate: 8,   gradient: 'from-amber-500/[0.1]',   className: 'right-[4%]  bottom-[22%]' },
      ]
    : [
        { delay: 0.2, width: 300, height: 65,  rotate: 12,  gradient: 'from-blue-400/[0.13]',   className: 'left-[-3%]  top-[18%]'    },
        { delay: 0.4, width: 220, height: 50,  rotate: -15, gradient: 'from-indigo-400/[0.12]', className: 'right-[-2%] top-[42%]'   },
        { delay: 0.3, width: 160, height: 38,  rotate: -8,  gradient: 'from-sky-400/[0.12]',    className: 'left-[6%]   bottom-[18%]' },
        { delay: 0.5, width: 120, height: 30,  rotate: 20,  gradient: 'from-blue-300/[0.16]',   className: 'right-[14%] top-[7%]'    },
        { delay: 0.6, width: 85,  height: 22,  rotate: -25, gradient: 'from-indigo-300/[0.12]', className: 'left-[22%]  top-[5%]'    },
        { delay: 0.7, width: 180, height: 44,  rotate: 8,   gradient: 'from-blue-400/[0.1]',    className: 'right-[4%]  bottom-[22%]' },
      ]

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: dark ? '#0a0a0a' : '#ffffff',
      overflowX: 'hidden',
      position: 'relative',
      transition: 'background 0.3s ease',
    }}>

      {/* ── Global background glow ── */}
      <div
        className={`fixed inset-0 pointer-events-none blur-3xl ${dark
          ? 'bg-gradient-to-br from-amber-500/[0.05] via-transparent to-orange-500/[0.05]'
          : 'bg-gradient-to-br from-blue-100/70 via-white/20 to-indigo-100/50'}`}
        style={{ zIndex: 0 }}
      />

      {/* ── Global floating shapes ── */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        {shapes.map((s, i) => <BgShape key={i} {...s} />)}
      </div>

      {/* ── Nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 28px',
        borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`,
        background: dark ? 'rgba(10,10,10,0.80)' : 'rgba(255,255,255,0.80)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}>
        {/* Logo */}
        <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 32, height: 32,
            background: dark ? '#1a1a1a' : '#111827',
            border: dark ? '1px solid rgba(255,255,255,0.1)' : 'none',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IconDiamond size={15} color={dark ? '#f59e0b' : '#3b82f6'} stroke={1.8} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: dark ? '#fff' : '#111827', letterSpacing: '-0.02em' }}>
            HiddenGem <span style={{ fontWeight: 400, color: dark ? 'rgba(255,255,255,0.3)' : '#9ca3af' }}>Media</span>
          </span>
        </NavLink>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              width: 36, height: 36, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: dark ? 'rgba(255,255,255,0.06)' : '#f3f4f6',
              border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb',
              cursor: 'pointer', transition: 'all 0.18s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}
            onMouseLeave={e => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.06)' : '#f3f4f6'}
          >
            {dark
              ? <IconSun  size={16} color="rgba(255,255,255,0.7)" stroke={1.8} />
              : <IconMoon size={16} color="#6b7280"               stroke={1.8} />
            }
          </button>

          {/* Calendar button — hidden */}

          {/* Feedback button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setFeedbackOpen(o => !o)}
              title="Leave feedback"
              style={{
                width: 36, height: 36, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: feedbackOpen
                  ? (dark ? 'rgba(245,158,11,0.15)' : '#eff6ff')
                  : (dark ? 'rgba(255,255,255,0.06)' : '#f3f4f6'),
                border: feedbackOpen
                  ? `1px solid ${dark ? 'rgba(245,158,11,0.4)' : '#bfdbfe'}`
                  : `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
                cursor: 'pointer', transition: 'all 0.18s',
              }}
              onMouseEnter={e => { if (!feedbackOpen) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.12)' : '#e5e7eb' }}
              onMouseLeave={e => { if (!feedbackOpen) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.06)' : '#f3f4f6' }}
            >
              <IconMessageCircle size={16} color={feedbackOpen ? (dark ? '#f59e0b' : '#3b82f6') : (dark ? 'rgba(255,255,255,0.7)' : '#6b7280')} stroke={1.8} />
            </button>
            <AnimatePresence>
              {feedbackOpen && <FeedbackModal dark={dark} onClose={() => setFeedbackOpen(false)} />}
            </AnimatePresence>
          </div>

          {/* New Campaign */}
          <button
            onClick={handleNewCampaign}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.85)',
              color: dark ? '#fff' : '#111827',
              fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
              padding: '9px 20px', borderRadius: 10,
              border: dark ? '1.5px solid rgba(255,255,255,0.12)' : '1.5px solid #e5e7eb',
              cursor: 'pointer', transition: 'all 0.18s',
              backdropFilter: 'blur(8px)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.13)' : '#f0f4ff'}
            onMouseLeave={e => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.85)'}
          >
            + New Campaign
          </button>
        </div>
      </nav>

      {/* ── Page content ── */}
      <main style={{ position: 'relative', zIndex: 1, flex: 1, width: '100%', padding: 0 }}>
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <div style={{ position: 'relative', zIndex: 1, padding: '0 28px 22px', textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,0.2)' : '#c4c9d4', fontWeight: 400, letterSpacing: '0.02em' }}>
          Hidden Gem Media · Email Production Studio
        </p>
      </div>

    </div>
  )
}
