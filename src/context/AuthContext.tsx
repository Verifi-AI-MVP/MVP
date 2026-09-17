import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { api, AUTH_EXPIRED_EVENT } from '../services/api'

interface User {
  id: string
  walletAddress?: string | null
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  role: string
}

interface AuthContextType {
  user: User | null
  accessToken: string | null
  loading: boolean
  loginWithWallet: (address: string, message: string, signature: string) => Promise<void>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem('accessToken'))
  const [loading, setLoading] = useState(true)

  const clearSession = useCallback(() => {
    localStorage.removeItem('accessToken')
    setUser(null)
    setAccessToken(null)
  }, [])

  const refreshAuth = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      setUser(null)
      setAccessToken(null)
      setLoading(false)
      return
    }
    try {
      const me = await api.get<User>('/auth/me')
      setUser(me)
    } catch {
      clearSession()
    } finally {
      setLoading(false)
    }
  }, [clearSession])

  useEffect(() => {
    if (!accessToken) {
      refreshAuth()
      return
    }
    api
      .get<User>('/auth/me')
      .then(setUser)
      .catch(refreshAuth)
      .finally(() => setLoading(false))
  }, [accessToken, refreshAuth])

  useEffect(() => {
    const onExpired = () => {
      clearSession()
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login')
      }
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired)
  }, [clearSession])

  const loginWithWallet = async (address: string, message: string, signature: string) => {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, message, signature }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { error?: string }).error || 'Wallet sign-in failed')
    }
    const data = await res.json()
    const token = data.accessToken ?? data.token
    localStorage.setItem('accessToken', token)
    setAccessToken(token)
    setUser(data.user)
  }

  const logout = async () => {
    clearSession()
  }

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, loginWithWallet, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth needs AuthProvider')
  return ctx
}
