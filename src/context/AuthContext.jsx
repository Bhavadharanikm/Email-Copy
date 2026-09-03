import { createContext, useContext, useState, useCallback } from 'react'
import { readSession, writeSession, clearSession } from '../lib/session'

const AuthContext = createContext(null)

/* `user` is the server-issued { id, name, role, isAdmin }; the token that
   backs it lives beside it in the same stored session and is attached to
   every API call by lib/api.js. Nothing here decides who is admin — login.js
   does, and it is signed into the token. */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readSession()?.user || null)

  const login = useCallback((session) => {
    writeSession(session)
    setUser(session.user)
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
