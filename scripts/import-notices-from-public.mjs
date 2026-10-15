/**
 * Import public/{msba,mgm,mecon}/teachingPlanNotices.json into Azure SQL.
 *
 *   SQL_SERVER=… SQL_AUTH=entra ACADEMIC_YEAR=26-27 npm run db:import-notices
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sql from 'mssql'
import { DefaultAzureCredential } from '@azure/identity'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const PROGRAMMES = ['msba', 'mgm', 'mecon']
const year = process.env.ACADEMIC_YEAR || '26-27'
const server = process.env.SQL_SERVER
const database = process.env.SQL_DATABASE || 'tpghelper'

if (!server) {
  console.error('Set SQL_SERVER (and az login) before importing.')
  process.exit(1)
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
  const file = path.join(root, 'public', programmeId, 'teachingPlanNotices.json')
  if (!fs.existsSync(file)) {
    console.warn(`[skip] missing ${file}`)
    return 0
  }
  const notices = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (!Array.isArray(notices)) throw new Error(`Invalid JSON array: ${file}`)

  const tx = new sql.Transaction(pool)
  await tx.begin()
  try {
    await tx
      .request()
      .input('programmeId', sql.NVarChar(16), programmeId)
      .input('year', sql.NVarChar(10), year)
      .query(`
        DELETE FROM dbo.TeachingPlanNotice
        WHERE ProgrammeId = @programmeId AND AcademicYear = @year
      `)

    for (let i = 0; i < notices.length; i++) {
      const notice = notices[i]
      if (!notice?.id) continue
      await tx
        .request()
        .input('programmeId', sql.NVarChar(16), programmeId)
        .input('noticeId', sql.NVarChar(64), String(notice.id))
        .input('year', sql.NVarChar(10), year)
        .input('publishedAt', sql.NVarChar(32), String(notice.timestamp || ''))
        .input('sortIndex', sql.Int, i)
        .input('payload', sql.NVarChar(sql.MAX), JSON.stringify(notice))
        .query(`
          INSERT INTO dbo.TeachingPlanNotice (
            ProgrammeId, NoticeId, AcademicYear, PublishedAt, SortIndex, PayloadJson
          ) VALUES (
            @programmeId, @noticeId, @year, @publishedAt, @sortIndex, @payload
          )
        `)
    }
    await tx.commit()
  } catch (err) {
    await tx.rollback()
    throw err
  }
  return notices.length
}

const pool = await connect()
console.log(`Connected to ${server}/${database}; year=${year}`)
try {
  for (const id of PROGRAMMES) {
    const n = await importProgramme(pool, id)
    console.log(`Imported ${n} notices for ${id}`)
  }
} finally {
  await sql.close()
}
console.log('Done.')
