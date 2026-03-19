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
