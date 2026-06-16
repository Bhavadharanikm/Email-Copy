/**
 * ContentCalendar — Notion-style monthly content calendar + Ideas board
 * Calendar entries: localStorage key hgm_calendar_entries
 * Ideas:           localStorage key hgm_ideas
 */
import { useState, useRef, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, TABLE, rowToIdea, rowToEntry, ideaToRow, entryToRow } from '../lib/supabase'

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const STATUS_CONFIG = {
  draft:       { label: 'Draft',      dot: '#9ca3af', bg: 'rgba(156,163,175,0.15)', text: '#6b7280' },
  'in-review': { label: 'In Review',  dot: '#f59e0b', bg: 'rgba(245,158,11,0.14)',  text: '#b45309' },
  approved:    { label: 'Approved',   dot: '#10b981', bg: 'rgba(16,185,129,0.14)',  text: '#047857' },
  sent:        { label: 'Sent',       dot: '#8b5cf6', bg: 'rgba(139,92,246,0.14)',  text: '#6d28d9' },
}

const IDEA_STATUS = {
  pending:  { label: 'Pending',   bg: 'rgba(245,158,11,0.12)',  text: '#b45309', dot: '#f59e0b' },
  approved: { label: 'Scheduled', bg: 'rgba(16,185,129,0.12)',  text: '#047857', dot: '#10b981' },
  declined: { label: 'Declined',  bg: 'rgba(239,68,68,0.1)',    text: '#dc2626', dot: '#f87171' },
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36)

async function fetchAllRows() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('id', { ascending: true })
  if (error) { console.error('Supabase fetch error:', error); return [] }
  return data || []
}

// ─── Clients hook ─────────────────────────────────────────────────────────────

function useClients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch('/.netlify/functions/clients')
      .then(r => r.json())
      .then(data => { setClients(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => { setClients([]); setLoading(false) })
  }, [])
  return { clients, loading }
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
function todayStr() { return dateKey(new Date()) }

// ─── Calendar grid ────────────────────────────────────────────────────────────

