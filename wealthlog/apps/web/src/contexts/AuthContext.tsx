// apps/web/src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { api, setAccessToken, SharedUser } from '@wealthlog/common'

interface AuthCtx {
  user: SharedUser | null
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
  const [user, setUser] = useState<SharedUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  /* hit /auth/me once when the app mounts */
  useEffect(() => {
    refresh()

    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          logout() // Clear user state and token
          router.push('/login')
        }
        return Promise.reject(error)
      }
    )

    // Cleanup interceptor on unmount
    return () => {
      api.interceptors.response.eject(interceptor)
    }
  }, [router])

  /** re‑fetch current user */
  async function refresh() {
    try {
      setLoading(true)
      const { data } = await api.get('/auth/me')
      setUser(data.user ?? null)
    } catch (error) {
      // Don't clear user if it's not an auth error,
      // the interceptor will handle 401s.
      if (error.response?.status !== 401) {
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }

  /** destroy token + context */
  async function logout() {
    try {
      await api.post('/auth/logout')
    } catch {/* ignore */}
    setAccessToken(null) // Clear token from storage/cookies
    setUser(null) // Clear user from state
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
