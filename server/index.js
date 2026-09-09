import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, 'public')
const port = Number(process.env.PORT) || 8080

const app = express()

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

// Reserve /api/* for future routes (404 JSON rather than static fallback).
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'not_found' })
})

app.use(express.static(publicDir))

app.listen(port, () => {
  console.log(`tpghelper listening on http://localhost:${port}`)
})
