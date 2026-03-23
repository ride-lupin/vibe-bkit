import type { Page } from '@playwright/test'
import type { LoginResponse, ApiError } from '@vibe-bkit/shared'

const API_URL = process.env.VITE_API_URL ?? 'http://localhost:3000'

const loginSuccessBody = {
  data: {
    accessToken: 'mock-access-token',
    user: {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
      role: 'user' as const,
      phone: '010-1234-5678',
    },
  },
} satisfies LoginResponse

const loginFailureBody = {
  error: { code: 'INVALID_CREDENTIALS', message: '이메일 또는 비밀번호가 올바르지 않습니다' },
} satisfies ApiError

export async function mockLoginSuccess(page: Page): Promise<void> {
  await page.route(`${API_URL}/auth/login`, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(loginSuccessBody),
    })
  })
}

export async function mockLoginFailure(page: Page): Promise<void> {
  // Return 400 to bypass the token-refresh afterResponse hook (which only triggers on 401)
  await page.route(`${API_URL}/auth/login`, (route) => {
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify(loginFailureBody),
    })
  })
}

const refreshSuccessBody = {
  data: { accessToken: 'mock-refreshed-token' },
}

export async function mockRefreshSuccess(page: Page): Promise<void> {
  await page.route(`${API_URL}/auth/refresh`, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(refreshSuccessBody),
    })
  })
}

export async function mockRefreshFailure(page: Page): Promise<void> {
  await page.route(`${API_URL}/auth/refresh`, (route) => {
    route.fulfill({ status: 401 })
  })
}
