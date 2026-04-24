import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'

interface AuthStore {
  token: string | null
  refreshToken: string | null
  user: User | null
  login: (token: string, refreshToken: string, user: User) => void
  logout: () => void
  setToken: (token: string) => void
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      login: (token, refreshToken, user) => set({ token, refreshToken, user }),
      logout: () => set({ token: null, refreshToken: null, user: null }),
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
    }),
    { name: 'auth-store' }
  )
)
