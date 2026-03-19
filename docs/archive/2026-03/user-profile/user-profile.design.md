# Design: user-profile

## 개요

Plan 문서 기반 구현 설계. 파일별 최종 코드를 명시한다.

---

## 1. DB 스키마 (`apps/api/src/db/schema.ts`)

`users` 테이블에 `phone` 컬럼 추가:

```ts
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('user'),
  phone: text('phone').notNull(), // 추가
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
```

---

## 2. 마이그레이션 SQL (수동 편집)

`db:generate` 실행 후 생성된 SQL 파일을 아래 내용으로 대체:

```sql
ALTER TABLE "users" ADD COLUMN "phone" text NOT NULL DEFAULT '000-0000-0000';
UPDATE "users" SET phone = '010-1234-5678' WHERE email = 'test@example.com';
ALTER TABLE "users" ALTER COLUMN "phone" DROP DEFAULT;
```

---

## 3. Seed (`apps/api/src/db/seed.ts`)

`phone` 추가 + `onConflictDoUpdate`로 기존 계정 phone 보정:

```ts
import bcrypt from 'bcryptjs'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { users } from './schema'

const sql = postgres(
  process.env.DATABASE_URL ?? 'postgresql://vibe:vibe1234@localhost:5432/vibe_bkit',
)
const db = drizzle(sql)

;(async () => {
  const passwordHash = await bcrypt.hash('test1234!', 10)

  await db
    .insert(users)
    .values({
      email: 'test@example.com',
      passwordHash,
      name: '테스트 유저',
      role: 'user',
      phone: '010-1234-5678',
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { phone: '010-1234-5678' },
    })

  console.log('✅ 테스트 계정 완료: test@example.com / test1234! / 010-1234-5678')
  await sql.end()
})()
```

`apps/api/package.json`에 `db:seed` 스크립트 추가:

```json
"db:seed": "tsx --env-file=.env.local src/db/seed.ts"
```

---

## 4. 공유 스키마 (`packages/shared/src/schemas/user.ts`)

`phone` 필드 + `ProfileResponseSchema` 추가:

```ts
import { z } from 'zod'
import { BaseEntitySchema, apiResponseSchema } from './common'

export const USER_ROLES = ['admin', 'user'] as const
export const UserRoleSchema = z.enum(USER_ROLES)

const emailSchema = z.string().email().max(255)
const passwordSchema = z
  .string()
  .min(8)
  .max(100)
  .regex(/^(?=.*[A-Za-z])(?=.*\d)/, '영문과 숫자를 모두 포함해야 합니다')
const phoneSchema = z.string().regex(/^010-\d{4}-\d{4}$/, '010-XXXX-XXXX 형식으로 입력해 주세요')

export const UserSchema = BaseEntitySchema.extend({
  email: emailSchema,
  name: z.string().min(1).max(100),
  role: UserRoleSchema.default('user'),
  phone: phoneSchema, // 추가
})

export const CreateUserSchema = z.object({
  email: emailSchema,
  name: z.string().min(1).max(100),
  password: passwordSchema,
  phone: phoneSchema, // 추가
})

export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  password: passwordSchema.optional(),
  phone: phoneSchema.optional(), // 추가
})

export const LoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
})

// --- Auth / Profile Response Schemas ---

export const PublicUserSchema = UserSchema.pick({
  id: true,
  email: true,
  name: true,
  role: true,
  phone: true, // 추가
})

export const LoginResponseSchema = apiResponseSchema(
  z.object({
    accessToken: z.string(),
    user: PublicUserSchema,
  }),
)

export const ProfileResponseSchema = apiResponseSchema(PublicUserSchema) // 추가

// --- Inferred Types ---

export type UserRole = z.infer<typeof UserRoleSchema>
export type User = z.infer<typeof UserSchema>
export type CreateUser = z.infer<typeof CreateUserSchema>
export type UpdateUser = z.infer<typeof UpdateUserSchema>
export type Login = z.infer<typeof LoginSchema>
export type PublicUser = z.infer<typeof PublicUserSchema>
export type LoginResponse = z.infer<typeof LoginResponseSchema>
export type ProfileResponse = z.infer<typeof ProfileResponseSchema> // 추가
```

---

## 5. 공유 스키마 index (`packages/shared/src/schemas/index.ts`)

`ProfileResponseSchema` / `ProfileResponse` export 추가:

```ts
// User (기존 + 추가)
export {
  USER_ROLES,
  UserRoleSchema,
  UserSchema,
  CreateUserSchema,
  UpdateUserSchema,
  LoginSchema,
  PublicUserSchema,
  LoginResponseSchema,
  ProfileResponseSchema, // 추가
} from './user'

export type {
  UserRole,
  User,
  CreateUser,
  UpdateUser,
  Login,
  PublicUser,
  LoginResponse,
  ProfileResponse, // 추가
} from './user'
```

