/**
 * Azure SQL connection helper (Microsoft Entra / Managed Identity).
 * When SQL_SERVER is unset, callers should use the filesystem catalogue fallback.
 */
import sql from 'mssql'
import { DefaultAzureCredential } from '@azure/identity'

const SQL_SERVER = process.env.SQL_SERVER || ''
const SQL_DATABASE = process.env.SQL_DATABASE || 'tpghelper'
const SQL_AUTH = (process.env.SQL_AUTH || 'entra').toLowerCase()

let poolPromise = null
let credential = null

export function sqlConfigured() {
  return Boolean(SQL_SERVER)
}

export function academicYearDefault() {
  return process.env.ACADEMIC_YEAR || '26-27'
}

async function accessToken() {
  if (!credential) credential = new DefaultAzureCredential()
  const scope = 'https://database.windows.net/.default'
  const result = await credential.getToken(scope)
  if (!result?.token) throw new Error('Failed to acquire Entra token for Azure SQL')
  return result.token
}

export async function getPool() {
  if (!sqlConfigured()) {
    throw new Error('SQL_SERVER is not set')
  }
  if (!poolPromise) {
    poolPromise = (async () => {
      // #region agent log
      const _t0 = Date.now()
      fetch('http://127.0.0.1:7469/ingest/4ca7d749-a7d9-4b5d-ae5c-233979a57a10',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ca5ade'},body:JSON.stringify({sessionId:'ca5ade',runId:'pre',hypothesisId:'B',location:'db.js:getPool:start',message:'SQL pool connect start',data:{server:SQL_SERVER,database:SQL_DATABASE,auth:SQL_AUTH},timestamp:Date.now()})}).catch(()=>{})
      // #endregion
      if (SQL_AUTH !== 'entra') {
        throw new Error(`Unsupported SQL_AUTH="${SQL_AUTH}" (expected entra)`)
      }
      const token = await accessToken()
      // #region agent log
      fetch('http://127.0.0.1:7469/ingest/4ca7d749-a7d9-4b5d-ae5c-233979a57a10',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ca5ade'},body:JSON.stringify({sessionId:'ca5ade',runId:'pre',hypothesisId:'B',location:'db.js:getPool:token',message:'Entra token acquired',data:{ms:Date.now()-_t0,tokenLen:token?.length??0},timestamp:Date.now()})}).catch(()=>{})
      // #endregion
      const pool = await sql.connect({
        server: SQL_SERVER,
        database: SQL_DATABASE,
        authentication: {
          type: 'azure-active-directory-access-token',
          options: { token },
        },
        options: {
          encrypt: true,
          trustServerCertificate: false,
          // Serverless auto-pause wake can exceed this; fail fast → filesystem catalogue.
          connectTimeout: Number(process.env.SQL_CONNECT_TIMEOUT_MS || 5000),
          requestTimeout: Number(process.env.SQL_REQUEST_TIMEOUT_MS || 15000),
        },
        pool: {
          max: 5,
          min: 0,
          idleTimeoutMillis: 30000,
        },
      })
      // #region agent log
      fetch('http://127.0.0.1:7469/ingest/4ca7d749-a7d9-4b5d-ae5c-233979a57a10',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ca5ade'},body:JSON.stringify({sessionId:'ca5ade',runId:'pre',hypothesisId:'B',location:'db.js:getPool:connected',message:'SQL connected',data:{ms:Date.now()-_t0},timestamp:Date.now()})}).catch(()=>{})
      // #endregion
      return pool
    })().catch(err => {
      // #region agent log
      fetch('http://127.0.0.1:7469/ingest/4ca7d749-a7d9-4b5d-ae5c-233979a57a10',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ca5ade'},body:JSON.stringify({sessionId:'ca5ade',runId:'pre',hypothesisId:'B',location:'db.js:getPool:error',message:'SQL pool failed',data:{err:err instanceof Error?err.message:String(err)},timestamp:Date.now()})}).catch(()=>{})
      // #endregion
      poolPromise = null
      throw err
    })
  }
  return poolPromise
}

export { sql }
