---
template: design
version: 1.0
feature: frontend-service-layer
date: 2026-03-19
status: Draft
planRef: docs/01-plan/features/frontend-service-layer.plan.md
---

# 프런트엔드 서비스 레이어 분리 — Design

## 1. 아키텍처 개요

```
[Component]
  │  useMutation({ ...loginMutationOptions(), onSuccess, onError })
  │  useMutation({ ...logoutMutationOptions(), onSettled })
  │
  ▼
[services/auth/queries.ts]          ← 옵션 팩토리 (순수 함수, React 없음)
  │  loginMutationOptions()  → { mutationFn: Login → Promise<LoginResponse> }
  │  logoutMutationOptions() → { mutationFn: ()   → Promise<void>          }
  │
  ▼
[lib/api.ts]                        ← ky 인스턴스 (인터셉터 포함)
  │
  ▼
[Hono.js API]
  ├─ POST /auth/login
  └─ POST /auth/logout
```

---

## 2. 디렉터리 구조

```
apps/web/src/
├── services/
│   └── auth/
│       └── queries.ts          ← 신규 생성
├── hooks/                      ← 공통 훅 디렉터리 (현재 PDCA에서 파일 없음)
│   └── {domain}/
│       └── {hookName}.ts
├── components/
│   └── login-form.tsx          ← 수정
└── pages/
    └── home.tsx                ← 수정
```

---

## 3. `services/auth/queries.ts` 설계

### 3.1 타입 시그니처

```ts
import type { Login, LoginResponse } from '@vibe-bkit/shared'
import { api } from '@/lib/api'

// 로그인 뮤테이션 옵션
export const loginMutationOptions: () => {
  mutationFn: (data: Login) => Promise<LoginResponse>
}

// 로그아웃 뮤테이션 옵션
export const logoutMutationOptions: () => {
  mutationFn: () => Promise<void>
}
```

### 3.2 규칙

- `React` import 없음 — React Hook 미포함
- `onSuccess` / `onError` / `onSettled` 없음 — 부수 효과는 컴포넌트 책임
- `@vibe-bkit/shared` 타입으로 `mutationFn` 입출력 명시

---

## 4. `login-form.tsx` 수정 설계

### 4.1 변경 전

```tsx
// 직접 api 호출 + try/catch
const onSubmit = async (data: Login) => {
  setServerError(null)
  try {
    const res = await api.post('auth/login', { json: data }).json<LoginResponse>()
    setAccessToken(res.data.accessToken)
    navigate('/')
  } catch {
    setServerError('이메일 또는 비밀번호가 올바르지 않습니다')
  }
}
```

### 4.2 변경 후

```tsx
// useMutation 인라인 선언
const loginMutation = useMutation({
  ...loginMutationOptions(),
  onSuccess: (res) => {
    setAccessToken(res.data.accessToken)
    navigate('/')
  },
  onError: () => {
    setServerError('이메일 또는 비밀번호가 올바르지 않습니다')
  },
})

const onSubmit = (data: Login) => {
  setServerError(null)
  loginMutation.mutate(data)
}
```

### 4.3 상태 매핑

| 기존                             | 변경 후                       |
| -------------------------------- | ----------------------------- |
| `isSubmitting` (react-hook-form) | `loginMutation.isPending`     |
| `try { ... } catch { ... }`      | `onSuccess` / `onError` 콜백  |
| `api` import                     | 제거 (queries.ts 내부로 이동) |

### 4.4 import 변경

```tsx
// 제거
import { api } from '@/lib/api'

// 추가
import { useMutation } from '@tanstack/react-query'
import { loginMutationOptions } from '@/services/auth/queries'
```

---

## 5. `home.tsx` 수정 설계

### 5.1 변경 전

```tsx
// try/finally로 API 성공 여부와 무관하게 항상 clearAuth + navigate
const handleLogout = async () => {
  try {
    await api.post('auth/logout')
  } finally {
    clearAuth()
    navigate('/login')
  }
}
```

### 5.2 변경 후

```tsx
// onSettled: 성공/실패 모두 clearAuth + navigate (기존 finally와 동등)
const logoutMutation = useMutation({
  ...logoutMutationOptions(),
  onSettled: () => {
    clearAuth()
    navigate('/login')
  },
})
```

> `onSettled`를 사용하는 이유: 기존 `finally` 블록과 동일하게 API 성공·실패 모두에서 로컬 인증 상태를 초기화한다. `onSuccess`만 사용하면 API 오류 시 로그아웃이 안 된다.

### 5.3 상태 매핑

| 기존                      | 변경 후                       |
| ------------------------- | ----------------------------- |
| `handleLogout` async 함수 | `logoutMutation.mutate()`     |
| `try/finally`             | `onSettled` 콜백              |
| `api` import              | 제거 (queries.ts 내부로 이동) |

### 5.4 import 변경

```tsx
// 제거
import { api } from '@/lib/api'

// 추가
import { useMutation } from '@tanstack/react-query'
import { logoutMutationOptions } from '@/services/auth/queries'
```

---

## 6. import 의존 관계

```
login-form.tsx
  ├── @tanstack/react-query   (useMutation)
  ├── @/services/auth/queries (loginMutationOptions)
  ├── @/stores/auth-store     (setAccessToken)
  └── react-router-dom        (useNavigate)

home.tsx
  ├── @tanstack/react-query   (useMutation)
  ├── @/services/auth/queries (logoutMutationOptions)
  ├── @/stores/auth-store     (clearAuth)
  └── react-router-dom        (useNavigate)

services/auth/queries.ts
  ├── @vibe-bkit/shared       (Login, LoginResponse)
  └── @/lib/api               (api)
```

---

## 7. 검증 계획

```bash
# 타입 오류 없는지
pnpm typecheck

# 린트 통과
pnpm lint

# 기존 E2E 그대로 통과 (mock URL 기반 — 서비스 레이어 분리와 무관)
pnpm --filter @vibe-bkit/web test e2e/auth/login.spec.ts
```
