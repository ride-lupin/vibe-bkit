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
