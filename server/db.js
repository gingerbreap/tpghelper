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
      if (SQL_AUTH !== 'entra') {
        throw new Error(`Unsupported SQL_AUTH="${SQL_AUTH}" (expected entra)`)
      }
      const token = await accessToken()
      return sql.connect({
        server: SQL_SERVER,
        database: SQL_DATABASE,
        authentication: {
          type: 'azure-active-directory-access-token',
          options: { token },
        },
        options: {
          encrypt: true,
          trustServerCertificate: false,
        },
        pool: {
          max: 5,
          min: 0,
          idleTimeoutMillis: 30000,
        },
      })
    })().catch(err => {
      poolPromise = null
      throw err
    })
  }
  return poolPromise
}

export { sql }
