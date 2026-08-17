import client, { Registry } from 'prom-client'
import { Request, Response, NextFunction } from 'express'

export const registry = new Registry()

// Default Node.js process metrics (event loop lag, memory, GC, etc.)
client.collectDefaultMetrics({ register: registry })

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [registry],
})

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
})

// Middleware: times every request and labels it by route pattern (not raw
// URL, so /api/tasks/abc-123/complete and /api/tasks/xyz/complete count as
// the same series instead of exploding cardinality per task ID).
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint()

  res.on('finish', () => {
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9
    const route = req.route?.path
      ? `${req.baseUrl}${req.route.path}`
      : req.path

    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    }

    httpRequestDuration.observe(labels, durationSeconds)
    httpRequestsTotal.inc(labels)
  })

  next()
}