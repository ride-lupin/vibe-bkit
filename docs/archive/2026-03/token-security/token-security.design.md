---
template: design
version: 1.0
feature: token-security
date: 2026-03-23
status: Draft
planRef: docs/01-plan/features/token-security.plan.md
---

# 토큰 보안 강화 — Design

## 1. 아키텍처 개요 (To-Be)

```
[Browser — 새로고침 시]
  │
  ├─ App.tsx 마운트
  │    └─ silentRefresh() 호출 (isAuthLoading = true)
  │         ├─ 성공: accessToken → Zustand 메모리 저장, isAuthLoading = false
  │         └─ 실패: accessToken = null, isAuthLoading = false
  │
  ├─ Zustand (accessToken — 메모리, persist 없음)
  │    └─ isAuthLoading: boolean (복구 중 라우트 판단 보류 플래그)
  │
  ├─ Cookie (refreshToken — HttpOnly, JS 접근 불가)  ← 변경 없음
  │
  └─ ky HTTP Client                                  ← 변경 없음
       ├─ beforeRequest: Authorization: Bearer {accessToken}
       └─ afterResponse: 401 → /auth/refresh → 재시도

[ProtectedRoute 판단 순서]
  isAuthLoading=true  → <LoadingSpinner /> (판단 보류)
  isAuthLoading=false, !accessToken → <Navigate to="/login" />
  isAuthLoading=false, accessToken  → {children}

[Hono.js API]
  └─ /auth
       ├─ POST /login    → accessToken(15분, body) + refreshToken(7일, cookie)
       ├─ POST /refresh  → 쿠키 읽어 accessToken 재발급 (토큰 로테이션)
       └─ POST /logout   → DB 삭제 + 쿠키 만료
```

---

## 2. 변경 흐름

### 2.1 앱 초기화 — Silent Refresh (신규)

```
브라우저 새로고침 or 최초 진입
  → App.tsx useEffect 실행 (마운트 1회)
  → silentRefresh() 호출
       → isAuthLoading = true
       → POST /auth/refresh (HttpOnly Cookie 자동 포함)
       → 성공: accessToken → Zustand 저장, isAuthLoading = false
       → 실패 (쿠키 없음/만료): accessToken = null, isAuthLoading = false
  → ProtectedRoute: isAuthLoading=false 확인 후 라우트 결정
```

### 2.2 로그인 흐름 (변경 없음)

```
LoginForm 제출 → POST /auth/login
  → accessToken(15분) → Zustand 저장 (isAuthLoading은 false 유지)
  → refreshToken → HttpOnly Cookie
  → navigate('/')
```

### 2.3 API 요청 중 자동 갱신 (변경 없음)

```
ky 요청 → 401 응답
  → afterResponse 인터셉터: POST /auth/refresh
  → 새 accessToken → Zustand 업데이트
  → 원래 요청 재시도
```

### 2.4 로그아웃 흐름 (변경 없음)

```
POST /auth/logout → DB 삭제 + 쿠키 Max-Age=0
  → clearAuth(): accessToken = null
  → navigate('/login')
```

---

## 3. 코드 설계

### 3.1 Zustand Auth 스토어 (`apps/web/src/stores/auth-store.ts`)

**변경**: `persist` 제거, `isAuthLoading` 추가

```ts
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
  isAuthLoading: true, // 초기값 true: 복구 완료 전까지 보류
  setAccessToken: (token) => set({ accessToken: token }),
  setAuthLoading: (loading) => set({ isAuthLoading: loading }),
  clearAuth: () => set({ accessToken: null }),
}))
```

> `isAuthLoading` 초기값을 `true`로 설정하여 앱 마운트 직후 ProtectedRoute가
> `/login`으로 조기 리다이렉트하는 것을 방지한다.

---

### 3.2 ky 클라이언트 + silentRefresh (`apps/web/src/lib/api.ts`)

**변경**: `silentRefresh()` 함수 추출 및 export

```ts
import ky, { type BeforeRequestHook, type AfterResponseHook } from 'ky'
import { useAuthStore } from '@/stores/auth-store'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

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
      .post(`${API_BASE}/auth/refresh`, { credentials: 'include' })
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
  prefixUrl: API_BASE,
  credentials: 'include',
  hooks: {
    beforeRequest: [injectToken],
    afterResponse: [handleTokenRefresh],
  },
})

// 앱 초기화 시 silent refresh — accessToken 메모리 복구
export async function silentRefresh(): Promise<void> {
  const { setAccessToken, setAuthLoading } = useAuthStore.getState()
  try {
    const result = await ky
      .post(`${API_BASE}/auth/refresh`, { credentials: 'include' })
      .json<{ data: { accessToken: string } }>()
    setAccessToken(result.data.accessToken)
  } catch {
    // Refresh Token 없음/만료 → 미인증 상태 유지 (에러 무시)
  } finally {
    setAuthLoading(false)
  }
}
```

