/**
 * Shared bits for the Welcome Flow screens.
 * Styling follows the existing app: theme-aware, accent #3b82f6 light /
 * #f59e0b dark, 14px radius cards, translucent surfaces.
 */

import { useTheme } from '../../context/ThemeContext'
import { WF_STATUS } from '../store/welcomeFlowStore'
import { wfWeekLabel } from '../wfWeeks'

export function useWfTheme() {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  return {
    dark,
    accent:      dark ? '#f59e0b' : '#3b82f6',
    accentHover: dark ? '#d97706' : '#2563eb',
    onAccent:    dark ? '#111827' : '#ffffff',
    text:        dark ? 'rgba(255,255,255,0.88)' : '#111827',
    muted:       dark ? 'rgba(255,255,255,0.42)' : '#6b7280',
    faint:       dark ? 'rgba(255,255,255,0.28)' : '#9ca3af',
    cardBg:      dark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.72)',
    border:      dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
    borderHover: dark ? 'rgba(255,255,255,0.15)' : 'rgba(59,130,246,0.25)',
    inputBg:     dark ? 'rgba(255,255,255,0.04)' : '#ffffff',
    pageBg:      'transparent',
  }
}

export function WfCard({ children, hovered = false, style = {}, ...rest }) {
  const t = useWfTheme()
  return (
    <div
      {...rest}
      style={{
        background: t.cardBg,
        border: `1px solid ${hovered ? t.borderHover : t.border}`,
        borderRadius: 14,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        transition: 'all .2s ease',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered
          ? (t.dark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(59,130,246,0.1)')
          : 'none',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function WfButton({ children, variant = 'primary', style = {}, ...rest }) {
  const t = useWfTheme()
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
    fontFamily: 'Inter, sans-serif', cursor: rest.disabled ? 'not-allowed' : 'pointer',
    opacity: rest.disabled ? 0.5 : 1, transition: 'all .15s ease', letterSpacing: '-0.01em',
  }
  const skins = {
    primary: { background: t.accent, border: `1px solid ${t.accent}`, color: t.onAccent },
    ghost:   { background: 'transparent', border: `1px solid ${t.border}`, color: t.text },
    subtle:  { background: t.dark ? 'rgba(255,255,255,0.06)' : '#f3f4f6', border: '1px solid transparent', color: t.text },
  }
  return <button {...rest} style={{ ...base, ...skins[variant], ...style }}>{children}</button>
}

export function WfInput({ style = {}, ...rest }) {
  const t = useWfTheme()
  return (
    <input
      {...rest}
      style={{
        width: '100%', padding: '10px 12px', borderRadius: 10,
        border: `1px solid ${t.border}`, background: t.inputBg, color: t.text,
        fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none',
        ...style,
      }}
    />
  )
}

export function WfStatusPill({ status }) {
  const t = useWfTheme()
  const meta = WF_STATUS[status] || WF_STATUS.draft
  const tones = {
    good:    { fg: '#16a34a', bg: t.dark ? 'rgba(22,163,74,0.16)'  : 'rgba(22,163,74,0.10)'  },
    warn:    { fg: '#b45309', bg: t.dark ? 'rgba(180,83,9,0.18)'   : 'rgba(245,158,11,0.14)' },
    info:    { fg: '#2563eb', bg: t.dark ? 'rgba(37,99,235,0.18)'  : 'rgba(59,130,246,0.12)' },
    neutral: { fg: t.muted,   bg: t.dark ? 'rgba(255,255,255,0.07)': 'rgba(0,0,0,0.05)'      },
  }
  const c = tones[meta.tone]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 999, background: c.bg, color: c.fg,
      fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: 999, background: c.fg, display: 'inline-block' }} />
      {meta.label}
    </span>
  )
}

/**
 * Back / step chip / Next, one bar at the top of every step of an email.
 *
 * It sits in the same place on every page whatever the page holds: the bar
 * breaks out of the page's own column to span the window, sticks to the top
 * as the page scrolls, and lays its three parts on a fixed grid, so the chip
 * is always dead centre and Back and Next always sit at the same edges. The
 * chip names the email by its place in the flow (Email 6 · Step 2 of 5), not
 * by the order it was created in. Next is omitted when a step has nowhere
 * to go yet.
 */
export function WfStepNav({ backLabel = 'Back', onBack, nextLabel, onNext, nextDisabled = false, email = null, step = null, totalSteps = 5 }) {
  const t = useWfTheme()
  const emailName = email?.week ? wfWeekLabel(email.week).split(' · ')[0] : (email?.position ? `Email ${String(email.position).padStart(2, '0')}` : '')
  const chip = step ? `${emailName ? emailName + ' · ' : ''}Step ${step} of ${totalSteps}` : ''
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 20,
      width: '100vw', marginLeft: 'calc(50% - 50vw)', marginBottom: 18,
      background: t.dark ? 'rgba(11, 18, 32, 0.88)' : 'rgba(246, 248, 251, 0.88)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      borderBottom: `1px solid ${t.border}`,
    }}>
      <div style={{
        maxWidth: 1500, margin: '0 auto', padding: '12px 24px',
        display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12,
      }}>
        <div style={{ justifySelf: 'start' }}>
          <WfButton variant="ghost" onClick={onBack}>&larr; {backLabel}</WfButton>
        </div>
        <div style={{ justifySelf: 'center', minHeight: 26, display: 'flex', alignItems: 'center' }}>
          {chip && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', padding: '5px 13px', borderRadius: 999,
              background: t.dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.72)',
              border: `1px solid ${t.border}`, fontSize: 11, fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase', color: t.muted, whiteSpace: 'nowrap',
            }}>{chip}</span>
          )}
        </div>
        <div style={{ justifySelf: 'end' }}>
          {onNext
            ? <WfButton onClick={onNext} disabled={nextDisabled}>{nextLabel} &rarr;</WfButton>
            : <span />}
        </div>
      </div>
    </div>
  )
}

export function WfPageHeader({ title, subtitle, right }) {
  const t = useWfTheme()
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: t.text, letterSpacing: '-0.02em', margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: t.muted, margin: '5px 0 0' }}>{subtitle}</p>}
      </div>
      {right && <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{right}</div>}
    </div>
  )
}
