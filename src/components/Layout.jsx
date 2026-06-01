import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useCampaignStore } from '../store/campaignStore'
import { IconDiamond, IconSun, IconMoon } from '@tabler/icons-react'
import { useTheme } from '../context/ThemeContext'

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
