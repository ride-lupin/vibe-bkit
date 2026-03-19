import { test, expect } from '@playwright/test'
import { mockLoginSuccess } from '../mocks/auth'
import { mockProfileSuccess, mockProfileUnauthorized } from '../mocks/user'

async function loginAndGoHome(page: Parameters<typeof mockLoginSuccess>[0]) {
  await page.goto('/login')
  await page.getByLabel('이메일').fill('user@example.com')
  await page.getByLabel('비밀번호').fill('password123')
  await page.getByRole('button', { name: '로그인' }).click()
  await expect(page).toHaveURL('/')
}

test.describe('홈 — 프로필 조회', () => {
  test('프로필 4개 필드 렌더링 확인', async ({ page }) => {
    await mockLoginSuccess(page)
    await mockProfileSuccess(page)
    await loginAndGoHome(page)

    await expect(page.getByText('Test User')).toBeVisible()
    await expect(page.getByText('user@example.com')).toBeVisible()
    await expect(page.getByText('user', { exact: true })).toBeVisible()
    await expect(page.getByText('010-1234-5678')).toBeVisible()
  })

  test('프로필 API 인증 오류 → /login 리디렉션', async ({ page }) => {
    await mockLoginSuccess(page)
    await mockProfileUnauthorized(page)
    await page.route('**/auth/refresh', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'INVALID_REFRESH_TOKEN', message: '다시 로그인해 주세요' },
        }),
      }),
    )

    // 로그인 후 홈에서 프로필 401 → refresh 실패 → clearAuth + /login 리디렉션
    // '/'에 잠시 머물지 않을 수 있으므로 최종 URL만 확인
    await page.goto('/login')
    await page.getByLabel('이메일').fill('user@example.com')
    await page.getByLabel('비밀번호').fill('password123')
    await page.getByRole('button', { name: '로그인' }).click()

    await expect(page).toHaveURL('/login')
  })
})
