/**
 * Repeat Booking Flow — clients list.
 *
 * Its own roster, separate from the welcome flow's (kept in this browser for
 * now, see the store). A client is added by picking it from the client
 * database rather than typing a location ID: every client there is already set
 * up with its GHL key and logo.
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconSearch, IconPlus, IconChevronRight, IconUsers, IconCheck } from '@tabler/icons-react'
import { useRepeatBookingStore } from '../store/repeatBookingStore'
import { useWfTheme, WfCard, WfButton, WfInput, WfPageHeader } from '../../welcome-flow/components/wfUi'

function ClientCard({ client, counts, onOpen }) {
  const t = useWfTheme()
  const [hover, setHover] = useState(false)
  return (
    <WfCard
      hovered={hover}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onOpen}
      style={{ padding: '18px 18px 16px', cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: t.text, letterSpacing: '-0.01em',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {client.name}
        </div>
        <IconChevronRight size={17} color={hover ? t.accent : t.faint} stroke={2} style={{ flexShrink: 0 }} />
      </div>
      <div style={{ display: 'flex', gap: 26, marginTop: 18 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: t.text, lineHeight: 1 }}>{counts.done}</div>
          <div style={{ fontSize: 11, color: t.faint, marginTop: 5 }}>Done</div>
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: counts.inProgress ? '#b45309' : t.faint, lineHeight: 1 }}>
            {counts.inProgress}
          </div>
          <div style={{ fontSize: 11, color: t.faint, marginTop: 5 }}>In progress</div>
        </div>
      </div>
    </WfCard>
  )
}

/** Pick a client from the client database. Clients already in the flow are left out. */
function AddClientPicker({ takenLocations, onCancel, onPick }) {
  const t = useWfTheme()
  const { directory, directoryError, fetchDirectory } = useRepeatBookingStore()
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState(null)

  useEffect(() => { fetchDirectory() }, [fetchDirectory])

  const options = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (directory || [])
      .filter(c => !takenLocations.has(c.locationId))
      .filter(c => !needle || c.name.toLowerCase().includes(needle))
  }, [directory, q, takenLocations])

  const start = () => { if (picked) onPick(picked) }

  return (
    <WfCard style={{ padding: 20, marginBottom: 22 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 4 }}>Which client do you want to start with?</div>
      <div style={{ fontSize: 12, color: t.muted, marginBottom: 14 }}>
        Pick from your client database. Their GHL key and logo come from there.
      </div>

      <div style={{ position: 'relative', marginBottom: 10 }}>
        <IconSearch size={15} color={t.faint} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
        <WfInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients" style={{ paddingLeft: 33 }} autoFocus />
      </div>

      <div style={{ maxHeight: 280, overflowY: 'auto', border: `1px solid ${t.border}`, borderRadius: 10 }}>
        {directoryError ? (
          <div style={{ padding: 16, fontSize: 12.5, color: '#dc2626' }}>Could not load the client database: {directoryError}</div>
        ) : !directory ? (
          <div style={{ padding: 16, fontSize: 12.5, color: t.muted }}>Loading clients…</div>
        ) : options.length === 0 ? (
          <div style={{ padding: 16, fontSize: 12.5, color: t.muted }}>
            {q ? 'No client matches that search.' : 'Every client is already in the flow.'}
          </div>
        ) : options.map((c, i) => {
          const on = picked?.locationId === c.locationId
          return (
            <div
              key={c.locationId}
              onClick={() => setPicked(c)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                padding: '10px 14px', cursor: 'pointer', fontSize: 13.5,
                borderTop: i === 0 ? 'none' : `1px solid ${t.border}`,
                background: on ? (t.dark ? 'rgba(245,158,11,0.10)' : 'rgba(59,130,246,0.08)') : 'transparent',
                color: on ? t.accent : t.text, fontWeight: on ? 600 : 500,
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
              {on && <IconCheck size={15} stroke={2.4} style={{ flexShrink: 0 }} />}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 9, marginTop: 16 }}>
        <WfButton disabled={!picked} onClick={start}>
          {picked ? `Start flow for ${picked.name}` : 'Start flow'}
        </WfButton>
        <WfButton variant="ghost" onClick={onCancel}>Cancel</WfButton>
      </div>
    </WfCard>
  )
}

export default function RBClients() {
  const navigate = useNavigate()
  const t = useWfTheme()
  const { clients, addClient, counts } = useRepeatBookingStore()
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)

  const takenLocations = useMemo(() => new Set(clients.map(c => c.locationId)), [clients])
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return needle ? clients.filter(c => c.name.toLowerCase().includes(needle)) : clients
  }, [clients, q])

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 24px 64px' }}>
      <WfPageHeader
        title="Repeat Booking Flow"
        subtitle={`${clients.length} client${clients.length === 1 ? '' : 's'}. Three emails each, for guests who have stayed.`}
        right={
          <>
            <div style={{ position: 'relative' }}>
              <IconSearch size={15} color={t.faint} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
              <WfInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients" style={{ paddingLeft: 33, width: 240 }} />
            </div>
            <WfButton onClick={() => setAdding(v => !v)}>
              <IconPlus size={15} stroke={2.4} /> Add client
            </WfButton>
          </>
        }
      />

      {adding && (
        <AddClientPicker
          takenLocations={takenLocations}
          onCancel={() => setAdding(false)}
          onPick={(c) => {
            const id = addClient(c)
            setAdding(false)
            navigate(`/repeat-booking/${encodeURIComponent(id)}`)
          }}
        />
      )}

      {filtered.length === 0 ? (
        <WfCard style={{ padding: '56px 24px', textAlign: 'center' }}>
          <IconUsers size={30} color={t.faint} stroke={1.5} />
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginTop: 12 }}>
            {q ? 'No clients match that search' : 'No clients yet'}
          </div>
          <div style={{ fontSize: 12.5, color: t.muted, marginTop: 5 }}>
            {q ? 'Try a different name.' : 'Press Add client and pick one to start their repeat booking flow.'}
          </div>
        </WfCard>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
          {filtered.map(c => (
            <ClientCard key={c.id} client={c} counts={counts(c.id)} onOpen={() => navigate(`/repeat-booking/${encodeURIComponent(c.id)}`)} />
          ))}
        </div>
      )}
    </div>
  )
}
