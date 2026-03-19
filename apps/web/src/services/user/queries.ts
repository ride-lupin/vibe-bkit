import type { ProfileResponse } from '@vibe-bkit/shared'
import { api } from '@/lib/api'

export const profileQueryOptions = () => ({
  queryKey: ['profile'] as const,
  queryFn: () => api.get('users/me').json<ProfileResponse>(),
  staleTime: 5 * 60 * 1000,
})
