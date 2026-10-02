/**
 * Repeat Booking — copy (step 2).
 *
 * The three variations side by side, as on the welcome flow's copy step: edit
 * any of them, pick the one to carry forward. Fields the prompt keeps the same
 * in all three (the code, the sign-off, the CTA, the footer) are edited once
 * and written to all three.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconCheck } from '@tabler/icons-react'
import { useRepeatBookingStore } from '../store/repeatBookingStore'
import { useWfTheme, WfCard, WfButton, WfStepNav } from '../../welcome-flow/components/wfUi'
import { RB_COPY_FIELDS, RB_MULTILINE } from '../rbEmails'
import { useRbEmail, rbPath, RBMissing } from '../components/rbShared'

function AutoTextarea({ value, onChange, onBlur, onKeyDown, style }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return <textarea ref={ref} value={value || ''} onChange={onChange} onBlur={onBlur} onKeyDown={onKeyDown}
    rows={1} style={{ ...style, resize: 'none', overflow: 'hidden' }} />
}

/* Cmd/Ctrl+B wraps the selection in ** markers, which the template prints bold. */
function toggleBold(el, onChange) {
  const value = el.value || ''
  const start = el.selectionStart, end = el.selectionEnd
  if (start == null || start === end) return false
  const picked = value.slice(start, end)
  const already = picked.startsWith('**') && picked.endsWith('**') && picked.length > 4
  const around  = value.slice(start - 2, start) === '**' && value.slice(end, end + 2) === '**'
  let next, from, to
  if (already)     { next = value.slice(0, start) + picked.slice(2, -2) + value.slice(end); from = start; to = end - 4 }
  else if (around) { next = value.slice(0, start - 2) + picked + value.slice(end + 2);      from = start - 2; to = end - 2 }
  else             { next = value.slice(0, start) + `**${picked}**` + value.slice(end);      from = start + 2; to = end + 2 }
  onChange(next)
  requestAnimationFrame(() => { try { el.setSelectionRange(from, to) } catch { /* unmounted */ } })
  return true
}

/** The stay types: the same list in every variation, so edited once. The first
    five get a photo slot in the email; any after that show as name and line. */
function UnitsEditor({ units, onChange, onDone, inputFor, withButton = false }) {
  const t = useWfTheme()
  const edit = (i, key, value) => onChange(units.map((u, j) => (j === i ? { ...u, [key]: value } : u)))
  /* One label for every card's button: the email bakes a single button image. */
  const btnLabel = units[0]?.ctaText === undefined ? 'View Dates' : units[0].ctaText
  return (
    <div>
      {withButton && units.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: t.muted }}>Card button, every stay</span>
          {inputFor('cardCta', btnLabel, (val) => onChange(units.map(u => ({ ...u, ctaText: val }))))}
        </div>
      )}
      {units.length === 0 && <div style={{ fontSize: 12.5, color: t.muted, marginBottom: 8 }}>No stay types: the email shows no stay block.</div>}
      {units.map((u, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 8, alignItems: 'start', marginBottom: 8 }}>
          {inputFor('name', u.name, (val) => edit(i, 'name', val))}
          {inputFor('description', u.description, (val) => edit(i, 'description', val))}
          <WfButton variant="ghost" style={{ padding: '7px 10px', fontSize: 12 }}
            onClick={() => { const next = units.filter((_, j) => j !== i); onChange(next); onDone(next) }}>Remove</WfButton>
        </div>
      ))}
      <WfButton variant="subtle" style={{ padding: '6px 12px', fontSize: 12 }}
        onClick={() => { const next = [...units, { name: '', description: '', stats: '' }]; onChange(next); onDone(next) }}>+ Add stay type</WfButton>
      {units.length > 5 && <div style={{ fontSize: 11.5, color: '#b45309', marginTop: 6 }}>The email has photo slots for the first five; the rest show as name and line only.</div>}
    </div>
  )
}

