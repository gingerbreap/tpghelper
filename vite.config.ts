import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

const APP_VERSION_BASE = '1.4.8'
/** Keep in sync with `src/programmes/msba` `viteBase` */
const MSBA_VITE_BASE = '/tpghelper/msba/'

function git(command: string): string {
  try {
    return execSync(command, { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

function buildAppVersionInfo() {
  const sha = git('git rev-parse --short HEAD')
  const commitDate = git('git log -1 --format=%ci') // e.g. 2026-09-04 12:22:11 +0800
  const match = commitDate.match(/^(\d{4})-(\d{2})-(\d{2})/)
  const yyMMdd = match ? `${match[1].slice(2)}${match[2]}${match[3]}` : ''
  const version = yyMMdd ? `${APP_VERSION_BASE}.${yyMMdd}` : APP_VERSION_BASE
  const repoUrl = git('git config --get remote.origin.url')
    .replace(/^git@github\.com:/, 'https://github.com/')
    .replace(/\.git$/, '')
  return {
    version,
    sha,
    repoUrl: repoUrl || 'https://github.com/gingerbreap/HKUBS_BA_CourseList',
  }
}

const appVersion = buildAppVersionInfo()

export default defineConfig({
  plugins: [react()],
  // Active programme base until multi-programme host routing exists
  base: MSBA_VITE_BASE,
  server: {
    open: MSBA_VITE_BASE,
  },
  define: {
    __APP_VERSION__: JSON.stringify(appVersion.version),
    __APP_COMMIT_SHA__: JSON.stringify(appVersion.sha),
    __APP_REPO_URL__: JSON.stringify(appVersion.repoUrl),
  },
})
