---
template: plan
version: 1.1
feature: frontend-service-layer
date: 2026-03-19
status: Draft
---

# 프런트엔드 서비스 레이어 분리 — Plan

## Executive Summary

| Perspective            | Content                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Problem**            | 현재 `login-form.tsx`가 `api.post()` 직접 호출로 API 로직을 인라인 보유. 컴포넌트가 비대해지고, API 호출 로직 재사용 불가.            |
| **Solution**           | `services/{domain}/queries.ts`에 쿼리/뮤테이션 옵션 팩토리만 선언. 훅은 단독 사용 시 각 컴포넌트에, 공통 사용 시 `src/hooks/`에 선언. |
| **Function/UX Effect** | 컴포넌트 코드 간결화. `mutationFn` 로직은 서비스 레이어 집중, 부수 효과(`onSuccess`, `onError`)는 컴포넌트 책임으로 명확히 분리.      |
| **Core Value**         | API 호출 로직(`mutationFn`)과 UI 부수 효과를 분리. 이후 signup/profile 동일 패턴 재사용 가능.                                         |

---

## 1. 기능 개요

| 항목     | 내용                        |
| -------- | --------------------------- |
| Feature  | frontend-service-layer      |
| 시작일   | 2026-03-19                  |
| 우선순위 | High                        |
| 레벨     | Dynamic (Frontend Refactor) |

**목표**: `services/{domain}/queries.ts`에 쿼리/뮤테이션 **옵션 팩토리**만 선언하고, 훅(`useMutation` / `useQuery`)은 단독 사용 시 컴포넌트에, 공통 사용 시 `src/hooks/{domain}/{hookName}.ts`에 선언한다.

---

## 2. 기능 요구사항 (FR)

| ID    | 요구사항                                                                                                                              | 우선순위 |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-01 | `apps/web/src/services/auth/queries.ts` 생성 — `loginMutationOptions()`, `logoutMutationOptions()` 옵션 팩토리 선언                   | Must     |
| FR-02 | `loginMutationOptions()` — `mutationFn`만 포함 (`api.post('auth/login', ...)`), 반환 타입 `LoginResponse`                             | Must     |
| FR-03 | `logoutMutationOptions()` — `mutationFn`만 포함 (`api.post('auth/logout')`), 반환 타입 `void`                                         | Must     |
| FR-04 | `login-form.tsx` — `useMutation({ ...loginMutationOptions(), onSuccess, onError })` 인라인 선언                                       | Must     |
| FR-05 | 뮤테이션 `isPending` 상태로 버튼 로딩 처리 (기존 `isSubmitting` 대체)                                                                 | Must     |
| FR-06 | 뮤테이션 `onError` 콜백에서 `serverError` 상태 업데이트 (기존 catch 블록 동등 동작)                                                   | Must     |
| FR-07 | 옵션 팩토리 응답 타입은 `@vibe-bkit/shared` 타입 사용 (`LoginResponse`)                                                               | Must     |
| FR-08 | `home.tsx` — 로그아웃 버튼 추가, `useMutation({ ...logoutMutationOptions(), onSuccess })` 인라인 선언                                 | Should   |
| FR-09 | 공통 사용 훅이 발생할 경우 `apps/web/src/hooks/{domain}/{hookName}.ts`에 선언 (현재 PDCA에서는 해당 케이스 없음 — 패턴 규칙만 문서화) | Should   |

## 3. 비기능 요구사항 (NFR)

| ID     | 요구사항                                                                   |
| ------ | -------------------------------------------------------------------------- |
| NFR-01 | `any` 타입 사용 금지 — 옵션 팩토리 입출력 타입 명시                        |
| NFR-02 | `console.log` 금지                                                         |
| NFR-03 | 기존 E2E 테스트(`e2e/auth/login.spec.ts`) 수정 없이 통과 (인터페이스 불변) |
| NFR-04 | `services/queries.ts`는 React Hook 미포함 — 순수 옵션 객체만 반환          |

---

## 4. 기술 스택 매핑

| 영역            | 기술                                   | 비고                                       |
| --------------- | -------------------------------------- | ------------------------------------------ |
| 서버 상태       | `@tanstack/react-query` v5 (설치 완료) | `useMutation` 훅은 컴포넌트/hooks에서 선언 |
| HTTP 클라이언트 | `ky` (`apps/web/src/lib/api.ts`)       | 기존 `api` 인스턴스 그대로 사용            |
| 클라이언트 상태 | `zustand` (설치 완료)                  | `useAuthStore` — 컴포넌트/hooks에서 사용   |
| 공유 타입       | `@vibe-bkit/shared`                    | `LoginResponse`, `Login` 타입 활용         |

---

## 5. 구현 범위

### In Scope

- `apps/web/src/services/auth/queries.ts` 신규 생성
  - `loginMutationOptions()` — `mutationFn`만 포함, React Hook 없음
  - `logoutMutationOptions()` — `mutationFn`만 포함, React Hook 없음
