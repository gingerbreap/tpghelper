/**
 * Programme meta (dataSyncHkt): Azure SQL or public/{id}/meta.json fallback.
 * One row per programme. SQL stores DATETIME2 as HKT wall clock;
 * API always returns `yyyy/MM/dd HH:mm`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPool, sql, sqlConfigured } from './db.js'
import { isProgrammeId } from './catalogue.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoPublic = path.join(__dirname, '..', 'public')
const builtPublic = path.join(__dirname, 'public')

/** @type {Map<string, { at: number, meta: { dataSyncHkt: string } }>} */
const cache = new Map()
const CACHE_MS = Number(process.env.CATALOGUE_CACHE_MS || 60_000)

/** @returns {string | null} */
function readHktFromObject(data) {
  if (!data || typeof data !== 'object') return null
  if (typeof data.dataSyncHkt === 'string' && data.dataSyncHkt.trim()) {
    return data.dataSyncHkt.trim()
  }
  if (typeof data.dataSync?.display === 'string' && data.dataSync.display.trim()) {
    return data.dataSync.display.trim()
  }
  if (typeof data.dataSync === 'string' && data.dataSync.trim()) {
    return data.dataSync.trim()
  }
  return null
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function formatHktWallClock(value) {
  if (value == null) return null
  if (typeof value === 'string') {
    const m = /^(\d{4})[-/](\d{2})[-/](\d{2})[ T](\d{2}):(\d{2})/.exec(value.trim())
    if (m) return `${m[1]}/${m[2]}/${m[3]} ${m[4]}:${m[5]}`
    return null
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getUTCFullYear()
    const mo = String(value.getUTCMonth() + 1).padStart(2, '0')
    const d = String(value.getUTCDate()).padStart(2, '0')
    const h = String(value.getUTCHours()).padStart(2, '0')
    const mi = String(value.getUTCMinutes()).padStart(2, '0')
    return `${y}/${mo}/${d} ${h}:${mi}`
  }
  return null
}

/**
 * @returns {{ dataSyncHkt: string } | null}
 */
function readFilesystemMeta(programmeId) {
  const candidates = [
    path.join(builtPublic, programmeId, 'meta.json'),
    path.join(repoPublic, programmeId, 'meta.json'),
  ]
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'))
      const dataSyncHkt = readHktFromObject(data)
      if (dataSyncHkt) return { dataSyncHkt }
    } catch {
      /* skip bad file */
    }
  }
  return null
}

async function loadFromSql(programmeId) {
  const pool = await getPool()
  const result = await pool
    .request()
    .input('programmeId', sql.NVarChar(16), programmeId)
    .query(`
      SELECT FORMAT(DataSyncHkt, 'yyyy/MM/dd HH:mm') AS DataSyncHkt
      FROM dbo.ProgrammeMeta
      WHERE ProgrammeId = @programmeId
    `)
  const row = result.recordset[0]
  const dataSyncHkt = formatHktWallClock(row?.DataSyncHkt)
  if (!dataSyncHkt) return null
  return { dataSyncHkt }
}

/**
 * @param {string} programmeId
 */
export async function getProgrammeMeta(programmeId) {
  if (!isProgrammeId(programmeId)) {
    const err = new Error('unknown_programme')
    err.status = 404
    throw err
  }

  const hit = cache.get(programmeId)
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return { meta: hit.meta, source: 'cache' }
  }

  if (sqlConfigured()) {
    try {
      const meta = await loadFromSql(programmeId)
      if (meta) {
        cache.set(programmeId, { at: Date.now(), meta })
        return { meta, source: 'sql' }
      }
    } catch (err) {
      console.error('[meta] SQL load failed, trying filesystem', err)
    }
  }

  const meta = readFilesystemMeta(programmeId)
  if (!meta) {
    const err = new Error('meta_unavailable')
    err.status = 503
    throw err
  }
  cache.set(programmeId, { at: Date.now(), meta })
  return { meta, source: 'filesystem' }
}

export function clearMetaCache() {
  cache.clear()
}
