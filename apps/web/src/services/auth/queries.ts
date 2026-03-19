import type { Login, LoginResponse } from '@vibe-bkit/shared'
import { api } from '@/lib/api'

export const loginMutationOptions = () => ({
  mutationFn: (data: Login) => api.post('auth/login', { json: data }).json<LoginResponse>(),
})

export const logoutMutationOptions = () => ({
  mutationFn: () => api.post('auth/logout').json<void>(),
})
