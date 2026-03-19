import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { zValidator } from '@hono/zod-validator'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { LoginSchema, LoginResponseSchema } from '@vibe-bkit/shared'
import { db } from '../db'
import { users, refreshTokens } from '../db/schema'
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_MAX_AGE,
} from '../lib/auth'

const auth = new Hono()

// POST /auth/login
auth.post('/login', zValidator('json', LoginSchema), async (c) => {
  const { email, password } = c.req.valid('json')

  const user = await db.query.users.findFirst({ where: eq(users.email, email) })
  if (!user) {
    return c.json(
      {
        error: { code: 'INVALID_CREDENTIALS', message: '이메일 또는 비밀번호가 올바르지 않습니다' },
      },
      401,
    )
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return c.json(
      {
        error: { code: 'INVALID_CREDENTIALS', message: '이메일 또는 비밀번호가 올바르지 않습니다' },
      },
      401,
    )
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role })
  const refreshToken = signRefreshToken({ sub: user.id })

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE * 1000)
  await db.insert(refreshTokens).values({ token: refreshToken, userId: user.id, expiresAt })

  setCookie(c, REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: '/auth/refresh',
    maxAge: REFRESH_TOKEN_MAX_AGE,
  })

  return c.json(
    LoginResponseSchema.parse({
      data: {
        accessToken,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      },
    }),
  )
})

// POST /auth/refresh
auth.post('/refresh', async (c) => {
  const token = getCookie(c, REFRESH_TOKEN_COOKIE)
  if (!token) {
    return c.json(
      { error: { code: 'INVALID_REFRESH_TOKEN', message: '다시 로그인해 주세요' } },
      401,
    )
  }

  let payload: { sub: string }
  try {
    payload = verifyRefreshToken(token)
  } catch {
    return c.json(
      { error: { code: 'INVALID_REFRESH_TOKEN', message: '다시 로그인해 주세요' } },
      401,
    )
  }

  const stored = await db.query.refreshTokens.findFirst({ where: eq(refreshTokens.token, token) })
  if (!stored || stored.expiresAt < new Date()) {
    return c.json(
      { error: { code: 'INVALID_REFRESH_TOKEN', message: '다시 로그인해 주세요' } },
      401,
    )
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, payload.sub) })
  if (!user) {
    return c.json(
      { error: { code: 'INVALID_REFRESH_TOKEN', message: '다시 로그인해 주세요' } },
      401,
    )
  }

  // 토큰 로테이션: 기존 삭제 후 신규 발급
  await db.delete(refreshTokens).where(eq(refreshTokens.token, token))

  const newAccessToken = signAccessToken({ sub: user.id, role: user.role })
  const newRefreshToken = signRefreshToken({ sub: user.id })

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE * 1000)
  await db.insert(refreshTokens).values({ token: newRefreshToken, userId: user.id, expiresAt })

  setCookie(c, REFRESH_TOKEN_COOKIE, newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: '/auth/refresh',
    maxAge: REFRESH_TOKEN_MAX_AGE,
  })

  return c.json({ data: { accessToken: newAccessToken } })
})

// POST /auth/logout
auth.post('/logout', async (c) => {
  const token = getCookie(c, REFRESH_TOKEN_COOKIE)
  if (token) {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, token))
  }
  deleteCookie(c, REFRESH_TOKEN_COOKIE, { path: '/auth/refresh' })
  return c.json({ data: { success: true } })
})

export default auth
