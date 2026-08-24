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

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IconArrowLeft, IconCheck, IconPlus, IconTrash } from '@tabler/icons-react'
import { useWelcomeFlowStore } from '../store/welcomeFlowStore'
import { wfCopySchema } from '../wfCopySchema'
import { useWfTheme, WfCard, WfButton, WfStepNav } from '../components/wfUi'

/* Field order and guidance follow the welcome-flow copy spec. The property cards
   sit between the two groups, which is where they appear in the email. */


const MULTILINE = new Set(['bodyText', 'bodyBlock2', 'closingLine'])

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
    setVars((email.variations || []).map(v => ({ ...v })))
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

  const active = vars[picked] || vars[0]
  /* The week decides the field list: Week 1 is featured stays, Week 2 is the
     48-hour itinerary. Weeks with no schema of their own fall back to Week 1. */
  const schema    = wfCopySchema(email?.week)
  const group     = schema.group
  const isFixed   = group.mode === 'fixed'
  const MAX_ITEMS = isFixed ? group.labels.length : group.max
  /* A fixed group always shows all of its slots, filled or not. */
  const stored    = active[group.listKey] || []
  const items     = isFixed
    ? group.labels.map((_, i) => stored[i] || { ...group.blank })
    : stored

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

  const editField = (key, value) => {
    const next = vars.map((v, i) => (i === picked ? { ...v, [key]: value } : v))
    setVars(next)
  }

  const addItem = () => {
    const next = vars.map((v, i) => {
      if (i !== picked) return v
      const list = v[group.listKey] || []
      if (list.length >= MAX_ITEMS) return v
      // carry the CTA wording from the first item — identical by design
      const blank = { ...group.blank }
      if ('ctaText' in blank && list[0]?.ctaText) blank.ctaText = list[0].ctaText
      if ('ctaUrl'  in blank && list[0]?.ctaUrl)  blank.ctaUrl  = list[0].ctaUrl
      return { ...v, [group.listKey]: [...list, blank] }
    })
    setVars(next); persist(next)
  }

  const removeItem = (idx) => {
    const next = vars.map((v, i) => {
      if (i !== picked) return v
      return { ...v, [group.listKey]: (v[group.listKey] || []).filter((_, ci) => ci !== idx) }
    })
    setVars(next); persist(next)
  }

  /* A fixed group has no add step, so writing into an empty slot has to grow
     the array up to that index rather than drop the edit on the floor. */
  const editItem = (idx, key, value) => {
    const next = vars.map((v, i) => {
      if (i !== picked) return v
      const list = [...(v[group.listKey] || [])]
      while (list.length <= idx) list.push({ ...group.blank })
      list[idx] = { ...list[idx], [key]: value }
      return { ...v, [group.listKey]: list }
    })
    setVars(next)
  }

  const choose = (i) => { setPicked(i); persist(vars, i) }

  const inputStyle = {
    width: '100%', padding: '9px 11px', borderRadius: 9,
    border: `1px solid ${t.border}`, background: t.inputBg, color: t.text,
    fontSize: 13, fontFamily: 'Inter, sans-serif', lineHeight: 1.6, outline: 'none',
  }

  /** One labelled row. Used for both the copy fields and the card fields. */
  const fieldRow = ({ key, label, hint }, value, onChange, last) => (
    <div key={key} style={{ padding: '14px 18px', borderBottom: last ? 'none' : `1px solid ${t.border}` }}>
      <label style={{ fontSize: 11.5, fontWeight: 700, color: t.text, display: 'block', marginBottom: 5 }}>
        {label}{hint && <span style={{ fontWeight: 400, color: t.muted }}> — {hint}</span>}
      </label>
      {MULTILINE.has(key) ? (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => persist()}
          rows={key === 'bodyText' ? 4 : 2}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      ) : (
        <input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => persist()}
          style={inputStyle}
        />
      )}
    </div>
  )

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '28px 24px 64px' }}>
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
          Three variations. Pick one, edit anything, then continue.
        </p>
      </div>

      {/* variation tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${vars.length},1fr)`, gap: 10, marginBottom: 18 }}>
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
                  V{i + 1}
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
          fieldRow(f, active[f.key], (v) => editField(f.key, v), i === schema.before.length - 1))}
      </WfCard>

      {/* the repeated block — stays for Week 1, itinerary moments for Week 2 */}
      <WfCard style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${t.border}`, display: 'flex',
                      alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: t.text }}>
            {group.title}{' '}
            <span style={{ fontWeight: 400, color: t.muted }}>
              — {isFixed ? `${MAX_ITEMS} moments` : `${items.length} of ${MAX_ITEMS}`}. {group.note}
            </span>
          </div>
          {!isFixed && (
            <WfButton
              variant="subtle"
              disabled={items.length >= MAX_ITEMS}
              onClick={addItem}
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              <IconPlus size={13} stroke={2.4} /> {group.addLabel}
            </WfButton>
          )}
        </div>

        {(!isFixed && items.length === 0) ? (
          <div style={{ padding: '22px 18px', fontSize: 12.5, color: t.muted }}>
            Nothing here yet. Add one to show it in the email.
          </div>
        ) : items.map((item, ci) => (
          <div key={ci} style={{ borderBottom: ci < items.length - 1 ? `1px solid ${t.border}` : 'none' }}>
            <div style={{
              padding: '10px 18px', background: t.dark ? 'rgba(255,255,255,0.03)' : '#f7f8fa',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.faint }}>
                {isFixed
                  ? `${group.labels[ci]} · Sub Image ${ci + 1}`
                  : `${group.itemLabel} ${ci + 1} of ${items.length} · Sub Image ${ci + 1}`}
              </span>
              {!isFixed && (
                <button
                  onClick={() => removeItem(ci)}
                  title="Remove this one"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none',
                    border: 'none', cursor: 'pointer', padding: '2px 4px',
                    fontSize: 11.5, fontWeight: 600, color: '#dc2626', fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <IconTrash size={13} stroke={2} /> Remove
                </button>
              )}
            </div>
            {group.fields.map((cf, fi) =>
              fieldRow(
                { ...cf, key: `${group.listKey}${ci}-${cf.key}` },
                item[cf.key],
                (v) => editItem(ci, cf.key, v),
                fi === group.fields.length - 1,
              ))}
          </div>
        ))}
      </WfCard>

      {/* everything below the repeated block */}
      <WfCard style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
        {schema.after.map((f, i) =>
          fieldRow(f, active[f.key], (v) => editField(f.key, v), i === schema.after.length - 1))}
      </WfCard>

    </div>
  )
}
