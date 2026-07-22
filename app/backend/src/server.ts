import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'

import authRoutes from './middleware/auth'
import chatRoutes from './routes/chat'
import taskRoutes from './routes/tasks'

const app = express()

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
}))

app.use(express.json())

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

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: "Something broke" })
})

const PORT = Number(process.env.PORT) || 5000

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 RPG Engine running on port ${PORT}`)
})