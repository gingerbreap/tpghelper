/**
 * Import public/{msba,mgm,mecon}/meta.json into Azure SQL ProgrammeMeta.
 * meta.json keeps a human HKT string; SQL stores DATETIME2 (HKT wall clock).
 *
 *   SQL_SERVER=… SQL_AUTH=entra npm run db:import-meta
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sql from 'mssql'
import { DefaultAzureCredential } from '@azure/identity'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const PROGRAMMES = ['msba', 'mgm', 'mecon']
const server = process.env.SQL_SERVER
const database = process.env.SQL_DATABASE || 'tpghelper'

if (!server) {
  console.error('Set SQL_SERVER (and az login) before importing.')
  process.exit(1)
}

/** @returns {string | null} HKT `yyyy/MM/dd HH:mm` */
function readHkt(data) {
  if (typeof data?.dataSyncHkt === 'string' && data.dataSyncHkt.trim()) {
    return data.dataSyncHkt.trim()
  }
  if (typeof data?.dataSync?.display === 'string' && data.dataSync.display.trim()) {
    return data.dataSync.display.trim()
  }
  if (typeof data?.dataSync === 'string' && data.dataSync.trim()) {
    return data.dataSync.trim()
  }
  return null
}

/** `yyyy/MM/dd HH:mm` → SQL-safe `yyyy-MM-ddTHH:mm:00` (naive HKT). */
function toSqlDateTime(hkt) {
  const m = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})$/.exec(hkt)
  if (!m) throw new Error(`Invalid HKT stamp: ${hkt}`)
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00`
}

async function connect() {
  const credential = new DefaultAzureCredential()
  const { token } = await credential.getToken('https://database.windows.net/.default')
  return sql.connect({
    server,
    database,
    authentication: {
      type: 'azure-active-directory-access-token',
      options: { token },
    },
    options: { encrypt: true, connectTimeout: 60000 },
    connectionTimeout: 60000,
  })
}

async function importProgramme(pool, programmeId) {
  const file = path.join(root, 'public', programmeId, 'meta.json')
  if (!fs.existsSync(file)) {
    console.warn(`[skip] missing ${file}`)
    return false
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  const hkt = readHkt(data)
  if (!hkt) throw new Error(`Invalid dataSyncHkt in ${file}`)
  const sqlDt = toSqlDateTime(hkt)

  await pool
    .request()
    .input('programmeId', sql.NVarChar(16), programmeId)
    .input('hkt', sql.NVarChar(19), sqlDt)
    .query(`
      MERGE dbo.ProgrammeMeta AS t
      USING (SELECT @programmeId AS ProgrammeId) AS s
        ON t.ProgrammeId = s.ProgrammeId
      WHEN MATCHED THEN
        UPDATE SET DataSyncHkt = CAST(@hkt AS DATETIME2(0))
      WHEN NOT MATCHED THEN
        INSERT (ProgrammeId, DataSyncHkt)
        VALUES (@programmeId, CAST(@hkt AS DATETIME2(0)));
    `)
  console.log(`Upserted meta for ${programmeId}: ${hkt}`)
  return true
}

const pool = await connect()
console.log(`Connected to ${server}/${database}`)
try {
  for (const id of PROGRAMMES) {
    await importProgramme(pool, id)
  }
} finally {
  await sql.close()
}
console.log('Done.')
