import { create } from 'zustand'

type AuthStore = {
  accessToken: string | null
  isAuthLoading: boolean
  setAccessToken: (token: string) => void
  setAuthLoading: (loading: boolean) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthStore>()((set) => ({
  accessToken: null,
  isAuthLoading: true,
  setAccessToken: (token) => set({ accessToken: token }),
  setAuthLoading: (loading) => set({ isAuthLoading: loading }),
  clearAuth: () => set({ accessToken: null }),
}))