function buildGrid(year, month) {
  const firstDow = new Date(year, month, 1).getDay()
  const lastDate = new Date(year, month + 1, 0).getDate()
  const leadCount = (firstDow + 6) % 7
  const cells = []
  for (let i = leadCount; i > 0; i--)  cells.push({ date: new Date(year, month, 1 - i),   current: false })
  for (let d = 1; d <= lastDate; d++)   cells.push({ date: new Date(year, month, d),        current: true  })
  const trail = (7 - (cells.length % 7)) % 7
  for (let i = 1; i <= trail; i++)      cells.push({ date: new Date(year, month + 1, i),   current: false })
  return cells
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function navBtnStyle(dark) {
  return {
    width: 32, height: 32, borderRadius: 8,
    border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
    background: dark ? 'rgba(255,255,255,0.05)' : '#f9fafb',
    color: dark ? 'rgba(255,255,255,0.6)' : '#6b7280',
    fontSize: 18, lineHeight: 1, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Inter, sans-serif', transition: 'background 0.15s',
  }
}

// ─── Client picker field ──────────────────────────────────────────────────────

function ClientPickerField({ dark, clients, value, onChange, onClientSelect, border, inputBg, textCol, subCol, labelSty, inputSty }) {
  const [open,             setOpen]             = useState(false)
  const [query,            setQuery]            = useState(value || '')
  const [selectedClient,   setSelectedClient]   = useState(null)
  const dropRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Sync query if parent changes value
  useEffect(() => { setQuery(value || '') }, [value])

  const filtered = clients
    .filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8)

  function pick(client) {
    setQuery(client.name)
    setSelectedClient(client)
    onChange(client.name)
    onClientSelect(client)
    setOpen(false)
  }

  return (
    <div>
      <label style={labelSty}>Client</label>
      <div ref={dropRef} style={{ position: 'relative' }}>
        <input
          style={{ ...inputSty }}
          placeholder={clients.length ? 'Search clients…' : 'e.g. Acme Realty'}
          value={query}
          onChange={e => { setQuery(e.target.value); onChange(e.target.value); setSelectedClient(null); onClientSelect(null); if (clients.length) setOpen(true) }}
          onFocus={e => { e.target.style.borderColor = dark ? 'rgba(255,255,255,0.3)' : '#6b7280'; if (clients.length) setOpen(true) }}
          onBlur={e => e.target.style.borderColor = border}
        />
        {/* Dropdown */}
        {open && filtered.length > 0 && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 9999,
            background: dark ? '#1c1c1c' : '#ffffff',
            border: `1.5px solid ${border}`,
            borderRadius: 10,
            boxShadow: dark ? '0 12px 40px rgba(0,0,0,0.55)' : '0 8px 28px rgba(0,0,0,0.1)',
            overflow: 'hidden', maxHeight: 230, overflowY: 'auto',
          }}>
            {filtered.map(client => (
              <button key={client.id}
                onMouseDown={e => { e.preventDefault(); pick(client) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '9px 12px', border: 'none',
                  background: 'none', cursor: 'pointer', textAlign: 'left',
                  fontFamily: 'Inter, sans-serif', transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.07)' : '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                {/* Logo or initials avatar */}
                <div style={{
                  width: 26, height: 26, borderRadius: 6, flexShrink: 0, overflow: 'hidden',
                  background: dark ? 'rgba(255,255,255,0.08)' : '#f3f4f6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 800, color: subCol, letterSpacing: 0,
                }}>
                  {client.logoUrl
                    ? <img src={client.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none' }} />
                    : client.name.slice(0, 2).toUpperCase()
                  }
                </div>
                {/* Name */}
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: textCol, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {client.name}
                </span>
                {/* Brand swatches */}
                {client.brandColors && (
                  <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                    {Object.values(client.brandColors).slice(0, 5).map((hex, i) => (
                      <div key={i} style={{ width: 11, height: 11, borderRadius: 3, background: hex, border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}` }} />
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected client brand palette */}
      {(selectedClient?.brandColors || (value && clients.find(c => c.name === value)?.brandColors)) && (() => {
        const bc = selectedClient?.brandColors || clients.find(c => c.name === value)?.brandColors
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 7, padding: '7px 10px', borderRadius: 8, background: dark ? 'rgba(255,255,255,0.04)' : '#f9fafb', border: `1px solid ${border}` }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: subCol, textTransform: 'uppercase', letterSpacing: '0.07em', flexShrink: 0 }}>Brand</span>
            {Object.entries(bc).map(([key, hex]) => (
              <div key={key} title={`${key}: ${hex}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 18, height: 18, borderRadius: 5, background: hex, border: `1.5px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}` }} />
              </div>
            ))}
            <span style={{ fontSize: 10, color: subCol, marginLeft: 'auto' }}>
              {Object.values(bc).join(' · ')}
            </span>
          </div>
        )
      })()}
    </div>
  )
}

// ─── Calendar entry modal ─────────────────────────────────────────────────────

const BLANK_ENTRY = { clientName: '', subject: '', status: 'draft', notes: '', sendTime: '' }

function EntryModal({ dark, date, entry, clients, onSave, onDelete, onClose }) {
  const isEdit = !!entry
  const normalizeNotes = (n) => n ? n.replace(/\\n\\n/g, '\n\n').replace(/\\n/g, '\n') : ''
  const [form, setForm] = useState(isEdit ? { ...entry, notes: normalizeNotes(entry.notes) } : { ...BLANK_ENTRY })
  const [selectedClientData, setSelectedClientData] = useState(
    isEdit && entry.brandColors ? { brandColors: entry.brandColors, logoUrl: entry.logoUrl } : null
  )
  const ref = useRef(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const bg      = dark ? '#161616' : '#ffffff'
  const border  = dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'
  const textCol = dark ? 'rgba(255,255,255,0.88)' : '#111827'
  const subCol  = dark ? 'rgba(255,255,255,0.32)' : '#9ca3af'
  const inputBg = dark ? 'rgba(255,255,255,0.05)' : '#f9fafb'
  const labelSty = { fontSize: 11, fontWeight: 700, color: subCol, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 7 }
  const inputSty = { width: '100%', padding: '10px 13px', borderRadius: 9, background: inputBg, border: `1.5px solid ${border}`, color: textCol, fontSize: 14, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }

  return (
    <div onMouseDown={e => { if (ref.current && !ref.current.contains(e.target)) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <motion.div ref={ref}
        initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        style={{ background: bg, borderRadius: 18, border: `1.5px solid ${border}`, boxShadow: dark ? '0 32px 80px rgba(0,0,0,0.7)' : '0 24px 64px rgba(0,0,0,0.14)', width: '100%', maxWidth: 480, padding: '28px 28px 22px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700, color: textCol, letterSpacing: '-0.02em' }}>{isEdit ? 'Edit Entry' : 'New Entry'}</div>
            <div style={{ fontSize: 13, color: subCol, marginTop: 5 }}>{date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: subCol, fontSize: 22, padding: '2px 6px', borderRadius: 6 }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ClientPickerField
            dark={dark} clients={clients || []}
            value={form.clientName}
            onChange={name => setForm(f => ({ ...f, clientName: name }))}
            onClientSelect={c => {
              setSelectedClientData(c)
              if (c) setForm(f => ({ ...f, clientName: c.name, brandColors: c.brandColors || null, logoUrl: c.logoUrl || null }))
            }}
            border={border} inputBg={inputBg} textCol={textCol} subCol={subCol} labelSty={labelSty} inputSty={inputSty}
          />
          <div><label style={labelSty}>Subject / Title</label><input style={inputSty} placeholder="e.g. Spring Market Update" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} onFocus={e => e.target.style.borderColor = dark ? 'rgba(255,255,255,0.3)' : '#6b7280'} onBlur={e => e.target.style.borderColor = border} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelSty}>Send Date</label>
              <input type="date" style={{ ...inputSty, cursor: 'pointer', colorScheme: dark ? 'dark' : 'light' }}
                value={form.sendDate || ''}
                onChange={e => setForm(f => ({ ...f, sendDate: e.target.value }))}
                onFocus={e => e.target.style.borderColor = dark ? 'rgba(255,255,255,0.3)' : '#6b7280'}
                onBlur={e => e.target.style.borderColor = border}
              />
            </div>
            <div><label style={labelSty}>Send Time</label>
              <input type="time" style={{ ...inputSty, cursor: 'pointer', colorScheme: dark ? 'dark' : 'light' }}
                value={form.sendTime || ''}
                onChange={e => setForm(f => ({ ...f, sendTime: e.target.value }))}
                onFocus={e => e.target.style.borderColor = dark ? 'rgba(255,255,255,0.3)' : '#6b7280'}
                onBlur={e => e.target.style.borderColor = border}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelSty}>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={{ ...inputSty, cursor: 'pointer', color: STATUS_CONFIG[form.status]?.text || textCol, appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 30 }}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k} style={{ background: bg, color: v.text }}>{v.label}</option>)}
              </select>
            </div>
            <div><label style={labelSty}>Changes Made By</label>
              <select value={form.changedBy || ''} onChange={e => setForm(f => ({ ...f, changedBy: e.target.value }))} style={{ ...inputSty, cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 30 }}>
                <option value="" style={{ background: bg }}>— Select —</option>
                {['Alicia','Charlotte','Makenna','Gillian','Chiara','Nicole','Ananya'].map(name => <option key={name} value={name} style={{ background: bg }}>{name}</option>)}
              </select>
            </div>
          </div>
          <div><label style={labelSty}>Brief / Notes <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(hook, anchor, why now, subject line)</span></label>
            <textarea style={{ ...inputSty, resize: 'vertical', lineHeight: 1.65, fontFamily: 'Inter, sans-serif' }} placeholder={'Hook: What\'s the angle or key message?\n\nCalendar Anchor: Key date or season\n\nWhy Now: Why is this timely?\n\nSuggested Subject Line: Draft subject'} rows={10} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} onFocus={e => e.target.style.borderColor = dark ? 'rgba(255,255,255,0.3)' : '#6b7280'} onBlur={e => e.target.style.borderColor = border} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, gap: 10 }}>
          {isEdit
            ? <button onClick={() => onDelete(entry.id)} style={{ padding: '8px 16px', borderRadius: 9, border: `1.5px solid ${dark ? 'rgba(239,68,68,0.3)' : '#fca5a5'}`, background: 'transparent', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Delete</button>
            : <span />}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 9, border: `1.5px solid ${border}`, background: 'transparent', color: subCol, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Cancel</button>
            <button onClick={() => onSave({ ...form, id: entry?.id || genId(), date: dateKey(date) })} disabled={!form.clientName.trim() && !form.subject.trim()}
              style={{ padding: '8px 20px', borderRadius: 9, border: 'none', background: (!form.clientName.trim() && !form.subject.trim()) ? (dark ? 'rgba(255,255,255,0.06)' : '#e5e7eb') : (dark ? '#f59e0b' : '#111827'), color: (!form.clientName.trim() && !form.subject.trim()) ? subCol : (dark ? '#111827' : '#fff'), fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' }}>
              {isEdit ? 'Save Changes' : 'Add to Calendar'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Day cell ─────────────────────────────────────────────────────────────────

function DayCell({ dark, cell, entries, today, onAddClick, onEntryClick }) {
  const [hovered, setHovered] = useState(false)
  const isToday   = dateKey(cell.date) === today
  const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6
  const border    = dark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'
  const cellBg    = !cell.current ? (dark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.015)') : isWeekend ? (dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.008)') : 'transparent'

  return (
    <div
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ minHeight: 140, background: hovered && cell.current ? (dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)') : cellBg, borderRight: `1px solid ${border}`, borderBottom: `1px solid ${border}`, padding: '10px 12px', position: 'relative', transition: 'background 0.12s' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', fontSize: 12, fontWeight: isToday ? 700 : 500, background: isToday ? (dark ? '#f59e0b' : '#111827') : 'transparent', color: isToday ? (dark ? '#111827' : '#fff') : (!cell.current ? (dark ? 'rgba(255,255,255,0.18)' : '#d1d5db') : (dark ? 'rgba(255,255,255,0.7)' : '#374151')), flexShrink: 0 }}>
          {cell.date.getDate()}
        </span>
        {hovered && cell.current && (
          <button onClick={() => onAddClick(cell.date)} style={{ width: 22, height: 22, borderRadius: 6, background: dark ? 'rgba(255,255,255,0.1)' : '#f3f4f6', border: `1px solid ${dark ? 'rgba(255,255,255,0.14)' : '#e5e7eb'}`, color: dark ? 'rgba(255,255,255,0.6)' : '#6b7280', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>+</button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {entries.map(entry => {
          const sc = STATUS_CONFIG[entry.status] || STATUS_CONFIG.draft
          return (
            <button key={entry.id} onClick={() => onEntryClick(entry, cell.date)} title={`${entry.clientName} — ${entry.subject}`}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 7px', borderRadius: 5, background: sc.bg, border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', minWidth: 0, transition: 'opacity 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.75'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: sc.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif', flex: 1, minWidth: 0 }}>
                {entry.clientName || entry.subject || 'Untitled'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Approve (date picker) modal ──────────────────────────────────────────────

function ApproveModal({ dark, idea, onConfirm, onClose }) {
  const [pickedDate, setPickedDate] = useState(todayStr())
  const ref = useRef(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const bg      = dark ? '#161616' : '#ffffff'
  const border  = dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'
  const textCol = dark ? 'rgba(255,255,255,0.88)' : '#111827'
  const subCol  = dark ? 'rgba(255,255,255,0.32)' : '#9ca3af'
  const inputBg = dark ? 'rgba(255,255,255,0.05)' : '#f9fafb'
  return (
    <div onMouseDown={e => { if (ref.current && !ref.current.contains(e.target)) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <motion.div ref={ref}
        initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        style={{ background: bg, borderRadius: 18, border: `1.5px solid ${border}`, boxShadow: dark ? '0 32px 80px rgba(0,0,0,0.7)' : '0 24px 64px rgba(0,0,0,0.14)', width: '100%', maxWidth: 400, padding: '28px 28px 24px', fontFamily: 'Inter, sans-serif' }}>

        {/* Icon + title */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 24, textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(16,185,129,0.12)', border: '1.5px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
            📅
          </div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700, color: textCol, letterSpacing: '-0.02em' }}>Schedule this idea</div>
            <div style={{ fontSize: 13, color: subCol, marginTop: 5, maxWidth: 300 }}>
              <strong style={{ color: dark ? 'rgba(255,255,255,0.6)' : '#374151' }}>{idea.clientName || 'No client'}</strong>
              {idea.subject ? ` — ${idea.subject}` : ''}
            </div>
          </div>
        </div>

        {/* Date picker */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: subCol, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>Send / Schedule Date</label>
          <input
            type="date"
            value={pickedDate}
            onChange={e => setPickedDate(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: inputBg, border: `1.5px solid ${border}`, color: textCol, fontSize: 14, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}
            onFocus={e  => e.target.style.borderColor = dark ? 'rgba(255,255,255,0.3)' : '#6b7280'}
            onBlur={e   => e.target.style.borderColor = border}
          />
        </div>

        <p style={{ fontSize: 12, color: subCol, textAlign: 'center', marginBottom: 20 }}>
          This will create a <strong style={{ color: '#10b981' }}>Draft</strong> entry on your calendar for the selected date.
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1.5px solid ${border}`, background: 'transparent', color: subCol, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Cancel
          </button>
          <button onClick={() => onConfirm(pickedDate)} disabled={!pickedDate}
            style={{ flex: 2, padding: '10px 0', borderRadius: 10, border: 'none', background: pickedDate ? '#10b981' : (dark ? 'rgba(255,255,255,0.06)' : '#e5e7eb'), color: pickedDate ? '#fff' : subCol, fontSize: 13, fontWeight: 700, cursor: pickedDate ? 'pointer' : 'not-allowed', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' }}>
            ✓ Add to Calendar
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Add / Edit idea modal ────────────────────────────────────────────────────

const BLANK_IDEA = { clientName: '', subject: '', hook: '', priority: 'medium', sendDate: '', sendTime: '', changedBy: '' }

const PRIORITY_CONFIG = {
  high:   { label: '🔴 High',   color: '#dc2626' },
  medium: { label: '🟡 Medium', color: '#d97706' },
  low:    { label: '🟢 Low',    color: '#16a34a' },
}

function IdeaFormModal({ dark, idea, clients, onSave, onClose }) {
  const isEdit = !!idea
  const normalizeHook = (h) => h ? h.replace(/\\n\\n/g, '\n\n').replace(/\\n/g, '\n') : ''
  const [form, setForm] = useState(isEdit ? { ...idea, hook: normalizeHook(idea.hook) } : { ...BLANK_IDEA })
  const [selectedClientData, setSelectedClientData] = useState(
    isEdit && idea.brandColors ? { brandColors: idea.brandColors, logoUrl: idea.logoUrl } : null
  )
  const ref = useRef(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const bg      = dark ? '#161616' : '#ffffff'
  const border  = dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'
  const textCol = dark ? 'rgba(255,255,255,0.88)' : '#111827'
  const subCol  = dark ? 'rgba(255,255,255,0.32)' : '#9ca3af'
  const inputBg = dark ? 'rgba(255,255,255,0.05)' : '#f9fafb'
  const labelSty = { fontSize: 11, fontWeight: 700, color: subCol, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 7 }
  const inputSty = { width: '100%', padding: '10px 13px', borderRadius: 9, background: inputBg, border: `1.5px solid ${border}`, color: textCol, fontSize: 14, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }
  const canSave  = form.clientName.trim() || form.subject.trim()

  return (
    <div onMouseDown={e => { if (ref.current && !ref.current.contains(e.target)) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <motion.div ref={ref}
        initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        style={{ background: bg, borderRadius: 18, border: `1.5px solid ${border}`, boxShadow: dark ? '0 32px 80px rgba(0,0,0,0.7)' : '0 24px 64px rgba(0,0,0,0.14)', width: '100%', maxWidth: 480, padding: '24px 24px 20px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: textCol, letterSpacing: '-0.02em' }}>{isEdit ? 'Edit Idea' : '💡 New Campaign Idea'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: subCol, fontSize: 20, padding: '2px 6px', borderRadius: 6 }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={labelSty}>Client</label>
            <select value={form.clientName} onChange={e => {
              const name = e.target.value
              const c = (clients || []).find(cl => cl.name === name)
              setForm(f => ({ ...f, clientName: name, brandColors: c?.brandColors || null, logoUrl: c?.logoUrl || null }))
              if (c) setSelectedClientData(c)
            }} style={{ ...inputSty, cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 30 }}>
              <option value="" style={{ background: dark ? '#1e293b' : '#fff' }}>— Select client —</option>
              {(clients || []).map(c => <option key={c.id || c.name} value={c.name} style={{ background: dark ? '#1e293b' : '#fff' }}>{c.name}</option>)}
            </select>
          </div>
          <div><label style={labelSty}>Campaign Title / Subject Idea</label><input style={inputSty} placeholder="e.g. Spring Market Round-Up" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} onFocus={e => e.target.style.borderColor = dark ? 'rgba(255,255,255,0.3)' : '#6b7280'} onBlur={e => e.target.style.borderColor = border} /></div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelSty}>Send Date</label>
              <input type="date" style={{ ...inputSty, cursor: 'pointer', colorScheme: dark ? 'dark' : 'light' }}
                value={form.sendDate || ''}
                onChange={e => setForm(f => ({ ...f, sendDate: e.target.value }))}
                onFocus={e => e.target.style.borderColor = dark ? 'rgba(255,255,255,0.3)' : '#6b7280'}
                onBlur={e => e.target.style.borderColor = border}
              />
            </div>
            <div><label style={labelSty}>Send Time</label>
              <input type="time" style={{ ...inputSty, cursor: 'pointer', colorScheme: dark ? 'dark' : 'light' }}
                value={form.sendTime || ''}
                onChange={e => setForm(f => ({ ...f, sendTime: e.target.value }))}
                onFocus={e => e.target.style.borderColor = dark ? 'rgba(255,255,255,0.3)' : '#6b7280'}
                onBlur={e => e.target.style.borderColor = border}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelSty}>Status</label>
              <select value={form.status || 'pending'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={{ ...inputSty, cursor: 'pointer', color: IDEA_STATUS[form.status || 'pending']?.text || textCol, appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 30 }}>
                {Object.entries(IDEA_STATUS).map(([k, v]) => <option key={k} value={k} style={{ background: bg, color: v.text }}>{v.label}</option>)}
              </select>
            </div>
            <div><label style={labelSty}>Changes Made By</label>
              <select value={form.changedBy || ''} onChange={e => setForm(f => ({ ...f, changedBy: e.target.value }))} style={{ ...inputSty, cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 30 }}>
                <option value="" style={{ background: bg }}>— Select —</option>
                {['Alicia','Charlotte','Makenna','Gillian','Chiara','Nicole','Ananya'].map(name => <option key={name} value={name} style={{ background: bg }}>{name}</option>)}
              </select>
            </div>
          </div>

          <div><label style={labelSty}>Brief <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(hook, anchor, why now, subject line)</span></label>
            <textarea style={{ ...inputSty, resize: 'vertical', lineHeight: 1.65, fontFamily: 'Inter, sans-serif' }} placeholder={'Hook: What\'s the angle or key message?\n\nCalendar Anchor: Key date or season\n\nWhy Now: Why is this timely?\n\nSuggested Subject Line: Draft subject'} rows={10} value={form.hook} onChange={e => setForm(f => ({ ...f, hook: e.target.value }))} onFocus={e => e.target.style.borderColor = dark ? 'rgba(255,255,255,0.3)' : '#6b7280'} onBlur={e => e.target.style.borderColor = border} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 9, border: `1.5px solid ${border}`, background: 'transparent', color: subCol, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Cancel</button>
          <button onClick={() => onSave({ ...form, id: idea?.id || genId(), status: idea?.status || 'pending', createdAt: idea?.createdAt || new Date().toISOString(), sendMonth: idea?.sendMonth || undefined })} disabled={!canSave}
            style={{ padding: '8px 20px', borderRadius: 9, border: 'none', background: canSave ? (dark ? '#f59e0b' : '#111827') : (dark ? 'rgba(255,255,255,0.06)' : '#e5e7eb'), color: canSave ? (dark ? '#111827' : '#fff') : subCol, fontSize: 12, fontWeight: 700, cursor: canSave ? 'pointer' : 'not-allowed', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' }}>
            {isEdit ? 'Save Changes' : '+ Add Idea'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Idea card ────────────────────────────────────────────────────────────────

// Parse the structured brief into sections
function parseBrief(hook) {
  if (!hook) return []
  // Normalize both literal \n\n (from data files) and actual newlines
  const normalized = hook.replace(/\\n\\n/g, '\n\n').replace(/\\n/g, '\n')
  if (!normalized.includes('\n\n')) return [{ label: null, value: normalized }]
  return normalized.split('\n\n').map(section => {
    const idx = section.indexOf(':')
    if (idx === -1) return { label: null, value: section.trim() }
    return { label: section.slice(0, idx).trim(), value: section.slice(idx + 1).trim() }
  })
}

const PRIORITY_DOT = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' }

function IdeaCard({ dark, idea, onApprove, onDecline, onUnschedule, onEdit, onReinstate }) {
  const [expanded, setExpanded] = useState(false)

  const sc = IDEA_STATUS[idea.status] || IDEA_STATUS.pending
  const isApproved = idea.status === 'approved'
  const isDeclined = idea.status === 'declined'
  const isPending  = idea.status === 'pending'

  const sections  = parseBrief(idea.hook)
  const hookSec   = sections.find(s => s.label === 'Hook' || s.label === null)
  const restSecs  = sections.filter(s => s !== hookSec)

  const bg       = dark ? '#161616' : '#ffffff'
  const border   = dark ? 'rgba(255,255,255,0.08)' : '#ebebeb'
  const textCol  = dark ? 'rgba(255,255,255,0.88)' : '#111827'
  const mutedCol = dark ? 'rgba(255,255,255,0.28)' : '#a1a1aa'
  const divider  = dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'
  const dotColor = PRIORITY_DOT[idea.priority] || PRIORITY_DOT.medium

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isDeclined ? 0.45 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 12,
        overflow: 'hidden',
        fontFamily: 'Inter, sans-serif',
        boxShadow: dark ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.14)' : '#d4d4d8'
        e.currentTarget.style.boxShadow = dark ? '0 4px 20px rgba(0,0,0,0.35)' : '0 4px 16px rgba(0,0,0,0.08)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = border
        e.currentTarget.style.boxShadow = dark ? 'none' : '0 1px 3px rgba(0,0,0,0.06)'
      }}
    >
      {/* ── Card body ── */}
      <div style={{ padding: '16px 18px 14px' }}>

        {/* Top meta row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Priority dot */}
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} title={`${idea.priority} priority`} />
            {/* Send month */}
            {idea.sendMonth && (
              <span style={{ fontSize: 11, color: mutedCol, fontWeight: 500 }}>{idea.sendMonth}</span>
            )}
          </div>
          {/* Status */}
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
            color: sc.text, padding: '2px 8px', borderRadius: 20, background: sc.bg,
          }}>{sc.label}</span>
        </div>

        {/* Title */}
        <p style={{
          fontSize: 14, fontWeight: 700, color: textCol, lineHeight: 1.4,
          margin: '0 0 6px', textDecoration: isDeclined ? 'line-through' : 'none',
        }}>
          {idea.subject || <span style={{ color: mutedCol, fontStyle: 'italic' }}>Untitled</span>}
        </p>

        {/* Theme + Promo tag row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {idea.campaignType && (
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
              padding: '2px 7px', borderRadius: 4,
              background: idea.campaignType === 'INDIRECT'
                ? (dark ? 'rgba(99,102,241,0.15)' : '#eef2ff')
                : (dark ? 'rgba(245,158,11,0.15)' : '#fffbeb'),
              color: idea.campaignType === 'INDIRECT'
                ? (dark ? '#a5b4fc' : '#4f46e5')
                : (dark ? '#fbbf24' : '#b45309'),
            }}>
              {idea.campaignType}
            </span>
          )}
          {idea.theme && (
            <span style={{ fontSize: 11, color: mutedCol, fontWeight: 400 }}>{idea.theme.includes('—') ? idea.theme.split('—').slice(1).join('—').trim() : idea.theme}</span>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: divider, margin: '12px 0' }} />

        {/* Hook — always visible */}
        {hookSec && (
          <div style={{ marginBottom: restSecs.length ? 10 : 0 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: textCol, margin: '0 0 4px' }}>Hook</p>
            <p style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.6)' : '#52525b', lineHeight: 1.65, margin: 0 }}>{hookSec.value}</p>
          </div>
        )}

        {/* Expanded sections */}
        <AnimatePresence initial={false}>
          {expanded && restSecs.length > 0 && (
            <motion.div
              key="rest"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                {restSecs.map((s, i) => (
                  <div key={i}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: textCol, margin: '0 0 4px' }}>{s.label}</p>
                    <p style={{
                      fontSize: 12, lineHeight: 1.65, margin: 0,
                      color: s.label === 'Suggested Subject Line'
                        ? (dark ? 'rgba(255,255,255,0.85)' : '#111827')
                        : (dark ? 'rgba(255,255,255,0.6)' : '#52525b'),
                      fontWeight: s.label === 'Suggested Subject Line' ? 600 : 400,
                    }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expand / collapse toggle */}
        {restSecs.length > 0 && (
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              marginTop: 10, padding: 0, border: 'none', background: 'none',
              cursor: 'pointer', color: mutedCol, fontSize: 11, fontWeight: 600,
              fontFamily: 'Inter, sans-serif', transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.6)' : '#374151'}
            onMouseLeave={e => e.currentTarget.style.color = mutedCol}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {expanded ? 'Less' : 'Anchor · Why Now · Subject line'}
          </button>
        )}

        {/* Scheduled date (approved) */}
        {isApproved && idea.scheduledDate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '7px 10px', borderRadius: 8, background: dark ? 'rgba(34,197,94,0.08)' : '#f0fdf4', border: `1px solid ${dark ? 'rgba(34,197,94,0.15)' : '#bbf7d0'}` }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a' }}>
              {new Date(idea.scheduledDate + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        )}
      </div>

      {/* ── Action row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderTop: `1px solid ${divider}` }}>
        {isPending && (
          <>
            <button onClick={() => onApprove(idea)}
              style={{ flex: 1, padding: '6px 0', border: 'none', borderRadius: 7, outline: 'none', background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'background 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#15803d' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#16a34a' }}>
              Approve
            </button>
            <button onClick={() => onDecline(idea.id)}
              style={{ flex: 1, padding: '6px 0', border: 'none', borderRadius: 7, outline: 'none', background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'background 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#dc2626' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#ef4444' }}>
              Decline
            </button>
          </>
        )}
        {isDeclined && (
          <button onClick={() => onReinstate(idea.id)}
            style={{ flex: 1, padding: '6px 0', border: `1px solid ${divider}`, borderRadius: 7, outline: 'none', background: dark ? 'rgba(255,255,255,0.07)' : '#f4f4f5', color: mutedCol, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}
            onMouseLeave={e => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.07)' : '#f4f4f5'}>
            Reinstate
          </button>
        )}
        {isApproved && (
          <>
            <button onClick={() => onApprove(idea)}
              style={{ flex: 1, padding: '6px 0', border: 'none', borderRadius: 7, outline: 'none', background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#15803d'}
              onMouseLeave={e => e.currentTarget.style.background = '#16a34a'}>
              Reschedule
            </button>
            <button onClick={() => onUnschedule(idea.id)}
              style={{ flex: 1, padding: '6px 0', border: `1px solid ${dark ? 'rgba(239,68,68,0.35)' : '#fca5a5'}`, borderRadius: 7, outline: 'none', background: 'transparent', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(239,68,68,0.1)' : '#fff1f2'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              Unschedule
            </button>
          </>
        )}
        {/* Edit */}
        <button onClick={() => onEdit(idea)}
          style={{ width: 30, height: 30, padding: 0, border: `1px solid ${divider}`, borderRadius: 7, outline: 'none', background: dark ? 'rgba(255,255,255,0.07)' : '#f4f4f5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s', flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.12)' : '#e5e7eb' }}
          onMouseLeave={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.07)' : '#f4f4f5' }}
          title="Edit">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={mutedCol} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
      </div>
    </motion.div>
  )
}

// ─── Ideas view ───────────────────────────────────────────────────────────────

function IdeasView({ dark, ideas, clients, allRows, patchRow, addRow }) {
  const [filter,       setFilter]       = useState('pending')
  const [monthFilter,  setMonthFilter]  = useState('all')
  const [approveModal, setApproveModal] = useState(null)
  const [formModal,    setFormModal]    = useState(null)

  const textCol = dark ? 'rgba(255,255,255,0.85)' : '#111827'
  const subCol  = dark ? 'rgba(255,255,255,0.3)'  : '#9ca3af'
  const border  = dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'

  // Build unique send months in order
  const allMonths = [...new Set(ideas.map(i => i.sendMonth).filter(Boolean))]

  const FILTERS = [
    { key: 'all',      label: 'All',       count: ideas.length },
    { key: 'pending',  label: 'Pending',   count: ideas.filter(i => i.status === 'pending').length  },
    { key: 'approved', label: 'Scheduled', count: ideas.filter(i => i.status === 'approved').length },
    { key: 'declined', label: 'Declined',  count: ideas.filter(i => i.status === 'declined').length },
  ]

  const statusFiltered = filter === 'all' ? ideas : ideas.filter(i => i.status === filter)
  const visible = monthFilter === 'all' ? statusFiltered : statusFiltered.filter(i => i.sendMonth === monthFilter)
  // Sort: pending first, then by priority, then date
  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }
  const sorted = [...visible].sort((a, b) => {
    if (a.status !== b.status) {
      const order = { pending: 0, approved: 1, declined: 2 }
      return order[a.status] - order[b.status]
    }
    return (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1)
  })

  async function handleApproveConfirm(date) {
    const idea = approveModal
    const changes = { idea_status: 'approved', calendar_date: date, entry_status: 'draft', updated_at: new Date().toISOString() }
    await supabase.from(TABLE).update(changes).eq('id', idea.id)
    patchRow(idea.id, changes)
    setApproveModal(null)
  }

  async function handleUnschedule(id) {
    const changes = { idea_status: 'pending', calendar_date: null, entry_status: null, updated_at: new Date().toISOString() }
    await supabase.from(TABLE).update(changes).eq('id', id)
    patchRow(id, changes)
  }

  async function handleDecline(id) {
    const changes = { idea_status: 'declined', calendar_date: null, entry_status: null, updated_at: new Date().toISOString() }
    await supabase.from(TABLE).update(changes).eq('id', id)
    patchRow(id, changes)
  }

  async function handleReinstate(id) {
    const changes = { idea_status: 'pending', updated_at: new Date().toISOString() }
    await supabase.from(TABLE).update(changes).eq('id', id)
    patchRow(id, changes)
  }

  async function handleSaveIdea(idea) {
    const row = ideaToRow(idea)
    if (allRows.find(r => String(r.id) === String(idea.id))) {
      // Update existing
      await supabase.from(TABLE).update(row).eq('id', idea.id)
      patchRow(idea.id, row)
    } else {
      // New idea — insert
      const { data } = await supabase.from(TABLE).insert({ ...row, idea_status: row.idea_status || 'pending' }).select().single()
      if (data) addRow(data)
    }
    setFormModal(null)
  }

  const pendingCount = ideas.filter(i => i.status === 'pending').length

  return (
    <div>
      {/* Sub-header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                border: `1.5px solid ${filter === f.key ? (dark ? 'rgba(245,158,11,0.5)' : '#111827') : border}`,
                background: filter === f.key ? (dark ? 'rgba(245,158,11,0.12)' : '#111827') : 'transparent',
                color: filter === f.key ? (dark ? '#f59e0b' : '#fff') : subCol,
                transition: 'all 0.15s',
              }}>
              {f.label}{f.count > 0 && <span style={{ marginLeft: 5, opacity: 0.7 }}>({f.count})</span>}
            </button>
          ))}
        </div>
        <button onClick={() => setFormModal('new')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, border: 'none', background: dark ? '#f59e0b' : '#111827', color: dark ? '#111827' : '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'opacity 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
          💡 New Idea
        </button>
      </div>

      {/* Month filter scroll row */}
      {allMonths.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 22, overflowX: 'auto', paddingBottom: 4 }}>
          <button onClick={() => setMonthFilter('all')}
            style={{ flexShrink: 0, padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: `1px solid ${monthFilter === 'all' ? (dark ? '#f59e0b' : '#374151') : border}`, background: monthFilter === 'all' ? (dark ? 'rgba(245,158,11,0.1)' : '#374151') : 'transparent', color: monthFilter === 'all' ? (dark ? '#f59e0b' : '#fff') : subCol, transition: 'all 0.15s' }}>
            All months
          </button>
          {allMonths.map(m => (
            <button key={m} onClick={() => setMonthFilter(m)}
              style={{ flexShrink: 0, padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', border: `1px solid ${monthFilter === m ? (dark ? '#f59e0b' : '#374151') : border}`, background: monthFilter === m ? (dark ? 'rgba(245,158,11,0.1)' : '#374151') : 'transparent', color: monthFilter === m ? (dark ? '#f59e0b' : '#fff') : subCol, transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
              {m}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {sorted.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '80px 0', textAlign: 'center' }}>
          <span style={{ fontSize: 48 }}>💡</span>
          <div style={{ fontSize: 16, fontWeight: 700, color: dark ? 'rgba(255,255,255,0.5)' : '#9ca3af' }}>
            {filter === 'pending' ? 'No pending ideas' : `No ${filter} ideas`}
          </div>
          <div style={{ fontSize: 13, color: subCol, maxWidth: 300 }}>
            {filter === 'pending' ? 'Add campaign ideas and the AM can approve or decline them.' : 'Ideas will appear here once actioned.'}
          </div>
          {filter === 'pending' && (
            <button onClick={() => setFormModal('new')}
              style={{ marginTop: 8, padding: '10px 24px', borderRadius: 10, border: 'none', background: dark ? '#f59e0b' : '#111827', color: dark ? '#111827' : '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              + Add First Idea
            </button>
          )}
        </div>
      )}

      {/* Card grid */}
      {sorted.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          <AnimatePresence mode="popLayout">
            {sorted.map(idea => (
              <IdeaCard
                key={idea.id}
                dark={dark}
                idea={idea}
                onApprove={idea => setApproveModal(idea)}
                onDecline={handleDecline}
                onUnschedule={handleUnschedule}
                onEdit={idea => setFormModal(idea)}
                onReinstate={handleReinstate}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Approve (date picker) modal */}
      <AnimatePresence>
        {approveModal && (
          <ApproveModal key="approve" dark={dark} idea={approveModal} onConfirm={handleApproveConfirm} onClose={() => setApproveModal(null)} />
        )}
      </AnimatePresence>

      {/* Idea form modal */}
      <AnimatePresence>
        {formModal && (
          <IdeaFormModal key="ideaform" dark={dark} idea={formModal === 'new' ? null : formModal} clients={clients} onSave={handleSaveIdea} onClose={() => setFormModal(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ContentCalendar() {
  const { theme } = useTheme()
  const dark = theme === 'dark'

  const now = new Date()
  const [activeTab, setActiveTab] = useState('calendar')
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const [allRows,  setAllRows]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(null)

  // Derive ideas and entries from the single allRows state
  const ideas   = allRows.filter(r => r.idea_status != null).map(rowToIdea)
  const entries = allRows.filter(r => r.calendar_date != null).map(rowToEntry)

  const { clients } = useClients()

  useEffect(() => {
    fetchAllRows().then(rows => { setAllRows(rows); setLoading(false) })
  }, [])

  // Helper: refresh a single row in allRows after a mutation
  function patchRow(id, changes) {
    setAllRows(prev => prev.map(r => String(r.id) === String(id) ? { ...r, ...changes } : r))
  }
  function removeRow(id) {
    setAllRows(prev => prev.filter(r => String(r.id) !== String(id)))
  }
  function addRow(row) {
    setAllRows(prev => [...prev, row])
  }

  const today  = dateKey(now)
  const cells  = buildGrid(year, month)
  const byDate = {}
  for (const e of entries) {
    if (!byDate[e.date]) byDate[e.date] = []
    byDate[e.date].push(e)
  }

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y-1) } else setMonth(m => m-1) }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y+1) } else setMonth(m => m+1) }
  function goToday()   { setYear(now.getFullYear()); setMonth(now.getMonth()) }

  async function handleSaveEntry(entry) {
    const row = entryToRow(entry)
    const existingRow = allRows.find(r => String(r.id) === String(entry.id))
    if (existingRow) {
      // Update existing row
      await supabase.from(TABLE).update(row).eq('id', entry.id)
      patchRow(entry.id, row)
    } else {
      // New manual entry (not from an idea) — insert with null idea_status
      const { data } = await supabase.from(TABLE).insert({ ...row, idea_status: null }).select().single()
      if (data) addRow(data)
    }
    setModal(null)
  }
  async function handleDeleteEntry(id) {
    const row = allRows.find(r => String(r.id) === String(id))
    if (row?.idea_status != null) {
      // This row is also an idea — just clear calendar fields instead of deleting
      const changes = { calendar_date: null, entry_status: null, idea_status: 'pending', updated_at: new Date().toISOString() }
      await supabase.from(TABLE).update(changes).eq('id', id)
      patchRow(id, changes)
    } else {
      // Pure manual entry — delete the row
      await supabase.from(TABLE).delete().eq('id', id)
      removeRow(id)
    }
    setModal(null)
  }

  const monthEntries = entries.filter(e => {
    const [y, m] = e.date.split('-').map(Number)
    return y === year && m === month + 1
  })
  const counts = { draft: 0, 'in-review': 0, approved: 0, sent: 0 }
  for (const e of monthEntries) counts[e.status] = (counts[e.status] || 0) + 1

  const pendingIdeas = ideas.filter(i => i.status === 'pending').length

  // ── Styles ──
  const pageBg   = dark ? '#0a0a0a'                 : '#ffffff'
  const cardBg   = dark ? '#111111'                 : '#ffffff'
  const border   = dark ? 'rgba(255,255,255,0.07)'  : '#e5e7eb'
  const textCol  = dark ? 'rgba(255,255,255,0.85)'  : '#111827'
  const subCol   = dark ? 'rgba(255,255,255,0.3)'   : '#9ca3af'
  const headerBg = dark ? 'rgba(255,255,255,0.025)' : '#fafafa'

  return (
    <div style={{ minHeight: '100vh', background: pageBg, padding: '44px 48px 80px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>

        {/* ── Page title ── */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: textCol, letterSpacing: '-0.03em', margin: 0 }}>Content Calendar</h1>
          <p style={{ fontSize: 14, color: subCol, margin: '6px 0 0', letterSpacing: '-0.01em' }}>Plan, schedule and track your email campaigns</p>
        </div>

        {/* ── Tab switcher ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 36, borderBottom: `1.5px solid ${border}`, paddingBottom: 0 }}>
          {[
            { key: 'calendar', label: '📅 Calendar' },
            { key: 'ideas',    label: '💡 Ideas',    badge: pendingIdeas > 0 ? pendingIdeas : null },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 24px', borderRadius: '12px 12px 0 0',
                border: 'none', borderBottom: activeTab === tab.key ? `2.5px solid ${dark ? '#f59e0b' : '#111827'}` : '2.5px solid transparent',
                background: activeTab === tab.key ? (dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)') : 'transparent',
                color: activeTab === tab.key ? textCol : subCol,
                fontSize: 15, fontWeight: activeTab === tab.key ? 700 : 500,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
                marginBottom: -2, letterSpacing: '-0.01em',
              }}>
              {tab.label}
              {tab.badge && (
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 22, height: 22, borderRadius: 11, background: '#f59e0b', color: '#111827', fontSize: 11, fontWeight: 800, padding: '0 5px' }}>{tab.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Calendar tab ── */}
        <AnimatePresence mode="wait">
          {activeTab === 'calendar' && (
            <motion.div key="calendar" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.18 }}>

              {/* Calendar controls */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button onClick={prevMonth} style={navBtnStyle(dark)}>‹</button>
                  <span style={{ fontSize: 20, fontWeight: 700, color: textCol, minWidth: 180, textAlign: 'center', letterSpacing: '-0.02em' }}>{MONTHS[month]} {year}</span>
                  <button onClick={nextMonth} style={navBtnStyle(dark)}>›</button>
                  <button onClick={goToday} style={{ fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${border}`, background: 'transparent', color: subCol, fontFamily: 'Inter, sans-serif' }}>Today</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: v.dot }} />
                        <span style={{ fontSize: 12, color: subCol }}>{v.label}{counts[k] > 0 && <span style={{ color: v.text, fontWeight: 700 }}> ({counts[k]})</span>}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setModal({ date: now })}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, border: 'none', background: dark ? '#f59e0b' : '#111827', color: dark ? '#111827' : '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'opacity 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.85'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                    + Add Entry
                  </button>
                </div>
              </div>

              {/* Calendar grid */}
              <div style={{ background: cardBg, borderRadius: 16, border: `1px solid ${border}`, boxShadow: dark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: headerBg, borderBottom: `1px solid ${border}` }}>
                  {DAYS.map(day => (
                    <div key={day} style={{ padding: '14px 12px 12px', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: (day === 'Sat' || day === 'Sun') ? subCol : (dark ? 'rgba(255,255,255,0.45)' : '#9ca3af'), borderRight: `1px solid ${border}` }}>{day}</div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                  {cells.map((cell, idx) => (
                    <DayCell key={idx} dark={dark} cell={cell} entries={byDate[dateKey(cell.date)] || []} today={today}
                      onAddClick={date => setModal({ date })}
                      onEntryClick={(entry, date) => setModal({ date, entry })} />
                  ))}
                </div>
              </div>

              {/* Monthly list */}
              {monthEntries.length > 0 && (
                <div style={{ marginTop: 32 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: subCol, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
                    {MONTHS[month]} · {monthEntries.length} {monthEntries.length === 1 ? 'entry' : 'entries'}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[...monthEntries].sort((a, b) => a.date.localeCompare(b.date)).map(entry => {
                      const sc = STATUS_CONFIG[entry.status] || STATUS_CONFIG.draft
                      const d  = new Date(entry.date + 'T00:00:00')
                      return (
                        <button key={entry.id} onClick={() => setModal({ date: d, entry })}
                          style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '13px 18px', borderRadius: 12, background: dark ? 'rgba(255,255,255,0.03)' : '#fafafa', border: `1px solid ${border}`, cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'Inter, sans-serif', transition: 'background 0.12s' }}
                          onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.06)' : '#f3f4f6'}
                          onMouseLeave={e => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.03)' : '#fafafa'}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: subCol, minWidth: 60 }}>{d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
                          <span style={{ width: 9, height: 9, borderRadius: '50%', background: sc.dot, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: textCol }}>{entry.clientName || <span style={{ color: subCol }}>No client</span>}</span>
                            {entry.subject && <span style={{ fontSize: 13, color: subCol, marginLeft: 8 }}>— {entry.subject}</span>}
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: sc.bg, color: sc.text, flexShrink: 0 }}>{sc.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Ideas tab ── */}
          {activeTab === 'ideas' && (
            <motion.div key="ideas" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.18 }}>
              <IdeasView dark={dark} ideas={ideas} clients={clients} allRows={allRows} patchRow={patchRow} addRow={addRow} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Calendar entry modal */}
      <AnimatePresence>
        {modal && (
          <EntryModal key="entrymodal" dark={dark} date={modal.date} entry={modal.entry || null}
            clients={clients} onSave={handleSaveEntry} onDelete={handleDeleteEntry} onClose={() => setModal(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
