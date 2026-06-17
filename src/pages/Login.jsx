import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { IconDiamond, IconEye, IconEyeOff, IconArrowLeft } from '@tabler/icons-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const LOGIN_TABLE = 'Email Login'

// Steps: 'name' → 'set-pin' (first time) | 'enter-pin' (returning)
export default function Login() {
  const { login }  = useAuth()
  const { theme }  = useTheme()
  const navigate   = useNavigate()
  const dark = theme === 'dark'

  const [step,       setStep]       = useState('name')   // 'name' | 'set-pin' | 'enter-pin'
  const [name,       setName]       = useState('')
  const [pin,        setPin]        = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [showPin,    setShowPin]    = useState(false)
  const [showConf,   setShowConf]   = useState(false)
  const [error,      setError]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [userData,   setUserData]   = useState(null)  // row from DB

  const bg      = dark ? '#0a0a0a'                 : '#f8fafc'
  const cardBg  = dark ? '#141414'                 : '#ffffff'
  const border  = dark ? 'rgba(255,255,255,0.09)'  : '#e5e7eb'
  const textCol = dark ? 'rgba(255,255,255,0.9)'   : '#111827'
  const subCol  = dark ? 'rgba(255,255,255,0.35)'  : '#9ca3af'
  const inputBg = dark ? 'rgba(255,255,255,0.05)'  : '#f9fafb'
  const accent  = dark ? '#f59e0b'                 : '#3b82f6'

  function inputStyle(focused) {
    return {
      width: '100%', boxSizing: 'border-box',
      padding: '11px 14px', borderRadius: 10,
      background: inputBg,
      border: `1.5px solid ${border}`,
      color: textCol, fontSize: 14,
      fontFamily: 'Inter, sans-serif',
      outline: 'none', transition: 'border-color 0.15s',
    }
  }

  // Step 1 — look up name
  async function handleNameSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')

    try {
      const { data, error: dbErr } = await supabase
        .from(LOGIN_TABLE)
        .select('id, Name, PIN, Role')
        .ilike('Name', name.trim())
        .single()

      if (dbErr || !data) {
        setError('Name not found. Please check and try again.')
        setLoading(false)
        return
      }

      setUserData(data)
      setPin('')
      setPinConfirm('')
      setStep(data.PIN === null || data.PIN === undefined ? 'set-pin' : 'enter-pin')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Step 2a — set PIN for first time
  async function handleSetPin(e) {
    e.preventDefault()
    if (pin.length < 4) { setError('PIN must be at least 4 digits.'); return }
    if (pin !== pinConfirm) { setError('PINs do not match. Please try again.'); return }
    setLoading(true)
    setError('')

    try {
      const { error: updateErr } = await supabase
        .from(LOGIN_TABLE)
        .update({ PIN: Number(pin) })
        .eq('id', userData.id)

      if (updateErr) throw updateErr

      login({ id: userData.id, name: userData.Name, role: userData.Role || 'Standard' })
      navigate('/', { replace: true })
    } catch {
      setError('Could not save your PIN. Please try again.')
      setLoading(false)
    }
  }

  // Step 2b — verify PIN for returning user
  async function handleEnterPin(e) {
    e.preventDefault()
    if (!pin.trim()) return
    setError('')

    if (String(userData.PIN) !== pin.trim()) {
      setError('Incorrect PIN. Please try again.')
      return
    }

    login({ id: userData.id, name: userData.Name, role: userData.Role || 'Standard' })
    navigate('/', { replace: true })
  }

  function goBack() {
    setStep('name')
    setPin('')
    setPinConfirm('')
    setError('')
    setUserData(null)
  }

  const canContinueName  = name.trim().length > 0
  const canSetPin        = pin.length >= 4 && pinConfirm.length >= 4
  const canEnterPin      = pin.length > 0

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: bg, position: 'relative', overflow: 'hidden',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: dark
          ? 'radial-gradient(ellipse 60% 40% at 50% 30%, rgba(245,158,11,0.06) 0%, transparent 70%)'
          : 'radial-gradient(ellipse 60% 40% at 50% 30%, rgba(59,130,246,0.08) 0%, transparent 70%)',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400, margin: '0 auto', padding: '0 20px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            <div style={{
              background: cardBg,
              border: `1.5px solid ${border}`,
              borderRadius: 20,
              padding: '40px 36px',
              boxShadow: dark ? '0 24px 80px rgba(0,0,0,0.6)' : '0 24px 80px rgba(0,0,0,0.08)',
            }}>

              {/* Logo */}
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

              {/* ── STEP: name ── */}
              {step === 'name' && (
                <>
                  <div style={{ marginBottom: 28 }}>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: textCol, margin: 0, letterSpacing: '-0.03em' }}>
                      Welcome back
                    </h1>
                    <p style={{ fontSize: 13, color: subCol, margin: '6px 0 0', lineHeight: 1.5 }}>
                      Enter your name to get started
                    </p>
                  </div>

                  <form onSubmit={handleNameSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: subCol, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 7 }}>
                        Your Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => { setName(e.target.value); setError('') }}
                        placeholder="e.g. Alicia"
                        autoFocus
                        autoComplete="off"
                        style={inputStyle()}
                        onFocus={e => e.target.style.borderColor = accent}
                        onBlur={e  => e.target.style.borderColor = border}
                      />
                    </div>

                    {error && <ErrorBox dark={dark} message={error} />}

                    <button
                      type="submit"
                      disabled={!canContinueName || loading}
                      style={submitStyle(canContinueName && !loading, accent, subCol, dark)}
                    >
                      {loading ? 'Looking up…' : 'Continue →'}
                    </button>
                  </form>
                </>
              )}

              {/* ── STEP: set-pin (first time) ── */}
              {step === 'set-pin' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
                    <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: subCol }}>
                      <IconArrowLeft size={18} stroke={1.8} />
                    </button>
                    <div>
                      <h1 style={{ fontSize: 22, fontWeight: 700, color: textCol, margin: 0, letterSpacing: '-0.03em' }}>
                        Hi, {userData?.Name}!
                      </h1>
                      <p style={{ fontSize: 13, color: subCol, margin: '4px 0 0', lineHeight: 1.5 }}>
                        Set a PIN — you'll use it every time you log in
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSetPin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <PinField
                      label="Choose a PIN"
                      hint="At least 4 digits"
                      value={pin}
                      onChange={v => { setPin(v); setError('') }}
                      show={showPin}
                      onToggleShow={() => setShowPin(v => !v)}
                      accent={accent}
                      border={border}
                      inputBg={inputBg}
                      textCol={textCol}
                      subCol={subCol}
                    />
                    <PinField
                      label="Confirm PIN"
                      value={pinConfirm}
                      onChange={v => { setPinConfirm(v); setError('') }}
                      show={showConf}
                      onToggleShow={() => setShowConf(v => !v)}
                      accent={accent}
                      border={border}
                      inputBg={inputBg}
                      textCol={textCol}
                      subCol={subCol}
                    />

                    {error && <ErrorBox dark={dark} message={error} />}

                    <button
                      type="submit"
                      disabled={!canSetPin || loading}
                      style={submitStyle(canSetPin && !loading, accent, subCol, dark)}
                    >
                      {loading ? 'Saving…' : 'Set PIN & Sign In'}
                    </button>
                  </form>
                </>
              )}

              {/* ── STEP: enter-pin (returning) ── */}
              {step === 'enter-pin' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
                    <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: subCol }}>
                      <IconArrowLeft size={18} stroke={1.8} />
                    </button>
                    <div>
                      <h1 style={{ fontSize: 22, fontWeight: 700, color: textCol, margin: 0, letterSpacing: '-0.03em' }}>
                        Hi, {userData?.Name}!
                      </h1>
                      <p style={{ fontSize: 13, color: subCol, margin: '4px 0 0', lineHeight: 1.5 }}>
                        Enter your PIN to continue
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleEnterPin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <PinField
                      label="Your PIN"
                      value={pin}
                      onChange={v => { setPin(v); setError('') }}
                      show={showPin}
                      onToggleShow={() => setShowPin(v => !v)}
                      autoFocus
                      accent={accent}
                      border={border}
                      inputBg={inputBg}
                      textCol={textCol}
                      subCol={subCol}
                    />

                    {error && <ErrorBox dark={dark} message={error} />}

                    <button
                      type="submit"
                      disabled={!canEnterPin || loading}
                      style={submitStyle(canEnterPin && !loading, accent, subCol, dark)}
                    >
                      {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                  </form>
                </>
              )}

            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function PinField({ label, hint, value, onChange, show, onToggleShow, autoFocus, accent, border, inputBg, textCol, subCol }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: subCol, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 7 }}>
        {label}{hint && <span style={{ fontWeight: 400, marginLeft: 6, textTransform: 'none', letterSpacing: 0 }}>{hint}</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          inputMode="numeric"
          value={value}
          onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
          placeholder="••••"
          maxLength={8}
          autoFocus={autoFocus}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '11px 44px 11px 14px', borderRadius: 10,
            background: inputBg, border: `1.5px solid ${border}`,
            color: textCol, fontSize: 14,
            fontFamily: 'Inter, sans-serif', outline: 'none',
            transition: 'border-color 0.15s',
            letterSpacing: show ? '0.1em' : '0.25em',
          }}
          onFocus={e => e.target.style.borderColor = accent}
          onBlur={e  => e.target.style.borderColor = border}
        />
        <button
          type="button"
          onClick={onToggleShow}
          style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 4, display: 'flex', color: subCol,
          }}
        >
          {show
            ? <IconEyeOff size={16} stroke={1.8} />
            : <IconEye    size={16} stroke={1.8} />
          }
        </button>
      </div>
    </div>
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

function submitStyle(active, accent, subCol, dark) {
  return {
    marginTop: 4,
    padding: '12px 0', borderRadius: 11, border: 'none',
    background: active ? accent : (dark ? 'rgba(255,255,255,0.07)' : '#e5e7eb'),
    color: active ? '#fff' : subCol,
    fontSize: 14, fontWeight: 700,
    cursor: active ? 'pointer' : 'not-allowed',
    transition: 'all 0.18s',
    letterSpacing: '-0.01em',
  }
}
