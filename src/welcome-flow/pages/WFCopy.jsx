/**
 * Welcome Flow — copy (step 2 of a WF email).
 *
 * Shows the three variations side by side, same idea as the Weekly Email
 * Campaign's CopyEditor: pick one, edit it in place, carry it forward. The
 * field list is deliberately the same, so copy written for either workflow
 * drops into the other.
 *
 * Property cards are fully editable, one block per featured stay, each with
 * its own CTA wording and its own link.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft, IconCheck, IconPlus, IconTrash } from '@tabler/icons-react'
import { useWelcomeFlowStore } from '../store/welcomeFlowStore'
import { wfCopySchema } from '../wfCopySchema'
import { useWfTheme, WfCard, WfButton, WfStepNav } from '../components/wfUi'

/* Field order and guidance follow the welcome-flow copy spec. The property cards
   sit between the two groups, which is where they appear in the email. */


const MULTILINE = new Set(['bodyText', 'bodyBlock2', 'closingLine', 'momentCopy', 'quote', 'attribution', 'description'])

/**
 * A textarea that grows to whatever it holds, so nothing scrolls inside a box
 * three columns wide. Height is reset to auto before it is read, otherwise
 * scrollHeight only ever reports the taller of old and new and the field can
 * grow but never shrink.
 */
function AutoTextarea({ value, onChange, onBlur, style }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return (
    <textarea
      ref={ref}
      value={value || ''}
      onChange={onChange}
      onBlur={onBlur}
      rows={1}
      style={{ ...style, resize: 'none', overflow: 'hidden' }}
    />
  )
}

/* Facts stay identical across variations; only the description shifts with POV. */

