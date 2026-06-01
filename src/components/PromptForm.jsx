/**
 * PromptForm
 * Step 1 — select client + write the prompt that goes directly to n8n.
 */
import { useState, useEffect } from 'react'
import { useCampaignStore } from '../store/campaignStore'
import { fetchClients } from '../lib/api'

export default function PromptForm({ onGenerate, dark = false }) {
  const [clients, setClients] = useState([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [templateName, setTemplateName] = useState('')
  const [templateNameLoading, setTemplateNameLoading] = useState(false)

  const {
    selectedClient, setClient,
    templateUrl, setTemplateUrl, templateId, locationId,
    prompt, setPrompt,
    isGenerating, error, setError,
  } = useCampaignStore((s) => ({
    selectedClient:  s.selectedClient,
    setClient:       s.setClient,
    templateUrl:     s.templateUrl,
    setTemplateUrl:  s.setTemplateUrl,
    templateId:      s.templateId,
    locationId:      s.locationId,
    prompt:          s.prompt,
    setPrompt:       s.setPrompt,
    isGenerating:    s.isGenerating,
    error:           s.error,
    setError:        s.setError,
  }))

  const [clientLoadError, setClientLoadError] = useState('')

  useEffect(() => {
    fetchClients()
      .then(data => {
        if (!data.length) setClientLoadError('Sheet returned 0 clients — check the sheet has data and is shared with the service account.')
        setClients(data)
      })
      .catch(e => {
        setClientLoadError(e.message || 'Failed to load clients from Google Sheet.')
        setClients([])
      })
      .finally(() => setLoadingClients(false))
  }, [])

  useEffect(() => {
    if (!locationId || !templateId) { setTemplateName(''); return }
    const matchedClient = clients.find(c => c.ghl?.locationId === locationId)
    if (matchedClient && matchedClient.id !== selectedClient?.id) {
      setClient(matchedClient)
      setPrompt(`Client Name: ${matchedClient.name}\nTheme: \nAudience: `)
    }
    const apiKey = matchedClient?.ghlApiKey || selectedClient?.ghlApiKey
    if (!apiKey) { setTemplateName(''); return }
    setTemplateNameLoading(true)
    setTemplateName('')
    fetch(`/.netlify/functions/fetch-template-name?templateId=${templateId}&locationId=${locationId}&apiKey=${encodeURIComponent(apiKey)}`)
      .then(r => r.json())
      .then(d => setTemplateName(d.name || d.error || ''))
      .catch(() => setTemplateName('Could not fetch template name'))
      .finally(() => setTemplateNameLoading(false))
  }, [templateId, locationId, clients])

  function handleClientChange(e) {
    const client = clients.find((c) => c.id === e.target.value)
    if (!client) return
    setClient(client)
    setError(null)
    setPrompt(`Client Name: ${client.name}\nTheme: \nAudience: `)
  }

  const canGenerate = selectedClient && prompt.trim().length > 20 && !isGenerating

  /* ── shared input styles ── */
  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 12,
    fontSize: 13,
    fontFamily: 'Inter, sans-serif',
    outline: 'none',
    transition: 'border-color 0.18s',
    backgroundColor: dark ? 'rgba(255,255,255,0.06)' : '#fff',
    border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
    color: dark ? 'rgba(255,255,255,0.85)' : '#111827',
  }

  const labelStyle = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 6,
    color: dark ? 'rgba(255,255,255,0.5)' : '#374151',
    letterSpacing: '0.02em',
  }

  const hintStyle = {
    fontSize: 11,
    color: dark ? 'rgba(255,255,255,0.25)' : '#9ca3af',
    fontWeight: 400,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Client dropdown */}
      <div>
        <label style={labelStyle}>
          Client <span style={{ color: dark ? '#f59e0b' : '#3b82f6' }}>*</span>
        </label>
        {loadingClients ? (
          <p style={{ fontSize: 13, color: dark ? 'rgba(255,255,255,0.3)' : '#9ca3af' }}>Loading clients…</p>
        ) : clientLoadError ? (
          <p style={{ fontSize: 11, color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '8px 12px' }}>
            {clientLoadError}
          </p>
        ) : (
          <select
            value={selectedClient?.id || ''}
            onChange={handleClientChange}
            disabled={isGenerating}
            style={{
              ...inputStyle,
              cursor: 'pointer',
              appearance: 'none',
              WebkitAppearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${dark ? '%23ffffff50' : '%239ca3af'}' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 14px center',
              backgroundSize: '12px 12px',
              paddingRight: 36,
            }}
          >
            <option value="" style={{ background: dark ? '#1a1a1a' : '#fff' }}>Select a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id} style={{ background: dark ? '#1a1a1a' : '#fff' }}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* GHL Template URL */}
      <div>
        <label style={labelStyle}>
          GHL Template URL{' '}
          <span style={hintStyle}>paste the link from GHL → Email Builder</span>
        </label>
        <input
          type="text"
          value={templateUrl}
          onChange={(e) => setTemplateUrl(e.target.value)}
          disabled={isGenerating}
          placeholder="https://app.gohighlevel.com/v2/location/.../marketing/emails/builder/..."
          style={{ ...inputStyle, opacity: isGenerating ? 0.5 : 1 }}
        />
        {templateUrl && (
          <div style={{ fontSize: 11, marginTop: 6 }}>
            {!templateId && <span style={{ color: '#f87171' }}>⚠ No valid template ID found in this URL</span>}
            {templateId && templateNameLoading && <span style={{ color: dark ? 'rgba(255,255,255,0.3)' : '#9ca3af' }}>Looking up template…</span>}
            {templateId && !templateNameLoading && templateName && (
              <span style={{ color: '#34d399' }}>✓ <strong>{templateName}</strong> <span style={{ color: dark ? 'rgba(255,255,255,0.3)' : '#9ca3af', fontWeight: 400 }}>({templateId})</span></span>
            )}
            {templateId && !templateNameLoading && !templateName && (
              <span style={{ color: '#34d399' }}>✓ ID extracted: {templateId}</span>
            )}
          </div>
        )}
      </div>

      {/* Prompt textarea */}
      <div>
        <label style={labelStyle}>
          Prompt{' '}
          <span style={hintStyle}>sent directly to your n8n workflow</span>
        </label>
        <textarea
          rows={6}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isGenerating}
          placeholder={`Client Name: FLOHOM\nTheme: \nAudience: `}
          style={{
            ...inputStyle,
            resize: 'none',
            lineHeight: 1.6,
            opacity: isGenerating ? 0.5 : 1,
          }}
        />
        <p style={{ ...hintStyle, marginTop: 6 }}>
          Fill in Theme and Audience, then hit Generate.
        </p>
      </div>

      {/* Loading state */}
      {isGenerating && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: dark ? 'rgba(59,130,246,0.1)' : '#eff6ff',
          border: `1px solid ${dark ? 'rgba(59,130,246,0.25)' : '#bfdbfe'}`,
          borderRadius: 12, padding: '12px 16px',
        }}>
          <svg style={{ animation: 'spin 1s linear infinite', width: 18, height: 18, flexShrink: 0 }} fill="none" viewBox="0 0 24 24">
            <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke={dark ? '#93c5fd' : '#3b82f6'} strokeWidth="4" />
            <path style={{ opacity: 0.75 }} fill={dark ? '#93c5fd' : '#3b82f6'} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: dark ? '#93c5fd' : '#1d4ed8' }}>n8n is writing your copy…</p>
            <p style={{ fontSize: 11, color: dark ? 'rgba(147,197,253,0.6)' : '#3b82f6', marginTop: 2 }}>This usually takes 30–45 seconds. Hang tight.</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !isGenerating && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          background: dark ? 'rgba(239,68,68,0.08)' : '#fef2f2',
          border: `1px solid ${dark ? 'rgba(239,68,68,0.2)' : '#fecaca'}`,
          borderRadius: 12, padding: '12px 16px',
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: dark ? '#f87171' : '#b91c1c' }}>Something went wrong</p>
            <p style={{ fontSize: 11, color: dark ? 'rgba(248,113,113,0.7)' : '#dc2626', marginTop: 2 }}>{error}</p>
            <button
              onClick={() => setError(null)}
              style={{ fontSize: 11, color: dark ? '#f87171' : '#ef4444', textDecoration: 'underline', marginTop: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={onGenerate}
        disabled={!canGenerate}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', padding: '13px',
          fontSize: 14, fontWeight: 600, fontFamily: 'Inter, sans-serif',
          borderRadius: 12, border: 'none', cursor: canGenerate ? 'pointer' : 'not-allowed',
          opacity: canGenerate ? 1 : 0.45,
          transition: 'all 0.18s',
          background: dark ? '#f59e0b' : '#3b82f6',
          color: dark ? '#111827' : '#fff',
          boxShadow: canGenerate
            ? (dark ? '0 2px 16px rgba(245,158,11,0.35)' : '0 2px 16px rgba(59,130,246,0.3)')
            : 'none',
        }}
        onMouseEnter={e => { if (canGenerate) e.currentTarget.style.background = dark ? '#d97706' : '#2563eb' }}
        onMouseLeave={e => { if (canGenerate) e.currentTarget.style.background = dark ? '#f59e0b' : '#3b82f6' }}
      >
        {isGenerating ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <svg style={{ animation: 'spin 1s linear infinite', width: 16, height: 16 }} fill="none" viewBox="0 0 24 24">
              <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generating…
          </span>
        ) : (
          'Generate Copy with n8n →'
        )}
      </button>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
