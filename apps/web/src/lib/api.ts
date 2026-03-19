import ky, { type BeforeRequestHook, type AfterResponseHook } from 'ky'
import { useAuthStore } from '@/stores/auth-store'

const injectToken: BeforeRequestHook = (request) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    request.headers.set('Authorization', `Bearer ${token}`)
  }
}

let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

const handleTokenRefresh: AfterResponseHook = async (request, _options, response) => {
  if (response.status !== 401) return response

  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshQueue.push((newToken) => {
        request.headers.set('Authorization', `Bearer ${newToken}`)
        resolve(ky(request))
      })
    })
  }

  isRefreshing = true
  try {
    const result = await ky
      .post(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/auth/refresh`, {
        credentials: 'include',
      })
      .json<{ data: { accessToken: string } }>()

    const newToken = result.data.accessToken
    useAuthStore.getState().setAccessToken(newToken)
    refreshQueue.forEach((cb) => cb(newToken))
    refreshQueue = []

    request.headers.set('Authorization', `Bearer ${newToken}`)
    return ky(request)
  } catch {
    useAuthStore.getState().clearAuth()
    window.location.href = '/login'
    return response
  } finally {
    isRefreshing = false
  }
}

export const api = ky.create({
  prefixUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  credentials: 'include',
  hooks: {
    beforeRequest: [injectToken],
    afterResponse: [handleTokenRefresh],
  },
})
