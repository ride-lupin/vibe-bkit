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
