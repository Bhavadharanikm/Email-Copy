/**
 * Login — one way in: the company Google account.
 *
 * The session comes from the Supabase project the video analyser uses, so the
 * same account opens both tools and there is one place to grant and revoke.
 * AuthContext picks the session up and sends the app on; this page only starts
 * the trip to Google and shows anything that came back wrong.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { IconDiamond } from '@tabler/icons-react'
import { googleAuthReady, startGoogleSignIn } from '../lib/authGoogle'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function Login() {
  const { googleError } = useAuth()
  const { theme } = useTheme()
  const dark = theme === 'dark'

  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState('')

  const bg      = dark ? '#0a0a0a'                : '#f8fafc'
  const cardBg  = dark ? '#141414'                : '#ffffff'
  const border  = dark ? 'rgba(255,255,255,0.09)' : '#e5e7eb'
  const textCol = dark ? 'rgba(255,255,255,0.9)'  : '#111827'
  const subCol  = dark ? 'rgba(255,255,255,0.35)' : '#9ca3af'
  const accent  = dark ? '#f59e0b'                : '#3b82f6'

  async function signIn() {
    setBusy(true)
    setError('')
    try { await startGoogleSignIn() }
    catch (err) { setError(err.message || 'Could not reach Google'); setBusy(false) }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: bg, position: 'relative', overflow: 'hidden', fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: dark
          ? 'radial-gradient(ellipse 60% 40% at 50% 30%, rgba(245,158,11,0.06) 0%, transparent 70%)'
          : 'radial-gradient(ellipse 60% 40% at 50% 30%, rgba(59,130,246,0.08) 0%, transparent 70%)',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400, margin: '0 auto', padding: '0 20px' }}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          <div style={{
            background: cardBg,
            border: `1.5px solid ${border}`,
            borderRadius: 20,
            padding: '40px 36px',
            boxShadow: dark ? '0 24px 80px rgba(0,0,0,0.6)' : '0 24px 80px rgba(0,0,0,0.08)',
          }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
              <div style={{
                width: 36, height: 36,
                background: dark ? '#1a1a1a' : '#111827',
                border: dark ? '1px solid rgba(255,255,255,0.1)' : 'none',
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <IconDiamond size={17} color={accent} stroke={1.8} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: textCol, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  HiddenGem <span style={{ fontWeight: 400, color: subCol }}>Media</span>
                </div>
                <div style={{ fontSize: 11, color: subCol, letterSpacing: '0.02em' }}>Email Production Studio</div>
              </div>
            </div>

            <div style={{ marginBottom: 26 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: textCol, margin: 0, letterSpacing: '-0.03em' }}>
                Welcome back
              </h1>
              <p style={{ fontSize: 13, color: subCol, margin: '6px 0 0', lineHeight: 1.5 }}>
                Sign in with your work account
              </p>
            </div>

            {googleAuthReady ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={signIn}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    padding: '13px 16px', borderRadius: 12, cursor: busy ? 'wait' : 'pointer',
                    fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600,
                    background: dark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                    color: textCol, border: `1.5px solid ${border}`, transition: 'all 0.18s',
                  }}
                >
                  <GoogleMark />
                  {busy ? 'Opening Google…' : 'Continue with Google'}
                </button>
                {(error || googleError) && (
                  <div style={{ marginTop: 14 }}><ErrorBox dark={dark} message={error || googleError} /></div>
                )}
              </>
            ) : (
              <ErrorBox dark={dark} message="Sign-in is not configured on this deployment yet." />
            )}

          </div>
        </motion.div>
      </div>
    </div>
  )
}

/* Google's mark, inline so the button needs no network to draw itself. */
function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8c-.5 2.7-2 5-4.3 6.6v5.5h7c4.1-3.8 6.6-9.4 6.6-16.3z"/>
      <path fill="#34A853" d="M24 46c5.8 0 10.7-1.9 14.3-5.2l-7-5.5c-1.9 1.3-4.4 2.1-7.3 2.1-5.6 0-10.4-3.8-12.1-8.9H4.7v5.6C8.3 41.4 15.6 46 24 46z"/>
      <path fill="#FBBC05" d="M11.9 28.5c-.4-1.3-.7-2.7-.7-4.5s.3-3.2.7-4.5v-5.6H4.7C3 17.3 2 20.5 2 24s1 6.7 2.7 10.1l7.2-5.6z"/>
      <path fill="#EA4335" d="M24 10.6c3.2 0 6 1.1 8.2 3.2l6.2-6.2C34.7 4.1 29.8 2 24 2 15.6 2 8.3 6.6 4.7 13.9l7.2 5.6c1.7-5.1 6.5-8.9 12.1-8.9z"/>
    </svg>
  )
}

function ErrorBox({ dark, message }) {
  return (
    <div style={{
      fontSize: 12, color: '#ef4444',
      background: dark ? 'rgba(239,68,68,0.1)' : '#fef2f2',
      border: '1px solid rgba(239,68,68,0.2)',
      borderRadius: 8, padding: '9px 12px',
      textAlign: 'center',
    }}>
      {message}
    </div>
  )
}
