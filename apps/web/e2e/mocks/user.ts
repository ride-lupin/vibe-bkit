import type { Page } from '@playwright/test'
import type { ProfileResponse, ApiError } from '@vibe-bkit/shared'

const API_URL = process.env.VITE_API_URL ?? 'http://localhost:3000'

const profileSuccessBody = {
  data: {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    role: 'user' as const,
    phone: '010-1234-5678',
  },
} satisfies ProfileResponse

const profileUnauthorizedBody = {
  error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다' },
} satisfies ApiError

export async function mockProfileSuccess(page: Page): Promise<void> {
  await page.route(`${API_URL}/users/me`, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(profileSuccessBody),
    })
  })
}

export async function mockProfileUnauthorized(page: Page): Promise<void> {
  await page.route(`${API_URL}/users/me`, (route) => {
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify(profileUnauthorizedBody),
    })
  })
}
