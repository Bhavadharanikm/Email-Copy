import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

export default function ReviewCampaign() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const dark = theme === 'dark'

  useEffect(() => {
    console.log('Review campaign:', id)
  }, [id])

  return (
    <div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
      <div style={{
        background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
        borderRadius: 20,
        padding: '40px 32px',
      }}>
        <p style={{ fontSize: 32, marginBottom: 16 }}>🔗</p>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: dark ? '#fff' : '#111827', marginBottom: 8 }}>
          Shareable Review Links
        </h2>
        <p style={{ fontSize: 13, color: dark ? 'rgba(255,255,255,0.4)' : '#9ca3af', lineHeight: 1.7, marginBottom: 24 }}>
          Coming soon — approve or reject a campaign from a link without needing to open the full studio.
        </p>
        <button
          onClick={() => navigate('/')}
          className="btn-secondary"
          style={dark ? { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' } : {}}
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  )
}
