import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { academicYearDefault, sqlConfigured } from './db.js'
import { getProgrammeCourses, isProgrammeId } from './catalogue.js'

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
    sqlConfigured: sqlConfigured(),
    academicYear: academicYearDefault(),
  })
})

app.get('/api/programmes/:programmeId/courses', async (req, res) => {
  const { programmeId } = req.params
  if (!isProgrammeId(programmeId)) {
    res.status(404).json({ error: 'unknown_programme' })
    return
  }
  const year = typeof req.query.year === 'string' && req.query.year ? req.query.year : academicYearDefault()
  try {
    const { courses, source, year: y } = await getProgrammeCourses(programmeId, year)
    res.setHeader('Cache-Control', 'public, max-age=60')
    res.json({ programmeId, academicYear: y, source, courses })
  } catch (err) {
    const status = err.status || 500
    console.error('[api] courses', programmeId, err)
    res.status(status).json({
      error: err.message || 'courses_unavailable',
      programmeId,
    })
  }
})

// Reserve remaining /api/* for JSON 404 (not static fallback).
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'not_found' })
})

app.use(
  express.static(publicDir, {
    index: 'index.html',
    fallthrough: true,
  }),
)

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
  console.log(`catalogue: ${sqlConfigured() ? 'Azure SQL (Entra)' : 'filesystem fallback'}`)
})
