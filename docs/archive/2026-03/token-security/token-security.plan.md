---
template: plan
version: 1.0
feature: token-security
date: 2026-03-23
status: Draft
---

# 토큰 보안 강화 — Plan

## Executive Summary

| Perspective            | Content                                                                                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Problem**            | Access Token이 Zustand `persist` 미들웨어로 인해 **localStorage에 저장**되고 있어 XSS 공격 시 토큰 탈취 위험이 존재. 또한 Access Token 만료(1분)가 지나치게 짧아 갱신 빈도가 높음. |
| **Solution**           | Access Token을 in-memory(Zustand store, persist 제거)로만 보관하여 localStorage 노출 제거. Access Token 만료를 15분으로 조정. 페이지 새로고침 시 `/auth/refresh` 자동 호출로 복구. |
| **Function/UX Effect** | 사용자 경험 변화 없음. 새로고침 시 자동 토큰 복구로 로그아웃 없이 세션 유지. 보안 수준은 XSS 내성 수준으로 향상.                                                                   |
| **Core Value**         | Access Token의 XSS 노출 위험 제거. OWASP 권고 수준의 토큰 저장 전략 준수.                                                                                                          |

---

## 1. 기능 개요

| 항목     | 내용                |
| -------- | ------------------- |
| Feature  | token-security      |
| 시작일   | 2026-03-23          |
| 우선순위 | High                |
| 레벨     | Dynamic (Fullstack) |

**유저 스토리**: 개발자가 토큰 저장 전략을 개선하여, XSS 공격 시 Access Token이 탈취되지 않도록 한다. 사용자는 변화를 느끼지 않으며, 새로고침 후에도 자동으로 세션이 복구된다.

---

## 2. 현황 분석 (As-Is)

| 항목                 | 현재 상태                                    | 문제점                                                 |
| -------------------- | -------------------------------------------- | ------------------------------------------------------ |
| Access Token 저장소  | Zustand `persist` → localStorage (`auth` 키) | XSS 시 `localStorage.getItem('auth')`로 토큰 탈취 가능 |
| Access Token 만료    | 1분                                          | 갱신 요청 과다, 짧은 유효 윈도우로 경쟁 상태 발생 가능 |
| Refresh Token 저장소 | HttpOnly Cookie + DB                         | 정상 (JS 접근 불가)                                    |
| 새로고침 시 복구     | localStorage에서 복원 (persist)              | persist 제거 시 새로고침 = 토큰 소멸 → 보완 필요       |

---

## 3. 기능 요구사항 (FR)

| ID    | 요구사항                                                                                         | 우선순위 |
| ----- | ------------------------------------------------------------------------------------------------ | -------- |
| FR-01 | Zustand auth-store에서 `persist` 미들웨어 제거 — Access Token은 메모리에만 보관                  | Must     |
| FR-02 | 앱 초기화 시(`App.tsx`) `/auth/refresh` 자동 호출하여 Access Token 복구 (silent refresh)         | Must     |
| FR-03 | 복구 완료 전까지 Protected Route는 로딩 상태 표시 (인증 여부 미확정 중 `/login` 리다이렉트 금지) | Must     |
| FR-04 | Access Token 만료를 1분 → **15분**으로 변경 (`apps/api/src/lib/auth.ts`)                         | Must     |
| FR-05 | 갱신 실패(Refresh Token 만료 등) 시 `/login`으로 리다이렉트 (기존 동작 유지)                     | Must     |
| FR-06 | E2E 테스트: 새로고침 후 인증 상태가 복구되어 홈 화면에 머무는 시나리오 검증                      | Should   |
| FR-07 | API 단위 테스트: Access Token 만료 시각 변경 반영 확인                                           | Should   |
| FR-08 | `App.tsx`의 `silentRefresh()` 호출을 `useRef` guard로 보호 — React Strict Mode의 이중 실행 차단  | Must     |
| FR-09 | `signRefreshToken`에 `jti: randomUUID()` 추가 — 동시 요청 시에도 토큰 문자열 고유 보장           | Must     |

---

## 4. 비기능 요구사항 (NFR)

| ID     | 요구사항                                                                                 |
| ------ | ---------------------------------------------------------------------------------------- |
| NFR-01 | Access Token은 JS 실행 컨텍스트(메모리)에만 존재 — localStorage/sessionStorage 저장 금지 |
| NFR-02 | 앱 초기 로딩 시 인증 복구 지연은 UX 관점에서 500ms 이하 목표                             |
| NFR-03 | `enum` 금지, `any` 금지, `console.log` 제거                                              |
| NFR-04 | 기존 로그인/로그아웃/자동갱신 플로우 동작 불변 (회귀 없음)                               |

