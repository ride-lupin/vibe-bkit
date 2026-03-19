import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { healthRoute } from './routes/health'
import authRoute from './routes/auth'

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

app.onError((err, c) => {
  console.error('[ERROR]', err)
  return c.json({ error: err.message }, 500)
})

const port = Number(process.env.PORT) || 3000
serve({ fetch: app.fetch, port }, () => {
  console.info(`API running on http://localhost:${port}`)
})

export type AppType = typeof app
