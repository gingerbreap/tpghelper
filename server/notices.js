/**
 * Teaching Plan notices: Azure SQL or public/{id}/teachingPlanNotices.json fallback.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { academicYearDefault, getPool, sql, sqlConfigured } from './db.js'
import { isProgrammeId } from './catalogue.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoPublic = path.join(__dirname, '..', 'public')
const builtPublic = path.join(__dirname, 'public')

/** @type {Map<string, { at: number, notices: unknown[] }>} */
const cache = new Map()
const CACHE_MS = Number(process.env.CATALOGUE_CACHE_MS || 60_000)

function cacheKey(programmeId, year) {
  return `notices:${programmeId}:${year}`
}

function readFilesystemNotices(programmeId) {
  const candidates = [
    path.join(builtPublic, programmeId, 'teachingPlanNotices.json'),
    path.join(repoPublic, programmeId, 'teachingPlanNotices.json'),
  ]
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    return Array.isArray(data) ? data : []
  }
  return null
}

async function loadFromSql(programmeId, year) {
  const pool = await getPool()
  const result = await pool
    .request()
    .input('programmeId', sql.NVarChar(16), programmeId)
    .input('year', sql.NVarChar(10), year)
    .query(`
      SELECT PayloadJson
      FROM dbo.TeachingPlanNotice
      WHERE ProgrammeId = @programmeId AND AcademicYear = @year
      ORDER BY SortIndex ASC, PublishedAt DESC
    `)
  const notices = []
  for (const row of result.recordset) {
    try {
      const parsed = JSON.parse(row.PayloadJson)
      if (parsed && typeof parsed === 'object') notices.push(parsed)
    } catch {
      /* skip bad row */
    }
  }
  return notices
}

/**
 * @param {string} programmeId
 * @param {string} [year]
 */
export async function getProgrammeNotices(programmeId, year = academicYearDefault()) {
  if (!isProgrammeId(programmeId)) {
    const err = new Error('unknown_programme')
    err.status = 404
    throw err
  }

  const key = cacheKey(programmeId, year)
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return { notices: hit.notices, source: 'cache', year }
  }

  if (sqlConfigured()) {
    try {
      const notices = await loadFromSql(programmeId, year)
      cache.set(key, { at: Date.now(), notices })
      return { notices, source: 'sql', year }
    } catch (err) {
      console.error('[notices] SQL load failed, trying filesystem', err)
    }
  }

  const notices = readFilesystemNotices(programmeId)
  if (!notices) {
    const err = new Error('notices_unavailable')
    err.status = 503
    throw err
  }
  cache.set(key, { at: Date.now(), notices })
  return { notices, source: 'filesystem', year }
}

export function clearNoticesCache() {
  for (const key of [...cache.keys()]) {
    if (key.startsWith('notices:')) cache.delete(key)
  }
}
