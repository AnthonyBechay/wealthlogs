// apps/web/src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { api, setAccessToken } from '@wealthlog/common'

interface User {
  id: number
  username: string
  // …add whatever user fields you expose from /auth/me
}

interface AuthCtx {
  user: User | null
  loading: boolean
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  /* hit /auth/me once when the app mounts */
  useEffect(() => {
    refresh()
  }, [])

  /** re‑fetch current user */
  async function refresh() {
    try {
      setLoading(true)
      const { data } = await api.get('/auth/me')
      setUser(data.user ?? null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  /** destroy token + context */
  async function logout() {
    try {
      await api.post('/auth/logout')
    } catch {/* ignore */}
    setAccessToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
