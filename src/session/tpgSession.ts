/** Shared cross-entry session (same origin: lander + programme apps). */

export type TpgAuthMode = 'guest' | 'logged-in'

export const TPG_AUTH_MODE_KEY = 'tpghelper-auth-mode'
export const TPG_PREFERRED_PROGRAMME_KEY = 'tpghelper-preferred-programme'

/** Absolute site paths (Vite `base` for each entry). */
export const LANDER_BASE = '/'
export const LANDER_PROGRAMMES_URL = '/#/programmes'
export const LANDER_AUTH_URL = '/#/'

export const PROGRAMME_APP_PATHS: Record<string, string> = {
  msba: '/msba/',
  mgm: '/mgm/',
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore quota / private mode
  }
}

export function getAuthMode(): TpgAuthMode | null {
  const v = read(TPG_AUTH_MODE_KEY)
  if (v === 'guest' || v === 'logged-in') return v
  return null
}

export function setAuthMode(mode: TpgAuthMode) {
  write(TPG_AUTH_MODE_KEY, mode)
}

export function getPreferredProgramme(): string | null {
  return read(TPG_PREFERRED_PROGRAMME_KEY)
}

export function setPreferredProgramme(id: string) {
  write(TPG_PREFERRED_PROGRAMME_KEY, id)
}

export function clearPreferredProgramme() {
  try {
    localStorage.removeItem(TPG_PREFERRED_PROGRAMME_KEY)
  } catch {
    // ignore
  }
}

export function programmeAppPath(id: string): string | null {
  return PROGRAMME_APP_PATHS[id] ?? null
}

export function landerProgrammesUrl(): string {
  return LANDER_PROGRAMMES_URL
}

export function landerAuthUrl(): string {
  return LANDER_AUTH_URL
}
