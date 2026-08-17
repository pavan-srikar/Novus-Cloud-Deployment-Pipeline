import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'

import authRoutes from './middleware/auth.js'
import chatRoutes from './routes/chat.js'
import taskRoutes from './routes/tasks.js'
import { registry, metricsMiddleware } from './metrics.js'

const app = express()

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
}))

app.use(express.json())

app.use(metricsMiddleware)

app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.url}`)
  next()
})

app.use('/api/auth', authRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/tasks', taskRoutes)

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).send("OK")
})

app.get("/metrics", async (_req: Request, res: Response) => {
  res.set('Content-Type', registry.contentType)
  res.end(await registry.metrics())
})

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: "Something broke" })
})

const PORT = Number(process.env.PORT) || 5000

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 RPG Engine running on port ${PORT}`)
})