export default function WFCopy() {
  const { clientId, emailId } = useParams()
  const navigate = useNavigate()
  const t = useWfTheme()
  const { getClient, getEmails, updateEmail, ensureClients, loadingClients } = useWelcomeFlowStore()

  // clients are not persisted — refetch after a reload on this deep route
  useEffect(() => { ensureClients() }, [ensureClients])

  const client = getClient(clientId)
  const email  = (getEmails(clientId) || []).find(e => e.id === emailId)

  // local editable copy of every variation, so switching tabs keeps edits
  const [vars, setVars]   = useState([])
  const [picked, setPicked] = useState(0)

  useEffect(() => {
    if (!email) return
    /* A fixed group always has the same number of slots, and each slot starts
       with a suggested title. Seed them here rather than only in the display, so
       what the editor shows is what gets saved and rendered. */
    const g = wfCopySchema(email.week).group
    const seed = (v) => {
      if (g.mode !== 'fixed') return { ...v }
      const list = v[g.listKey] || []
      return { ...v, [g.listKey]: g.labels.map((lbl, i) => ({
        ...g.blank, ...(list[i] || {}),
        label: (list[i]?.label || '').trim() || lbl,
      })) }
    }
    setVars((email.variations || []).map(seed))
    setPicked(email.selectedVariation ?? 0)
  }, [email?.id])   // eslint-disable-line react-hooks/exhaustive-deps

  if (loadingClients && !client) {
    return (
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px' }}>
        <WfCard style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: t.muted }}>Loading…</div>
        </WfCard>
      </div>
    )
  }

  if (!client || !email) {
    return (
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px' }}>
        <WfCard style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>That email no longer exists</div>
          <WfButton variant="ghost" style={{ marginTop: 14 }} onClick={() => navigate('/welcome-flow')}>
            <IconArrowLeft size={15} /> All clients
          </WfButton>
        </WfCard>
      </div>
    )
  }

  if (!vars.length) {
    return (
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px' }}>
        <WfCard style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>No copy generated yet</div>
          <div style={{ fontSize: 12.5, color: t.muted, marginTop: 6 }}>
            Go back to the brief and generate, or use the test-data path.
          </div>
          <WfButton
            variant="ghost"
            style={{ marginTop: 14 }}
            onClick={() => navigate(`/welcome-flow/${clientId}/email/${emailId}`)}
          >
            <IconArrowLeft size={15} /> Back to brief
          </WfButton>
        </WfCard>
      </div>
    )
  }

  /* The week decides the field list: Week 1 is featured stays, Week 2 the
     48-hour itinerary, Week 3 guest reviews. Weeks with no schema of their own
     fall back to Week 1. */
  const schema    = wfCopySchema(email?.week)
  const group     = schema.group
  const isFixed   = group.mode === 'fixed'
  const MAX_ITEMS = isFixed ? group.labels.length : group.max

  const persist = (nextVars = vars, nextPicked = picked) => {
    // Section Subhead is the single source; mirror it onto subhead so any
    // template that reads copy.subhead stays fed without a duplicate field.
    const withSubhead = nextVars.map(v => ({ ...v, subhead: v.sectionSubhead || '' }))
    updateEmail(clientId, emailId, {
      variations:        withSubhead,
      selectedVariation: nextPicked,
      copy:              withSubhead[nextPicked],
      subject:           withSubhead[nextPicked]?.subjectLine || '',
      status:            'ready',
    })
  }

  /* Every handler takes the variation index now: the three are edited side by
     side, so "the one being edited" is no longer whichever tab is selected.
     `picked` still means the one carried forward to the next step. */
  const editField = (vi, key, value) => {
    setVars(vars.map((v, i) => (i === vi ? { ...v, [key]: value } : v)))
  }

  const itemsOf = (vi) => {
    const stored = (vars[vi]?.[group.listKey]) || []
    return isFixed ? group.labels.map((_, i) => stored[i] || { ...group.blank }) : stored
  }

  const addItem = (vi) => {
    const next = vars.map((v, i) => {
      if (i !== vi) return v
      const list = v[group.listKey] || []
      if (list.length >= MAX_ITEMS) return v
      const blank = { ...group.blank }
      // carry the CTA wording from the first item — identical by design
      if ('ctaText' in blank && list[0]?.ctaText) blank.ctaText = list[0].ctaText
      if ('ctaUrl'  in blank && list[0]?.ctaUrl)  blank.ctaUrl  = list[0].ctaUrl
      // suggested title for this position, where the schema offers one
      if (group.defaultLabels?.[list.length]) blank.label = group.defaultLabels[list.length]
      return { ...v, [group.listKey]: [...list, blank] }
    })
    setVars(next); persist(next)
  }

  const removeItem = (vi, idx) => {
    const next = vars.map((v, i) =>
      i === vi ? { ...v, [group.listKey]: (v[group.listKey] || []).filter((_, ci) => ci !== idx) } : v)
    setVars(next); persist(next)
  }

  /* A fixed group has no add step, so writing into an empty slot has to grow the
     array up to that index rather than drop the edit on the floor. */
  const editItem = (vi, idx, key, value) => {
    setVars(vars.map((v, i) => {
      if (i !== vi) return v
      const list = [...(v[group.listKey] || [])]
      while (list.length <= idx) list.push({ ...group.blank, ...(isFixed ? { label: group.labels[list.length] || '' } : {}) })
      list[idx] = { ...list[idx], [key]: value }
      return { ...v, [group.listKey]: list }
    }))
  }

  const choose = (i) => { setPicked(i); persist(vars, i) }

  const inputStyle = {
    width: '100%', padding: '9px 11px', borderRadius: 9,
    border: `1px solid ${t.border}`, background: t.inputBg, color: t.text,
    fontSize: 13, fontFamily: 'Inter, sans-serif', lineHeight: 1.6, outline: 'none',
  }
  const COLS = { display: 'grid', gridTemplateColumns: `repeat(${Math.max(vars.length, 1)}, 1fr)`, gap: 12 }

  const isMultiline = (key) =>
    MULTILINE.has(key) || MULTILINE.has(String(key).split('-').pop())

  /** One input, for one variation. */
  const oneInput = (key, value, onChange) =>
    isMultiline(key)
      ? <AutoTextarea value={value} onChange={(e) => onChange(e.target.value)}
          onBlur={() => persist()} style={inputStyle} />
      : <input value={value || ''} onChange={(e) => onChange(e.target.value)} onBlur={() => persist()}
          style={inputStyle} />

  /** One labelled row: the label once, then the same field for all three. */
  const fieldRow = ({ key, label, hint }, valueAt, onChangeAt, last) => (
    <div key={key} style={{ padding: '14px 18px', borderBottom: last ? 'none' : `1px solid ${t.border}` }}>
      <label style={{ fontSize: 11.5, fontWeight: 700, color: t.text, display: 'block', marginBottom: 6 }}>
        {label}{hint && <span style={{ fontWeight: 400, color: t.muted }}> — {hint}</span>}
      </label>
      <div style={COLS}>
        {vars.map((_, vi) => (
          <div key={vi}>{oneInput(key, valueAt(vi), (val) => onChangeAt(vi, val))}</div>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: 1500, margin: '0 auto', padding: '28px 24px 64px' }}>
      <WfStepNav
        backLabel="Brief"
        onBack={() => { persist(); navigate(`/welcome-flow/${clientId}/email/${emailId}`) }}
        nextLabel="Next: Pick Images"
        onNext={() => { persist(); navigate(`/welcome-flow/${clientId}/email/${emailId}/images`) }}
      />

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 13px', borderRadius: 999,
          background: t.dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.72)',
          border: `1px solid ${t.border}`, fontSize: 11, fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: t.muted, marginBottom: 12,
        }}>
          Email {String(email.position).padStart(2, '0')} · Step 2 of 5
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: t.text }}>
          Choose Your Copy
        </h1>
        <p style={{ fontSize: 13, color: t.muted, margin: '7px 0 0' }}>
          All three side by side. Edit any of them, then pick the one to carry forward.
        </p>
      </div>

      {/* Column headers — also the picker for which variation carries forward */}
      <div style={{ ...COLS, marginBottom: 18, position: 'sticky', top: 0, zIndex: 5,
                    background: t.dark ? 'rgba(17,17,20,0.92)' : 'rgba(247,248,250,0.92)',
                    paddingTop: 6, paddingBottom: 6 }}>
        {vars.map((v, i) => {
          const on = i === picked
          return (
            <WfCard
              key={v.id ?? i}
              onClick={() => choose(i)}
              style={{
                padding: '13px 15px', cursor: 'pointer',
                borderColor: on ? t.accent : t.border,
                background: on ? (t.dark ? 'rgba(99,102,241,0.10)' : 'rgba(99,102,241,0.06)') : undefined,
              }}
            >
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

      {/* everything above the repeated block */}
      <WfCard style={{ padding: 0, overflow: 'hidden' }}>
        {schema.before.map((f, i) =>
          fieldRow(f, (vi) => vars[vi]?.[f.key], (vi, val) => editField(vi, f.key, val),
                   i === schema.before.length - 1))}
      </WfCard>

      {/* the repeated block — one column per variation, since the counts can differ */}
      <WfCard style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: t.text }}>
            {group.title}{' '}
            <span style={{ fontWeight: 400, color: t.muted }}>— {group.note}</span>
          </div>
        </div>
        <div style={{ ...COLS, padding: '14px 18px' }}>
          {vars.map((_, vi) => {
            const list = itemsOf(vi)
            return (
              <div key={vi}>
                {list.length === 0 && !isFixed && (
                  <div style={{ fontSize: 12.5, color: t.muted, padding: '6px 0 10px' }}>
                    Nothing here yet.
                  </div>
                )}
                {list.map((item, ci) => (
                  <div key={ci} style={{ border: `1px solid ${t.border}`, borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
                    <div style={{
                      padding: '8px 12px', background: t.dark ? 'rgba(255,255,255,0.03)' : '#f7f8fa',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.faint }}>
                        {isFixed
                          ? `${group.itemLabel || 'Item'} ${ci + 1} of ${MAX_ITEMS} · Sub ${ci + 1}`
                          : `${group.itemLabel} ${ci + 1} · Sub ${ci + 1}`}
                      </span>
                      {!isFixed && (
                        <button
                          onClick={() => removeItem(vi, ci)}
                          title="Remove"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3, background: 'none',
                            border: 'none', cursor: 'pointer', padding: '2px 3px',
                            fontSize: 11, fontWeight: 600, color: '#dc2626', fontFamily: 'Inter, sans-serif',
                          }}
                        >
                          <IconTrash size={12} stroke={2} /> Remove
                        </button>
                      )}
                    </div>
                    <div style={{ padding: '10px 12px' }}>
                      {group.fields.map((cf) => (
                        <div key={cf.key} style={{ marginBottom: 8 }}>
                          <label style={{ fontSize: 10.5, fontWeight: 700, color: t.muted, display: 'block', marginBottom: 4 }}>
                            {cf.label}
                          </label>
                          {oneInput(cf.key, item[cf.key], (val) => editItem(vi, ci, cf.key, val))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {!isFixed && (
                  <WfButton
                    variant="subtle"
                    disabled={list.length >= MAX_ITEMS}
                    onClick={() => addItem(vi)}
                    style={{ padding: '6px 12px', fontSize: 12, width: '100%' }}
                  >
                    <IconPlus size={13} stroke={2.4} /> {group.addLabel} ({list.length}/{MAX_ITEMS})
                  </WfButton>
                )}
              </div>
            )
          })}
        </div>
      </WfCard>

      {/* everything below the repeated block */}
      <WfCard style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
        {schema.after.map((f, i) =>
          fieldRow(f, (vi) => vars[vi]?.[f.key], (vi, val) => editField(vi, f.key, val),
                   i === schema.after.length - 1))}
      </WfCard>

    </div>
  )
}
