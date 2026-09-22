import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { readSession, writeSession, clearSession } from '../lib/session'
import { authClient, googleAuthReady, isAllowedEmail, userFromGoogle, googleSignOut, ALLOWED_DOMAIN } from '../lib/authGoogle'

const AuthContext = createContext(null)

/* `user` is { id, name, role, isAdmin }; the token that backs it lives beside it
   in the same stored session and is attached to every API call by lib/api.js.
   Nothing here decides who is admin — the server does, and says so on each call.

   Two ways in. The old name-and-PIN sign-in mints the token itself. Google
   sign-in, on the Supabase project the video analyser uses, hands one back
   instead; this keeps the stored copy in step with it, including the hourly
   refresh, so a long session never goes stale mid-edit. */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readSession()?.user || null)
  const [googleError, setGoogleError] = useState('')

  const login = useCallback((session) => {
    writeSession(session)
    setUser(session.user)
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
    googleSignOut()
  }, [])

  useEffect(() => {
    if (!googleAuthReady) return
    let alive = true

    const adopt = async (session) => {
      if (!alive) return
      if (!session?.access_token) return
      const email = session.user?.email
      /* The project should never issue one to an outside address, but the check
         belongs on both sides: a session that slips through is signed straight
         back out rather than left sitting in the browser. */
      if (!isAllowedEmail(email)) {
        await googleSignOut()
        clearSession()
        setUser(null)
        setGoogleError(`${email || 'That account'} is not a @${ALLOWED_DOMAIN} address.`)
        return
      }
      const next = { token: session.access_token, user: userFromGoogle(session.user) }
      writeSession(next)
      setUser(next.user)
      setGoogleError('')
    }

    authClient.auth.getSession().then(({ data }) => adopt(data?.session))
    const { data: sub } = authClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') return
      adopt(session)
    })
    return () => { alive = false; sub?.subscription?.unsubscribe() }
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, googleError, setGoogleError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
