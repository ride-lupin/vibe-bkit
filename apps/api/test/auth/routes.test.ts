import { describe, it, expect, beforeEach, vi } from 'vitest'
import app from '../../src/app'
import { signRefreshToken } from '../../src/lib/auth'

// ----------------------------------------------------------------
// Module mocks
// ----------------------------------------------------------------

const { mockDb, mockBcrypt } = vi.hoisted(() => ({
  mockDb: {
    query: {
      users: { findFirst: vi.fn() },
      refreshTokens: { findFirst: vi.fn() },
    },
    insert: vi.fn(),
    delete: vi.fn(),
  },
  mockBcrypt: { compare: vi.fn() },
}))

vi.mock('../../src/db', () => ({ db: mockDb }))
vi.mock('bcryptjs', () => ({ default: mockBcrypt }))

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

function postJson(path: string, body: unknown) {
  return app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function postWithCookie(path: string, cookie: string) {
  return app.request(path, {
    method: 'POST',
    headers: { Cookie: cookie },
  })
}

// ----------------------------------------------------------------

describe('POST /auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.insert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) })
  })

  it('올바른 자격증명 → 200 + accessToken + Set-Cookie', async () => {
    mockDb.query.users.findFirst.mockResolvedValue(TEST_USER)
    mockBcrypt.compare.mockResolvedValue(true)

    const res = await postJson('/auth/login', {
      email: 'user@example.com',
      password: 'password123',
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.accessToken).toBeDefined()
    expect(body.data.user.email).toBe('user@example.com')
    expect(body.data.user.role).toBe('user')
    expect(res.headers.get('Set-Cookie')).toContain('refreshToken')
  })

  it('존재하지 않는 이메일 → 401 INVALID_CREDENTIALS', async () => {
    mockDb.query.users.findFirst.mockResolvedValue(null)

    const res = await postJson('/auth/login', {
      email: 'unknown@example.com',
      password: 'password123',
    })

    expect(res.status).toBe(401)
    expect((await res.json()).error.code).toBe('INVALID_CREDENTIALS')
  })

  it('잘못된 비밀번호 → 401 INVALID_CREDENTIALS', async () => {
    mockDb.query.users.findFirst.mockResolvedValue(TEST_USER)
    mockBcrypt.compare.mockResolvedValue(false)

    const res = await postJson('/auth/login', {
      email: 'user@example.com',
      password: 'wrongpassword',
    })

    expect(res.status).toBe(401)
    expect((await res.json()).error.code).toBe('INVALID_CREDENTIALS')
  })

  it('유효하지 않은 입력(Zod 검증) → 400', async () => {
    const res = await postJson('/auth/login', { email: 'not-email', password: '' })

    expect(res.status).toBe(400)
  })
})

describe('POST /auth/refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.insert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) })
    mockDb.delete.mockReturnValue({ where: vi.fn().mockResolvedValue([]) })
  })

  it('유효한 리프레시 토큰 → 200 + 새 accessToken + 새 Set-Cookie', async () => {
    const refreshToken = signRefreshToken({ sub: TEST_USER.id })
    mockDb.query.refreshTokens.findFirst.mockResolvedValue({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })
    mockDb.query.users.findFirst.mockResolvedValue(TEST_USER)

    const res = await postWithCookie('/auth/refresh', `refreshToken=${refreshToken}`)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.accessToken).toBeDefined()
    expect(res.headers.get('Set-Cookie')).toContain('refreshToken')
  })

  it('쿠키 없음 → 401 INVALID_REFRESH_TOKEN', async () => {
    const res = await app.request('/auth/refresh', { method: 'POST' })

    expect(res.status).toBe(401)
    expect((await res.json()).error.code).toBe('INVALID_REFRESH_TOKEN')
  })

  it('잘못된 토큰 형식 → 401 INVALID_REFRESH_TOKEN', async () => {
    const res = await postWithCookie('/auth/refresh', 'refreshToken=invalid.token.here')

    expect(res.status).toBe(401)
    expect((await res.json()).error.code).toBe('INVALID_REFRESH_TOKEN')
  })

  it('만료된 DB 토큰(expiresAt 과거) → 401 INVALID_REFRESH_TOKEN', async () => {
    const refreshToken = signRefreshToken({ sub: TEST_USER.id })
    mockDb.query.refreshTokens.findFirst.mockResolvedValue({
      token: refreshToken,
      expiresAt: new Date(Date.now() - 1000),
    })

    const res = await postWithCookie('/auth/refresh', `refreshToken=${refreshToken}`)

    expect(res.status).toBe(401)
    expect((await res.json()).error.code).toBe('INVALID_REFRESH_TOKEN')
  })
})

describe('POST /auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.delete.mockReturnValue({ where: vi.fn().mockResolvedValue([]) })
  })

  it('쿠키 있음 → 200 + DB 토큰 삭제', async () => {
    const refreshToken = signRefreshToken({ sub: TEST_USER.id })

    const res = await postWithCookie('/auth/logout', `refreshToken=${refreshToken}`)

    expect(res.status).toBe(200)
    expect(mockDb.delete).toHaveBeenCalledTimes(1)
  })

  it('쿠키 없음 → 200 성공 (DB 접근 없음)', async () => {
    const res = await app.request('/auth/logout', { method: 'POST' })

    expect(res.status).toBe(200)
    expect(mockDb.delete).not.toHaveBeenCalled()
  })
})