export default function RBCopy() {
  const navigate = useNavigate()
  const t = useWfTheme()
  const { clientId, emailId, client, email, navEmail } = useRbEmail()
  const { updateEmail } = useRepeatBookingStore()

  const [vars, setVars]     = useState([])
  const [picked, setPicked] = useState(0)

  useEffect(() => {
    if (!email) return
    setVars((email.variations || []).map(v => ({ ...v })))
    setPicked(email.selectedVariation ?? 0)
  }, [email?.id])   // eslint-disable-line react-hooks/exhaustive-deps

  if (!client || !email) return <RBMissing />

  if (!vars.length) {
    return (
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px' }}>
        <WfCard style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>No copy generated yet</div>
          <WfButton variant="ghost" style={{ marginTop: 14 }} onClick={() => navigate(rbPath(clientId, emailId))}>
            <IconArrowLeft size={15} /> Back to brief
          </WfButton>
        </WfCard>
      </div>
    )
  }

  const fields = RB_COPY_FIELDS[email.email] || []

  const persist = (nextVars = vars, nextPicked = picked) => {
    updateEmail(clientId, emailId, {
      variations: nextVars, selectedVariation: nextPicked,
      copy: nextVars[nextPicked], subject: nextVars[nextPicked]?.subjectLine || '',
    })
  }
  const editField = (vi, key, value) => setVars(vars.map((v, i) => (i === vi ? { ...v, [key]: value } : v)))
  const editFixed = (key, value) => setVars(vars.map(v => ({ ...v, [key]: value })))
  const choose = (i) => { setPicked(i); persist(vars, i) }

  const inputStyle = {
    width: '100%', padding: '9px 11px', borderRadius: 9, border: `1px solid ${t.border}`,
    background: t.inputBg, color: t.text, fontSize: 13, fontFamily: 'Inter, sans-serif', lineHeight: 1.6, outline: 'none',
  }
  const COLS = { display: 'grid', gridTemplateColumns: `repeat(${vars.length}, 1fr)`, gap: 12 }

  const oneInput = (key, value, onChange) => {
    const bold = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b' && toggleBold(e.currentTarget, onChange)) e.preventDefault() }
    const onKeyDown = RB_MULTILINE.has(key) ? bold : (e) => { if (e.key === 'Enter') { e.preventDefault(); return } bold(e) }
    return <AutoTextarea value={value} onChange={(e) => onChange(e.target.value)} onBlur={() => persist()} onKeyDown={onKeyDown} style={inputStyle} />
  }

  return (
    <div style={{ maxWidth: 1500, margin: '0 auto', padding: '28px 24px 64px' }}>
      <WfStepNav
        email={navEmail} step={2}
        backLabel="Brief"
        onBack={() => { persist(); navigate(rbPath(clientId, emailId)) }}
        nextLabel="Next: Pick Images"
        onNext={() => { persist(); navigate(rbPath(clientId, emailId, 'images')) }}
      />

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: t.text }}>Choose Your Copy</h1>
        <p style={{ fontSize: 13, color: t.muted, margin: '7px 0 0' }}>
          All three side by side. Edit any of them, then pick the one to carry forward. Select words and press ⌘B / Ctrl B to bold them.
        </p>
      </div>

      <div style={{ ...COLS, marginBottom: 18, position: 'sticky', top: 0, zIndex: 5,
                    background: t.dark ? 'rgba(17,17,20,0.92)' : 'rgba(247,248,250,0.92)', paddingTop: 6, paddingBottom: 6 }}>
        {vars.map((v, i) => {
          const on = i === picked
          return (
            <WfCard key={i} onClick={() => choose(i)} style={{ padding: '13px 15px', cursor: 'pointer',
              borderColor: on ? t.accent : t.border,
              background: on ? (t.dark ? 'rgba(99,102,241,0.10)' : 'rgba(99,102,241,0.06)') : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: on ? t.accent : t.faint }}>
                  V{i + 1}{on ? ' · carried forward' : ''}
                </div>
                {on && <IconCheck size={14} color={t.accent} stroke={2.6} />}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginTop: 4 }}>{v.name}</div>
            </WfCard>
          )
        })}
      </div>

      <WfCard style={{ padding: 0, overflow: 'hidden' }}>
        {fields.map((f, i) => (
          <div key={f.key} style={{ padding: '14px 18px', borderBottom: i === fields.length - 1 ? 'none' : `1px solid ${t.border}` }}>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: t.text, display: 'block', marginBottom: 6 }}>
              {f.label}<span style={{ fontWeight: 400, color: t.muted }}> · {f.hint}</span>
            </label>
            {f.type === 'units'
              ? <UnitsEditor units={vars[picked]?.[f.key] || []} withButton={!!f.button} onChange={(list) => editFixed(f.key, list)} onDone={(list) => persist(vars.map(v => ({ ...v, [f.key]: list })))} inputFor={oneInput} />
              : f.fixed
              ? oneInput(f.key, vars[picked]?.[f.key], (val) => editFixed(f.key, val))
              : <div style={COLS}>{vars.map((_, vi) => <div key={vi}>{oneInput(f.key, vars[vi]?.[f.key], (val) => editField(vi, f.key, val))}</div>)}</div>}
          </div>
        ))}
      </WfCard>
    </div>
  )
}
