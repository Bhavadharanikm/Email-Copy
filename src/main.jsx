import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import './index.css'

// ── Auto-reload on new Vercel deploy ──────────────────────────────────────────
// Polls index.html every 90s. On new version detected, reloads immediately.
// All in-progress state is preserved — the Zustand store persists to
// localStorage and rehydrates automatically after the reload.
;(function startDeployPoller() {
  let currentHash = null
  const hash = s => s.split('').reduce((a, c) => Math.imul(31, a) + c.charCodeAt(0) | 0, 0)

  async function checkForUpdate() {
    try {
      const res = await fetch('/?_=' + Date.now(), { cache: 'no-store' })
      const text = await res.text()
      const h = hash(text)
      if (currentHash === null) { currentHash = h; return }
      if (h !== currentHash) window.location.reload()
    } catch { /* network blip — ignore */ }
  }

  setInterval(checkForUpdate, 90_000)
})()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
)
