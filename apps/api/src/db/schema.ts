import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const healthLogs = pgTable('health_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  checkedAt: timestamp('checked_at', { withTimezone: true }).defaultNow(),
  message: text('message'),
})