---

## 6. 인증 미들웨어 (`apps/api/src/middleware/auth.ts`) — 신규

```ts
import { createMiddleware } from 'hono/factory'
import { verifyAccessToken } from '../lib/auth'

export type AuthVariables = {
  userId: string
  userRole: string
}

export const authMiddleware = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다' } }, 401)
  }

  const token = authHeader.slice(7)
  try {
    const payload = verifyAccessToken(token)
    c.set('userId', payload.sub)
    c.set('userRole', payload.role)
    await next()
  } catch {
    return c.json({ error: { code: 'UNAUTHORIZED', message: '유효하지 않은 토큰입니다' } }, 401)
  }
})
```

---

## 7. Users 라우트 (`apps/api/src/routes/users.ts`) — 신규

```ts
import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { ProfileResponseSchema } from '@vibe-bkit/shared'
import { db } from '../db'
import { users } from '../db/schema'
import { authMiddleware, type AuthVariables } from '../middleware/auth'

const usersRoute = new Hono<{ Variables: AuthVariables }>()

usersRoute.use(authMiddleware)

// GET /users/me
usersRoute.get('/me', async (c) => {
  const userId = c.get('userId')
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })

  if (!user) {
    return c.json({ error: { code: 'USER_NOT_FOUND', message: '사용자를 찾을 수 없습니다' } }, 404)
  }

  return c.json(
    ProfileResponseSchema.parse({
      data: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone },
    }),
  )
})

export default usersRoute
```

---

## 8. App 라우트 등록 (`apps/api/src/app.ts`)

```ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { healthRoute } from './routes/health'
import authRoute from './routes/auth'
import usersRoute from './routes/users' // 추가

const app = new Hono()

app.use(logger())
app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
    credentials: true,
  }),
)
app.route('/health', healthRoute)
app.route('/auth', authRoute)
app.route('/users', usersRoute) // 추가

app.onError((err, c) => {
  console.error('[ERROR]', err)
  return c.json({ error: err.message }, 500)
})

export default app
export type AppType = typeof app
```

---

## 9. 서비스 레이어 (`apps/web/src/services/user/queries.ts`) — 신규

```ts
import type { ProfileResponse } from '@vibe-bkit/shared'
import { api } from '@/lib/api'

export const profileQueryOptions = () => ({
  queryKey: ['profile'] as const,
  queryFn: () => api.get('users/me').json<ProfileResponse>(),
  staleTime: 5 * 60 * 1000,
})
```

---

## 10. 홈 화면 (`apps/web/src/pages/home.tsx`)

```tsx
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { logoutMutationOptions } from '@/services/auth/queries'
import { profileQueryOptions } from '@/services/user/queries'

export function HomePage() {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const { data: profile, isLoading } = useQuery(profileQueryOptions())

  const logoutMutation = useMutation({
    ...logoutMutationOptions(),
    onSettled: () => {
      clearAuth()
      navigate('/login')
    },
  })

  return (
    <main style={{ padding: '2rem' }}>
      <h1>홈</h1>
      {isLoading ? (
        <p>불러오는 중...</p>
      ) : profile ? (
        <section>
          <dl>
            <dt>이름</dt>
            <dd>{profile.data.name}</dd>
            <dt>이메일</dt>
            <dd>{profile.data.email}</dd>
            <dt>권한</dt>
            <dd>{profile.data.role}</dd>
            <dt>연락처</dt>
            <dd>{profile.data.phone}</dd>
          </dl>
        </section>
      ) : null}
      <button
        onClick={() => logoutMutation.mutate()}
        disabled={logoutMutation.isPending}
        style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
      >
        {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
      </button>
    </main>
  )
}
```

---

## 11. E2E 목킹 (`apps/web/e2e/mocks/user.ts`) — 신규

```ts
import type { Page } from '@playwright/test'
import type { ProfileResponse, ApiError } from '@vibe-bkit/shared'

const API_URL = process.env.VITE_API_URL ?? 'http://localhost:3000'

const profileSuccessBody = {
  data: {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    role: 'user' as const,
    phone: '010-1234-5678',
  },
} satisfies ProfileResponse

const profileUnauthorizedBody = {
  error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다' },
} satisfies ApiError

export async function mockProfileSuccess(page: Page): Promise<void> {
  await page.route(`${API_URL}/users/me`, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(profileSuccessBody),
    })
  })
}

export async function mockProfileUnauthorized(page: Page): Promise<void> {
  await page.route(`${API_URL}/users/me`, (route) => {
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify(profileUnauthorizedBody),
    })
  })
}
```

---

## 12. E2E 목킹 업데이트 (`apps/web/e2e/mocks/auth.ts`)

`PublicUser`에 `phone`이 추가되므로 `loginSuccessBody`에 phone 필드 추가:

```ts
// loginSuccessBody의 user에 phone 추가
const loginSuccessBody = {
  data: {
    accessToken: 'mock-access-token',
    user: {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
      role: 'user' as const,
      phone: '010-1234-5678', // 추가
    },
  },
} satisfies LoginResponse
```

---

## 13. Playwright E2E (`apps/web/e2e/user/profile.spec.ts`) — 신규

```ts
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
    await expect(page.getByText('user')).toBeVisible()
    await expect(page.getByText('010-1234-5678')).toBeVisible()
  })

  test('프로필 API 인증 오류 → /login 리디렉션', async ({ page }) => {
    await mockLoginSuccess(page)
    await mockProfileUnauthorized(page)
    // /auth/refresh도 실패시켜 clearAuth 트리거
    await page.route('**/auth/refresh', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'INVALID_REFRESH_TOKEN', message: '다시 로그인해 주세요' },
        }),
      }),
    )
    await loginAndGoHome(page)

    await expect(page).toHaveURL('/login')
  })
})
```

---

## 14. Vitest 단위 테스트 (`apps/api/test/users/routes.test.ts`) — 신규

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import app from '../../src/app'
import { signAccessToken } from '../../src/lib/auth'

// ----------------------------------------------------------------
// Module mocks
// ----------------------------------------------------------------

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    query: {
      users: { findFirst: vi.fn() },
    },
  },
}))

vi.mock('../../src/db', () => ({ db: mockDb }))

// ----------------------------------------------------------------
// Test fixtures
// ----------------------------------------------------------------

const TEST_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'user@example.com',
  name: 'Test User',
  role: 'user',
  phone: '010-1234-5678',
  passwordHash: '$2b$10$hashedpassword',
}

function getWithBearer(path: string, token: string) {
  return app.request(path, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

// ----------------------------------------------------------------

describe('GET /users/me', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('유효한 Bearer 토큰 → 200 + 프로필 반환', async () => {
    const token = signAccessToken({ sub: TEST_USER.id, role: TEST_USER.role })
    mockDb.query.users.findFirst.mockResolvedValue(TEST_USER)

    const res = await getWithBearer('/users/me', token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.email).toBe(TEST_USER.email)
    expect(body.data.name).toBe(TEST_USER.name)
    expect(body.data.role).toBe(TEST_USER.role)
    expect(body.data.phone).toBe(TEST_USER.phone)
    expect(body.data.passwordHash).toBeUndefined()
  })

  it('Authorization 헤더 없음 → 401 UNAUTHORIZED', async () => {
    const res = await app.request('/users/me')

    expect(res.status).toBe(401)
    expect((await res.json()).error.code).toBe('UNAUTHORIZED')
  })

  it('잘못된 토큰 형식 → 401 UNAUTHORIZED', async () => {
    const res = await getWithBearer('/users/me', 'invalid.token.here')

    expect(res.status).toBe(401)
    expect((await res.json()).error.code).toBe('UNAUTHORIZED')
  })

  it('DB 유저 미존재 → 404 USER_NOT_FOUND', async () => {
    const token = signAccessToken({ sub: 'nonexistent-id', role: 'user' })
    mockDb.query.users.findFirst.mockResolvedValue(null)

    const res = await getWithBearer('/users/me', token)

    expect(res.status).toBe(404)
    expect((await res.json()).error.code).toBe('USER_NOT_FOUND')
  })
})
```

---

## 구현 순서

```
1. packages/shared/src/schemas/user.ts    — phone 필드 추가
2. packages/shared/src/schemas/index.ts   — ProfileResponseSchema export
3. apps/api/src/db/schema.ts              — phone 컬럼 추가
4. apps/api/package.json                  — db:seed 스크립트 추가
   pnpm --filter @vibe-bkit/api db:generate
   (migration SQL 수동 편집)
   pnpm --filter @vibe-bkit/api db:migrate
5. apps/api/src/db/seed.ts                — phone + onConflictDoUpdate
   pnpm --filter @vibe-bkit/api db:seed
6. apps/api/src/middleware/auth.ts        — JWT 미들웨어 (신규)
7. apps/api/src/routes/users.ts           — GET /users/me (신규)
8. apps/api/src/app.ts                    — /users 라우트 등록
9. apps/web/src/services/user/queries.ts  — profileQueryOptions (신규)
10. apps/web/src/pages/home.tsx           — 프로필 useQuery + 렌더링
11. apps/web/e2e/mocks/auth.ts            — loginSuccessBody에 phone 추가
12. apps/web/e2e/mocks/user.ts            — 프로필 목킹 (신규)
13. apps/web/e2e/user/profile.spec.ts     — E2E 테스트 (신규)
14. apps/api/test/users/routes.test.ts    — Vitest 테스트 (신규)
```