---

### 3.3 앱 초기화 (`apps/web/src/App.tsx`)

**변경**: 마운트 시 `silentRefresh()` 호출 — `useRef` guard로 React Strict Mode 이중 실행 차단

```tsx
import { useEffect, useRef } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { LoginPage } from '@/pages/login'
import { HomePage } from '@/pages/home'
import { ProtectedRoute } from '@/lib/protected-route'
import { silentRefresh } from '@/lib/api'

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <HomePage />
      </ProtectedRoute>
    ),
  },
])

export default function App() {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    silentRefresh()
  }, [])

  return <RouterProvider router={router} />
}
```

> React 18 Strict Mode는 개발 환경에서 `useEffect`를 마운트 시 2회 실행한다.
> `useRef` guard 없이는 `silentRefresh()`가 동시에 2회 호출되어 `/auth/refresh` 요청이
> 중복 발생하고, 백엔드에서 DB unique constraint 위반(500)이 발생할 수 있다.

---

### 3.4 Protected Route (`apps/web/src/lib/protected-route.tsx`)

**변경**: `isAuthLoading` 동안 로딩 UI 표시

```tsx
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const isAuthLoading = useAuthStore((s) => s.isAuthLoading)

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!accessToken) return <Navigate to="/login" replace />
  return <>{children}</>
}
```

---

### 3.5 JWT 변경 (`apps/api/src/lib/auth.ts`)

**변경 1**: `signAccessToken` — `'1m'` → `'15m'`
**변경 2**: `signRefreshToken` — `jti: randomUUID()` 추가

```ts
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'

// Access Token: 만료 15분으로 조정
export const signAccessToken = (payload: AccessPayload): string =>
  jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' })

// Refresh Token: jti(JWT ID)로 토큰 문자열 고유 보장
// 동시 요청 시 같은 payload + 같은 밀리초 → 동일 JWT 문자열 생성 → DB unique 위반 방지
export const signRefreshToken = (payload: RefreshPayload): string =>
  jwt.sign({ ...payload, jti: randomUUID() }, REFRESH_SECRET, { expiresIn: '7d' })
```

> `jti`(JWT ID)는 RFC 7519 표준 클레임으로, 각 토큰에 고유 식별자를 부여한다.
> React Strict Mode나 기타 경로로 동시 refresh 요청이 발생해도 서로 다른 토큰 문자열이
> 생성되므로 DB INSERT 충돌이 발생하지 않는다.

---

## 4. 테스트 설계

### 4.1 API 단위 테스트 업데이트 (`apps/api/test/auth/auth.test.ts`)

Access Token 만료 시각 변경 반영 — 기존 테스트 구조 유지, 만료 검증 케이스 조정

```ts
// 변경 전 주석/설명에서 '1분' → '15분'으로 업데이트
// 만료 시각 직접 검증하는 케이스가 있다면 해당 수치 수정
// 서명/검증 로직 자체는 변경 없으므로 대부분 테스트는 그대로 통과
```

### 4.2 E2E Mock 추가 (`apps/web/e2e/mocks/auth.ts`)

`mockRefreshSuccess`, `mockRefreshFailure` 함수 추가

```ts
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
```

### 4.3 세션 복구 E2E (`apps/web/e2e/auth/session-recovery.spec.ts`)

```ts
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
```

---

## 5. 구현 순서 (Do Phase 체크리스트)

1. **BE: `apps/api/src/lib/auth.ts`** — `signAccessToken` 만료 `'1m'` → `'15m'`, `signRefreshToken`에 `jti: randomUUID()` 추가
2. **BE: `apps/api/test/auth/auth.test.ts`** — 만료 관련 주석/수치 업데이트
3. **FE: `apps/web/src/stores/auth-store.ts`** — `persist` 제거, `isAuthLoading` + `setAuthLoading` 추가
4. **FE: `apps/web/src/lib/api.ts`** — `silentRefresh()` 함수 추출 및 export
5. **FE: `apps/web/src/App.tsx`** — `useRef` guard + `useEffect`로 `silentRefresh()` 1회 호출
6. **FE: `apps/web/src/lib/protected-route.tsx`** — `isAuthLoading` 로딩 처리 추가
7. **FE: `apps/web/e2e/mocks/auth.ts`** — `mockRefreshSuccess`, `mockRefreshFailure` 추가
8. **FE: `apps/web/e2e/auth/session-recovery.spec.ts`** — 신규 E2E 테스트 작성
9. **검증**: `pnpm typecheck && pnpm lint`
10. **테스트**:
    - `pnpm --filter @vibe-bkit/api test test/auth/auth.test.ts`
    - `pnpm --filter @vibe-bkit/web test e2e/auth/session-recovery.spec.ts`
    - `pnpm --filter @vibe-bkit/web test e2e/auth/login.spec.ts` (회귀 확인)
