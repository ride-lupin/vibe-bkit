import { test, expect } from '@playwright/test'
import { mockRefreshSuccess, mockRefreshFailure } from '../mocks/auth'
import { mockProfileSuccess } from '../mocks/user'

test.describe('세션 복구 (새로고침)', () => {
  test('유효한 Refresh Token → 새로고침 후 홈 유지', async ({ page }) => {
    await mockRefreshSuccess(page)
    await mockProfileSuccess(page)
    await page.goto('/')
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: '홈' })).toBeVisible()
  })

  test('Refresh Token 없음/만료 → 새로고침 후 /login 이동', async ({ page }) => {
    await mockRefreshFailure(page)
    await page.goto('/')
    await expect(page).toHaveURL('/login')
  })
})
