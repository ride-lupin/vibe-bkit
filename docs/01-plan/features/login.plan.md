---
template: plan
version: 1.0
feature: login
date: 2026-03-19
status: Draft
---

# 로그인 기능 개발 — Plan

## Executive Summary

| Perspective            | Content                                                                                                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Problem**            | 현재 앱에 인증 체계 없음. 모든 사용자가 구분 없이 접근 가능하며, 사용자별 데이터 격리 불가.                                                                                                                                                 |
| **Solution**           | 이메일/비밀번호 기반 로그인 폼 구현. 액세스 토큰(1분, Zustand) + 리프레시 토큰(7일, **HttpOnly 쿠키**) 이중 발급. 리프레시 토큰은 JS 접근 불가 쿠키로 XSS 유출 방지. 액세스 토큰 만료 시 자동 재발급. 로그인 성공 시 `/` 홈으로 리다이렉트. |
| **Function/UX Effect** | 이메일·비밀번호 입력 후 로그인 버튼 클릭 → JWT 발급 → 홈 화면 이동. react-hook-form + Zod로 실시간 필드 검증 제공.                                                                                                                          |
| **Core Value**         | 인증된 사용자만 앱 기능에 접근. 이후 Todo 등 사용자별 데이터 기능의 기반 인프라 역할.                                                                                                                                                       |

---

## 1. 기능 개요

| 항목     | 내용                |
| -------- | ------------------- |
| Feature  | login               |
| 시작일   | 2026-03-19          |
| 우선순위 | High                |
| 레벨     | Dynamic (Fullstack) |

**유저 스토리**: 사용자가 이메일과 비밀번호를 입력하고 로그인 버튼을 누르면 인증되어 홈 화면(`/`)으로 이동한다.

---

## 2. 기능 요구사항 (FR)

| ID    | 요구사항                                                                                 | 우선순위 |
| ----- | ---------------------------------------------------------------------------------------- | -------- |
| FR-01 | 로그인 페이지 (`/login`) — 이메일 필드, 비밀번호 필드, 로그인 버튼                       | Must     |
| FR-02 | react-hook-form + `LoginSchema` (Zod) 로 실시간 폼 검증                                  | Must     |
| FR-03 | `POST /auth/login` API 엔드포인트 (이메일/비밀번호 검증 후 JWT 발급)                     | Must     |
| FR-04 | 로그인 성공 시 `/` 홈으로 이동                                                           | Must     |
| FR-05 | JWT **액세스 토큰만** Zustand + persist로 클라이언트 저장                                | Must     |
| FR-06 | 인증되지 않은 사용자가 `/` 접근 시 `/login`으로 리다이렉트 (Protected Route)             | Must     |
| FR-07 | DB `users` 테이블 (Drizzle ORM) — id, email, passwordHash, name, role, timestamps        | Must     |
| FR-08 | 로그인 실패 시 에러 메시지 표시 ("이메일 또는 비밀번호가 올바르지 않습니다")             | Must     |
| FR-09 | 로그인 응답: 액세스 토큰(1분)은 JSON body, 리프레시 토큰(7일)은 **HttpOnly 쿠키**로 발급 | Must     |
| FR-10 | `POST /auth/refresh` API — 쿠키의 리프레시 토큰을 자동 읽어 액세스 토큰 재발급           | Must     |
| FR-11 | 액세스 토큰 만료(401) 시 클라이언트에서 자동으로 `/auth/refresh` 호출 후 재시도          | Must     |
| FR-12 | `POST /auth/logout` API — 리프레시 토큰 DB 삭제 + **쿠키 만료(Max-Age=0) 처리**          | Must     |
| FR-13 | DB `refresh_tokens` 테이블 — token, userId, expiresAt, createdAt                         | Must     |

## 3. 비기능 요구사항 (NFR)

| ID     | 요구사항                                                                         |
| ------ | -------------------------------------------------------------------------------- |
| NFR-01 | 비밀번호 bcrypt 해시 저장 (평문 저장 금지)                                       |
| NFR-02 | 액세스 토큰 만료: **1분** (짧게 설정하여 리프레시 로직 검증)                     |
| NFR-03 | 리프레시 토큰 만료: **7일**, DB 저장으로 서버 측 무효화 가능                     |
| NFR-04 | 리프레시 토큰 쿠키 속성: `HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh` |
| NFR-05 | API 응답은 `ApiResponseSchema` 래퍼 형식 준수                                    |
| NFR-06 | `enum` 금지, `any` 금지, `console.log` 제거                                      |
| NFR-07 | 리프레시 토큰은 별도 시크릿(`REFRESH_TOKEN_SECRET`)으로 서명                     |

---

## 4. 기술 스택 매핑