- `apps/web/src/components/login-form.tsx` 수정 — `useMutation` 인라인 선언으로 교체
- `apps/web/src/pages/home.tsx` 수정 — 로그아웃 버튼 + `useMutation` 인라인 선언

### Out of Scope

- `lib/api.ts` 수정 (ky 인터셉터 유지)
- `src/hooks/` 디렉터리 생성 — 현재 공통 사용 훅 없음, 필요 시 다음 PDCA에서 추가
- React Query `useQuery` 패턴 (현재 도메인에 GET 요청 없음)
- signup, profile 등 신규 도메인 서비스 — 별도 PDCA에서 동일 패턴 적용

---

## 6. 파일 변경 계획

### 신규 생성

| 파일                                    | 설명                                                                   |
| --------------------------------------- | ---------------------------------------------------------------------- |
| `apps/web/src/services/auth/queries.ts` | 뮤테이션 옵션 팩토리 (`loginMutationOptions`, `logoutMutationOptions`) |

### 수정

| 파일                                     | 변경 내용                                                      |
| ---------------------------------------- | -------------------------------------------------------------- |
| `apps/web/src/components/login-form.tsx` | `api.post()` 직접 호출 제거 → `useMutation` + 옵션 팩토리 사용 |
| `apps/web/src/pages/home.tsx`            | 로그아웃 버튼 추가 → `useMutation` + 옵션 팩토리 사용          |

---

## 7. 서비스 레이어 패턴 가이드

### 디렉터리 구조

```
apps/web/src/
├── services/
│   └── {domain}/
│       └── queries.ts           ← 옵션 팩토리만 (React Hook 없음)
└── hooks/
    └── {domain}/
        └── {hookName}.ts       ← 공통 사용 훅만 (useMutation/useQuery 래핑)
```

### `services/queries.ts` 규칙

- **옵션 팩토리**만 선언 — `React`를 import하지 않음
- `useMutation` 기반: `{action}MutationOptions()` 네이밍, `{ mutationFn }` 반환
- `useQuery` 기반: `queryOptions()` 헬퍼 사용, `{resource}QueryOptions()` 네이밍
- 응답 타입은 `@vibe-bkit/shared`에서 import
- 부수 효과(`onSuccess`, `onError`, `navigate`, store 업데이트)는 포함하지 않음

### 훅 선언 위치 결정 규칙

| 조건                       | 위치                                      |
| -------------------------- | ----------------------------------------- |
| 단 1개 컴포넌트에서만 사용 | 해당 컴포넌트 내부 인라인 선언            |
| 2개 이상 컴포넌트에서 공통 | `src/hooks/{domain}/{hookName}.ts`에 추출 |

### `services/auth/queries.ts` 예시

```ts
import type { Login, LoginResponse } from '@vibe-bkit/shared'
import { api } from '@/lib/api'

export const loginMutationOptions = () => ({
  mutationFn: (data: Login) => api.post('auth/login', { json: data }).json<LoginResponse>(),
})

export const logoutMutationOptions = () => ({
  mutationFn: () => api.post('auth/logout').json<void>(),
})
```

### `login-form.tsx` 변경 전/후

**Before** (현재):

```tsx
const onSubmit = async (data: Login) => {
  try {
    const res = await api.post('auth/login', { json: data }).json<LoginResponse>()
    setAccessToken(res.data.accessToken)
    navigate('/')
  } catch {
    setServerError('이메일 또는 비밀번호가 올바르지 않습니다')
  }
}
```

**After** (목표):

```tsx
const loginMutation = useMutation({
  ...loginMutationOptions(),
  onSuccess: (res) => {
    setAccessToken(res.data.accessToken)
    navigate('/')
  },
  onError: () => setServerError('이메일 또는 비밀번호가 올바르지 않습니다'),
})

const onSubmit = (data: Login) => {
  loginMutation.mutate(data)
}
```

### 공통 훅 추출 예시 (미래 패턴)

```ts
// src/hooks/auth/useLogout.ts — 2개 이상 컴포넌트에서 로그아웃이 필요해질 때
export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const navigate = useNavigate()
  return useMutation({
    ...logoutMutationOptions(),
    onSuccess: () => {
      clearAuth()
      navigate('/login')
    },
  })
}
```

---

## 8. 리스크

| 리스크                                    | 대응                                                         |
| ----------------------------------------- | ------------------------------------------------------------ |
| E2E 테스트 `page.route()` mock URL 불일치 | mock은 URL 기반이므로 서비스 레이어 분리와 무관, 그대로 통과 |
| 에러 타입 명시 (`unknown` → `HTTPError`)  | `ky`의 `HTTPError` import로 타입 안전하게 처리               |
| `services/queries.ts`에 훅 혼입           | `React` import 없음, `use*` 함수 없음으로 코드 리뷰 시 확인  |
