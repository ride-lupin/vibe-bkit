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

  console.info('✅ 테스트 계정 완료: test@example.com / test1234! / 010-1234-5678')
  await sql.end()
})()