| 영역        | 기술                                                  | 비고                      |
| ----------- | ----------------------------------------------------- | ------------------------- |
| 라우팅      | react-router-dom v7                                   | `/login`, `/` 라우트 추가 |
| 폼          | react-hook-form + @hookform/resolvers/zod             | `LoginSchema` 재사용      |
| 상태        | Zustand + persist                                     | 토큰 저장                 |
| HTTP        | ky (`apps/web/src/lib/api.ts`)                        | `POST /auth/login` 호출   |
| 백엔드      | Hono.js                                               | `/auth/login` 라우트      |
| DB          | Drizzle ORM + PostgreSQL                              | `users` 테이블 신규 생성  |
| 보안        | bcryptjs                                              | 비밀번호 해시             |
| 인증        | jsonwebtoken                                          | JWT 발급/검증             |
| 공유 스키마 | `LoginSchema`, `ApiErrorSchema` (`@vibe-bkit/shared`) | 기존 스키마 활용          |

---

## 5. 구현 범위

### In Scope

- `/login` 페이지 (LoginForm 컴포넌트)
- `POST /auth/login` API (액세스 토큰 1분 → JSON body, 리프레시 토큰 7일 → HttpOnly 쿠키)
- `POST /auth/refresh` API (쿠키의 리프레시 토큰 자동 읽어 액세스 토큰 재발급)
- `POST /auth/logout` API (리프레시 토큰 DB 삭제 + 쿠키 만료 처리)
- `users` DB 테이블 + 마이그레이션
- `refresh_tokens` DB 테이블 + 마이그레이션
- Zustand auth 스토어 (**액세스 토큰만** 저장, 리프레시 토큰은 쿠키로 분리)
- ky 인터셉터 — 401 응답 시 `/auth/refresh` 호출 후 원래 요청 재시도
- Protected Route (미인증 시 `/login` 리다이렉트)
- 홈(`/`) 페이지 — 로그인 후 도달하는 기본 화면

### Out of Scope

- 회원가입 (`/signup`) — 별도 PDCA
- 비밀번호 찾기 — 별도 PDCA
- 소셜 로그인 — 별도 PDCA

---

## 6. 파일 변경 계획

### 신규 생성

| 파일                                     | 설명                                                  |
| ---------------------------------------- | ----------------------------------------------------- |
| `apps/web/src/pages/login.tsx`           | 로그인 페이지                                         |
| `apps/web/src/pages/home.tsx`            | 홈 페이지 (기존 App.tsx 내용 이동)                    |
| `apps/web/src/components/login-form.tsx` | LoginForm 컴포넌트                                    |
| `apps/web/src/stores/auth-store.ts`      | Zustand auth 스토어                                   |
| `apps/web/src/lib/protected-route.tsx`   | Protected Route 컴포넌트                              |
| `apps/api/src/routes/auth.ts`            | `/auth/login`, `/auth/refresh`, `/auth/logout` 라우트 |
| `apps/api/src/lib/auth.ts`               | JWT 유틸 (signAccess, signRefresh, verify)            |

### 수정

| 파일                        | 변경 내용                                 |
| --------------------------- | ----------------------------------------- |
| `apps/web/src/App.tsx`      | react-router-dom 라우터 설정으로 교체     |
| `apps/web/src/main.tsx`     | QueryClientProvider + RouterProvider 설정 |
| `apps/api/src/db/schema.ts` | `users`, `refresh_tokens` 테이블 추가     |
| `apps/api/src/index.ts`     | `/auth` 라우트 마운트                     |

---

## 7. 의존성 추가

```bash
# Backend
pnpm add bcryptjs jsonwebtoken --filter @vibe-bkit/api
pnpm add -D @types/bcryptjs @types/jsonwebtoken --filter @vibe-bkit/api

# Frontend
pnpm add react-router-dom zustand --filter @vibe-bkit/web
```

> 참고: `react-hook-form`, `@hookform/resolvers`, `zod`는 이미 설치 예정 (CLAUDE.md 스택 기준)

---

## 8. 리스크

| 리스크                                     | 대응                                                          |
| ------------------------------------------ | ------------------------------------------------------------- |
| DB `users` 테이블 없음                     | Drizzle 마이그레이션으로 선행 생성                            |
| DB `refresh_tokens` 테이블 없음            | Drizzle 마이그레이션으로 선행 생성                            |
| react-router-dom 미설치                    | pnpm add로 추가                                               |
| JWT 시크릿 환경변수 누락                   | `.env.local`에 `JWT_SECRET`, `REFRESH_TOKEN_SECRET` 추가 필요 |
| 액세스 토큰 1분 → 잦은 갱신 요청           | ky 인터셉터로 투명하게 처리, UX 영향 없음                     |
| 리프레시 토큰 만료 중 재발급 경쟁          | 단일 인터셉터 큐잉으로 처리 (FR-11 구현 시 고려)              |
| 개발환경 HTTPS 없음 → `Secure` 쿠키 미작동 | 개발 시 `Secure` 생략 또는 mkcert로 로컬 HTTPS 구성           |
| CORS + 쿠키 크로스오리진 이슈              | API에 `credentials: 'include'` + CORS `allowCredentials` 설정 |
