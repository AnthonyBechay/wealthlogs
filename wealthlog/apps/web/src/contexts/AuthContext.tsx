import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { jwtDecode } from 'jwt-decode'
import { api, setAccessToken, SharedUser } from '@wealthlog/common'

interface AuthContextType {
  user: SharedUser | null
  loading: boolean
  login: (token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<SharedUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const handleToken = useCallback(
    async (token: string | null) => {
      if (token) {
        try {
          const decoded: { exp: number } = jwtDecode(token)
          if (decoded.exp * 1000 > Date.now()) {
            setAccessToken(token)
            const { data } = await api.get('/auth/me')
            setUser(data)
          } else {
            throw new Error('Token expired')
          }
        } catch (error) {
          console.error('Auth handleToken error:', error)
          setAccessToken(null)
          setUser(null)
        }
      } else {
        setAccessToken(null)
        setUser(null)
      }
      setLoading(false)
    },
    [api]
  )

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    handleToken(token)
  }, [handleToken])

  const login = (token: string) => {
    handleToken(token)
  }

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setAccessToken(null) // Clear token from storage/cookies
      setUser(null)
      router.push('/login')
    }
  }, [api, router])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
