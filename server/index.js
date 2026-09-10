import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, 'public')
const port = Number(process.env.PORT) || 8080
const landerIndex = path.join(publicDir, 'index.html')

const app = express()

app.get('/api/health', (_req, res) => {
  const hasLander = fs.existsSync(landerIndex)
  res.json({
    ok: true,
    publicDir,
    hasLander,
  })
})

// Reserve /api/* for future routes (404 JSON rather than static fallback).
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'not_found' })
})

app.use(
  express.static(publicDir, {
    index: 'index.html',
    fallthrough: true,
  }),
)

// Explicit lander fallback (Express "Cannot GET /" when public/ is empty).
app.get('/', (_req, res) => {
  if (!fs.existsSync(landerIndex)) {
    res
      .status(503)
      .type('text/plain')
      .send(
        'Site assets missing (server/public/index.html). Deploy must run npm run build:site before start.',
      )
    return
  }
  res.sendFile(landerIndex)
})

app.listen(port, () => {
  console.log(`tpghelper listening on http://localhost:${port}`)
  console.log(`static root: ${publicDir} (lander index: ${fs.existsSync(landerIndex)})`)
})