---

## 5. 기술 스택 매핑

| 영역       | 기술                              | 비고                        |
| ---------- | --------------------------------- | --------------------------- |
| 상태 관리  | Zustand (persist 제거)            | in-memory 전환              |
| 초기화     | `App.tsx` 마운트 시 useEffect     | `/auth/refresh` silent call |
| 로딩 처리  | Zustand `isAuthLoading` 상태 추가 | Protected Route 가드        |
| 백엔드     | `apps/api/src/lib/auth.ts`        | `expiresIn: '15m'` 변경     |
| E2E 테스트 | Playwright (`apps/web/e2e/auth/`) | 새로고침 시나리오 추가      |
| API 테스트 | Vitest (`apps/api/test/auth/`)    | 만료 시각 변경 반영         |

---

## 6. 구현 범위

### In Scope

- `apps/web/src/stores/auth-store.ts` — `persist` 제거, `isAuthLoading` 상태 추가
- `apps/web/src/lib/api.ts` — `silentRefresh()` 함수 추출 및 export
- `apps/web/src/App.tsx` — 마운트 시 `silentRefresh()` 호출, 로딩 완료 후 라우트 렌더
- `apps/web/src/lib/protected-route.tsx` — `isAuthLoading` true 시 로딩 UI 표시
- `apps/api/src/lib/auth.ts` — Access Token 만료 `'1m'` → `'15m'`
- `apps/api/test/auth/auth.test.ts` — 만료 시각 관련 테스트 케이스 업데이트
- `apps/web/e2e/auth/session-recovery.spec.ts` — 새로고침 후 세션 복구 E2E 시나리오

### Out of Scope

- Refresh Token 저장 전략 변경 (HttpOnly Cookie 유지)
- CSRF 방어 추가 — 별도 PDCA
- 토큰 블랙리스트 / 강제 만료 — 별도 PDCA
- 다중 탭 동기화 — 별도 PDCA

---

## 7. 파일 변경 계획

### 수정

| 파일                                   | 변경 내용                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------- |
| `apps/web/src/stores/auth-store.ts`    | `persist` 제거, `isAuthLoading: boolean` + setter 추가                                |
| `apps/web/src/lib/api.ts`              | `silentRefresh()` 함수 추출 및 export                                                 |
| `apps/web/src/App.tsx`                 | 마운트 시 `silentRefresh()` 호출 (`useRef` guard로 1회 보장)                          |
| `apps/web/src/lib/protected-route.tsx` | `isAuthLoading` true 시 로딩 UI 표시                                                  |
| `apps/api/src/lib/auth.ts`             | `signAccessToken` — `expiresIn: '15m'`, `signRefreshToken` — `jti: randomUUID()` 추가 |
| `apps/api/test/auth/auth.test.ts`      | 만료 시각 관련 테스트 케이스 업데이트                                                 |

### 신규 생성

| 파일                                         | 설명                                  |
| -------------------------------------------- | ------------------------------------- |
| `apps/web/e2e/auth/session-recovery.spec.ts` | 새로고침 후 인증 세션 복구 E2E 테스트 |

---

## 8. 리스크

| 리스크                                                 | 대응                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------- |
| 새로고침 시 토큰 소멸 → UX 저하                        | 앱 초기화 시 silent refresh로 복구, 로딩 상태로 깜빡임 방지         |
| silent refresh 중 Protected Route 조기 리다이렉트      | `isAuthLoading` 상태로 라우트 판단 보류                             |
| Access Token 15분 → 탈취 시 유효 시간 증가             | 메모리 보관으로 XSS 탈취 자체가 어려워짐 (상호 보완)                |
| 기존 E2E 테스트 일부 실패 가능                         | localStorage 기반 Mock 코드 점검 및 수정                            |
| React Strict Mode 이중 실행 → `/auth/refresh` 2회 호출 | `App.tsx`에 `useRef` guard 적용 — 초기화 1회만 보장                 |
| 동시 refresh 요청 시 동일 JWT 생성 → DB unique 위반    | `signRefreshToken`에 `jti: randomUUID()` 추가 — 항상 고유 토큰 보장 |
