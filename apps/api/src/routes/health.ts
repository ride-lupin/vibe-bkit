import { Hono } from 'hono'
import { HealthSchema } from '@vibe-bkit/shared'

export const healthRoute = new Hono()

healthRoute.get('/', (c) => {
  const response = HealthSchema.parse({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
  return c.json(response)
})
