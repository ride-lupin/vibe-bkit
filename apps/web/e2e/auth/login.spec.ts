import { test, expect } from '@playwright/test'
import { mockLoginSuccess, mockLoginFailure } from '../mocks/auth'

test.describe('로그인 페이지', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('폼 요소 표시 확인', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible()
    await expect(page.getByLabel('이메일')).toBeVisible()
    await expect(page.getByLabel('비밀번호')).toBeVisible()
    await expect(page.getByRole('button', { name: '로그인' })).toBeVisible()
  })

  test('성공 로그인 → / 이동 + 성공 메시지', async ({ page }) => {
    await mockLoginSuccess(page)
    await page.getByLabel('이메일').fill('user@example.com')
    await page.getByLabel('비밀번호').fill('password123')
    await page.getByRole('button', { name: '로그인' }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByText('로그인에 성공했습니다')).toBeVisible()
  })

  test('실패 로그인 → 에러 메시지 표시', async ({ page }) => {
    await mockLoginFailure(page)
    await page.getByLabel('이메일').fill('wrong@example.com')
    await page.getByLabel('비밀번호').fill('wrongpass1')
    await page.getByRole('button', { name: '로그인' }).click()
    await expect(page.getByText('이메일 또는 비밀번호가 올바르지 않습니다')).toBeVisible()
    await expect(page).toHaveURL('/login')
  })

  test('빈 필드 제출 → Zod 검증으로 페이지 유지 + 필드 에러 표시', async ({ page }) => {
    await page.getByRole('button', { name: '로그인' }).click()
    await expect(page).toHaveURL('/login')
    await expect(page.getByText('Invalid email')).toBeVisible()
    await expect(page.getByText('String must contain at least 1 character(s)')).toBeVisible()
  })
})
