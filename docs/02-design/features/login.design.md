---
template: design
version: 1.0
feature: login
date: 2026-03-19
status: Draft
planRef: docs/01-plan/features/login.plan.md
---

# 로그인 기능 개발 — Design

## 1. 아키텍처 개요

```
[Browser]
  │
  ├─ Zustand (accessToken 메모리 저장)
  ├─ Cookie (refreshToken — HttpOnly, JS 접근 불가)
  │
  └─ ky HTTP Client
       ├─ beforeRequest: Authorization: Bearer {accessToken}
       └─ afterResponse: 401 → /auth/refresh → 원래 요청 재시도

[Hono.js API]
  └─ /auth
       ├─ POST /login    → accessToken(body) + refreshToken(cookie)
       ├─ POST /refresh  → 쿠키 읽어 accessToken 재발급
       └─ POST /logout   → DB 삭제 + 쿠키 만료

[PostgreSQL]
  ├─ users            (이메일, bcrypt 해시)
  └─ refresh_tokens   (token, userId, expiresAt)
```

---

## 2. 인증 흐름

### 2.1 로그인 흐름

```
사용자 입력 → LoginForm (react-hook-form + LoginSchema)
  → POST /auth/login
  → BE: email 조회 → bcrypt.compare(password, hash)
  → 성공: accessToken(1분) → JSON body
           refreshToken(7일) → Set-Cookie: HttpOnly
  → FE: accessToken → Zustand 저장
  → navigate('/')
```

### 2.2 API 요청 흐름 (토큰 자동 갱신)

```
ky 요청 → beforeRequest: Authorization 헤더 주입
  → 응답 401
  → afterResponse 인터셉터 발동
  → POST /auth/refresh (쿠키 자동 포함)
  → 새 accessToken → Zustand 업데이트
  → 원래 요청 재시도
```

### 2.3 로그아웃 흐름

```
logout() 호출
  → POST /auth/logout (쿠키 자동 포함)
  → BE: refreshToken DB 삭제 + Set-Cookie: Max-Age=0
  → FE: Zustand accessToken 초기화
  → navigate('/login')
```

---

## 3. DB 스키마 (Drizzle ORM)

### 3.1 users 테이블

```ts
// apps/api/src/db/schema.ts
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('user'), // 'admin' | 'user'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
```

### 3.2 refresh_tokens 테이블

```ts
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  token: text('token').notNull().unique(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
```

---

## 4. API 설계

### 4.1 POST /auth/login

**Request**

```ts
// Body (LoginSchema)
{ email: string, password: string }
```

**Response (성공 200)**

```ts
// JSON body
{
  data: {
    accessToken: string,  // JWT, 1분 만료
    user: { id, email, name, role }
  }
}
// Set-Cookie: refreshToken=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh; Max-Age=604800
```

**Response (실패 401)**

```ts
{ error: { code: 'INVALID_CREDENTIALS', message: '이메일 또는 비밀번호가 올바르지 않습니다' } }
```

### 4.2 POST /auth/refresh

**Request**

```
Cookie: refreshToken=<jwt>  (자동 포함, body 없음)
```

**Response (성공 200)**

```ts
{
  data: {
    accessToken: string
  }
}
// Set-Cookie: refreshToken=<new_jwt>; ... (토큰 로테이션)
```

**Response (실패 401)**

```ts
{ error: { code: 'INVALID_REFRESH_TOKEN', message: '다시 로그인해 주세요' } }
```

### 4.3 POST /auth/logout

**Request**

```
Cookie: refreshToken=<jwt>  (자동 포함, body 없음)
```

**Response (성공 200)**

```ts
{
  data: {
    success: true
  }
}
// Set-Cookie: refreshToken=; HttpOnly; Max-Age=0; Path=/auth/refresh
```

---

## 5. JWT 유틸 (`apps/api/src/lib/auth.ts`)

```ts
// 액세스 토큰: JWT_SECRET, 1분
export const signAccessToken = (payload: { sub: string; role: string }): string

// 리프레시 토큰: REFRESH_TOKEN_SECRET, 7일
export const signRefreshToken = (payload: { sub: string }): string

// 검증 (타입 분기)
export const verifyAccessToken = (token: string): { sub: string; role: string }
export const verifyRefreshToken = (token: string): { sub: string }
```

---

## 6. 프론트엔드 설계

### 6.1 Zustand Auth 스토어 (`apps/web/src/stores/auth-store.ts`)

