import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

const APP_VERSION_BASE = '1.4.8'
const rootDir = path.dirname(fileURLToPath(import.meta.url))

type ProgrammeId = 'msba' | 'mgm' | 'lander'

const PROGRAMME_META: Record<
  ProgrammeId,
  {
    base: string
    analyticsId: string
    htmlTitle: string
    repoFallback: string
    publicDir: string | false
  }
> = {
  msba: {
    base: '/msba/',
    analyticsId: 'G-TGBLKX855E',
    htmlTitle: 'HKU MSc(BA) 选课助手',
    repoFallback: 'https://github.com/gingerbreap/HKUBS_BA_CourseList',
    publicDir: 'public/msba',
  },
  mgm: {
    base: '/mgm/',
    analyticsId: 'G-P5JGQYVL02',
    htmlTitle: 'HKU MGM 选课助手',
    repoFallback: 'https://github.com/gingerbreap/HKUBS_MGM_Helper',
    publicDir: 'public/mgm',
  },
  lander: {
    base: '/',
    analyticsId: 'G-TGBLKX855E',
    htmlTitle: 'HKU TPg Course Planner',
    repoFallback: 'https://github.com/gingerbreap/tpghelper',
    publicDir: false,
  },
}

function resolveProgrammeId(): ProgrammeId {
  const raw = (process.env.PROGRAMME || 'msba').toLowerCase()
  if (raw === 'mgm') return 'mgm'
  if (raw === 'lander') return 'lander'
  return 'msba'
}

function git(command: string): string {
  try {
    return execSync(command, { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

function buildAppVersionInfo(repoFallback: string) {
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
    repoUrl: repoUrl || repoFallback,
  }
}

function programmeHtmlPlugin(meta: (typeof PROGRAMME_META)[ProgrammeId]): Plugin {
  return {
    name: 'programme-html',
    transformIndexHtml(html) {
      return html
        .replace(/<title>.*?<\/title>/, `<title>${meta.htmlTitle}</title>`)
        .replace(/G-TGBLKX855E/g, meta.analyticsId)
        .replace(/G-P5JGQYVL02/g, meta.analyticsId)
    },
  }
}

const programmeId = resolveProgrammeId()
const meta = PROGRAMME_META[programmeId]
const appVersion = buildAppVersionInfo(meta.repoFallback)
const behindGateway = process.env.DEV_SITE_GATEWAY === '1'
const gatewayPort = Number(process.env.DEV_GATEWAY_PORT || 5173)

/** Pack id used for Vite aliases (lander falls back to msba stubs if ever imported). */
const packId = programmeId === 'mgm' ? 'mgm' : 'msba'

export default defineConfig({
  plugins: [react(), programmeHtmlPlugin(meta)],
  publicDir: meta.publicDir,
  base: meta.base,
  resolve: {
    alias: [
      {
        find: path.resolve(rootDir, 'src/programmes/activePack.ts'),
        replacement: path.resolve(rootDir, `src/programmes/${packId}/pack.ts`),
      },
      {
        find: path.resolve(rootDir, 'src/programmes/activeLocaleOverlays.ts'),
        replacement: path.resolve(
          rootDir,
          packId === 'mgm'
            ? 'src/programmes/mgm/localeOverlays.ts'
            : 'src/programmes/emptyLocaleOverlays.ts',
        ),
      },
    ],
  },
  server: {
    open: behindGateway ? false : meta.base,
    strictPort: behindGateway,
    hmr: behindGateway
      ? {
          clientPort: gatewayPort,
        }
      : undefined,
  },
  define: {
    __APP_VERSION__: JSON.stringify(appVersion.version),
    __APP_COMMIT_SHA__: JSON.stringify(appVersion.sha),
    __APP_REPO_URL__: JSON.stringify(appVersion.repoUrl),
    __PROGRAMME_ID__: JSON.stringify(programmeId),
  },
})