```ts
type AuthStore = {
  accessToken: string | null
  setAccessToken: (token: string) => void
  clearAuth: () => void
}

// persist: localStorage, accessToken만 저장
// refreshToken은 쿠키로 분리 — 스토어에 포함하지 않음
```

### 6.2 ky 클라이언트 (`apps/web/src/lib/api.ts`)

```ts
// 현재: ky.create({ prefixUrl })
// 변경: hooks 추가

const api = ky.create({
  prefixUrl: import.meta.env.VITE_API_URL,
  credentials: 'include',          // 쿠키 자동 포함 (CORS)
  hooks: {
    beforeRequest: [
      (request) => {
        const token = useAuthStore.getState().accessToken
        if (token) request.headers.set('Authorization', `Bearer ${token}`)
      },
    ],
    afterResponse: [
      async (request, options, response) => {
        if (response.status !== 401) return response
        // 토큰 재발급 시도
        const refreshed = await ky.post('/auth/refresh', { credentials: 'include' }).json<...>()
        useAuthStore.getState().setAccessToken(refreshed.data.accessToken)
        // 원래 요청 재시도
        return ky(request)
      },
    ],
  },
})
```

### 6.3 컴포넌트 구조

```
apps/web/src/
├── App.tsx                        # RouterProvider로 교체
├── pages/
│   ├── login.tsx                  # /login 라우트
│   └── home.tsx                   # / 라우트 (기존 App.tsx 내용)
├── components/
│   └── login-form.tsx             # 폼 UI (react-hook-form + LoginSchema)
├── stores/
│   └── auth-store.ts              # Zustand (accessToken만)
└── lib/
    ├── api.ts                     # ky + 인터셉터 (수정)
    └── protected-route.tsx        # 미인증 시 /login 리다이렉트
```

### 6.4 라우터 구조 (`apps/web/src/App.tsx`)

```tsx
<RouterProvider
  router={createBrowserRouter([
    {
      path: '/login',
      element: <LoginPage />,
    },
    {
      path: '/',
      element: (
        <ProtectedRoute>
          <HomePage />
        </ProtectedRoute>
      ),
    },
  ])}
/>
```

### 6.5 LoginForm 컴포넌트 (`apps/web/src/components/login-form.tsx`)

```tsx
// react-hook-form + LoginSchema
const form = useForm<Login>({
  resolver: zodResolver(LoginSchema),
})

// 필드: email (type="email"), password (type="password")
// 버튼: "로그인" (loading 상태 시 비활성화)
// 에러: form.formState.errors + API 에러 메시지 (서버 401)
```

---

## 7. 환경 변수

### Backend (`apps/api/.env.local`)

```
JWT_SECRET=<random-secret-min-32chars>
REFRESH_TOKEN_SECRET=<different-random-secret-min-32chars>
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vibe_bkit
```

### Frontend (`apps/web/.env.local`)

```
VITE_API_URL=http://localhost:3000
```

---

## 8. 구현 순서 (Do Phase 체크리스트)

1. **의존성 설치**
   - `pnpm add bcryptjs jsonwebtoken --filter @vibe-bkit/api`
   - `pnpm add -D @types/bcryptjs @types/jsonwebtoken --filter @vibe-bkit/api`
   - `pnpm add react-router-dom zustand --filter @vibe-bkit/web`

2. **BE: DB 스키마** — `users`, `refresh_tokens` 테이블 추가 (`schema.ts`)

3. **BE: 마이그레이션 실행** — `pnpm --filter @vibe-bkit/api db:migrate`

4. **BE: JWT 유틸** — `apps/api/src/lib/auth.ts`

5. **BE: auth 라우트** — `apps/api/src/routes/auth.ts` (login / refresh / logout)

6. **BE: 라우트 마운트** — `apps/api/src/index.ts`에 `/auth` 추가

7. **FE: Zustand 스토어** — `apps/web/src/stores/auth-store.ts`

8. **FE: ky 인터셉터** — `apps/web/src/lib/api.ts` 수정

9. **FE: LoginForm 컴포넌트** — `apps/web/src/components/login-form.tsx`

10. **FE: 페이지** — `login.tsx`, `home.tsx`

11. **FE: ProtectedRoute** — `apps/web/src/lib/protected-route.tsx`

12. **FE: App.tsx** — RouterProvider로 교체

13. **검증** — `pnpm typecheck && pnpm lint`
