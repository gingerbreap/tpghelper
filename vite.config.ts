import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

/** Keep in sync with `src/config/appRepo.ts`. */
const APP_REPO_URL = 'https://github.com/gingerbreap/tpghelper'

const APP_VERSION_BASE = '2.0.2'
const rootDir = path.dirname(fileURLToPath(import.meta.url))

type ProgrammeId = 'msba' | 'mgm' | 'lander'

const PROGRAMME_META: Record<
  ProgrammeId,
  {
    base: string
    analyticsId: string
    htmlTitle: string
    publicDir: string | false
  }
> = {
  msba: {
    base: '/msba/',
    analyticsId: 'G-TGBLKX855E',
    htmlTitle: 'HKU MSc(BA) 选课助手',
    publicDir: 'public/msba',
  },
  mgm: {
    base: '/mgm/',
    analyticsId: 'G-P5JGQYVL02',
    htmlTitle: 'HKU MGM 选课助手',
    publicDir: 'public/mgm',
  },
  lander: {
    base: '/',
    analyticsId: 'G-TGBLKX855E',
    htmlTitle: 'HKU TPg Course Planner',
    publicDir: 'public/lander',
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
    // Prefer live origin; fall back to the shared monorepo URL (never legacy BA/MGM forks).
    repoUrl: repoUrl || APP_REPO_URL,
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
const appVersion = buildAppVersionInfo()
const behindGateway = process.env.DEV_SITE_GATEWAY === '1'
const gatewayPort = Number(process.env.DEV_GATEWAY_PORT || 5173)

/** Pack id used for Vite aliases (lander falls back to msba stubs if ever imported). */
const packId = programmeId === 'mgm' ? 'mgm' : 'msba'

/**
 * Site-wide PWA: manifests use scope "/" so lander ↔ msba ↔ mgm stay in one install.
 * Lander registers a root SW; programme builds keep a scoped SW for offline of that pack.
 * Root SW must not steal /msba or /mgm navigations (see navigateFallbackDenylist).
 */
const pwaIncludeAssets = [
  'favicon.ico',
  'favicon.svg',
  'favicon-96x96.png',
  'apple-touch-icon.png',
  'logo.png',
  'site.webmanifest',
  'site.zh-CN.webmanifest',
  'site.zh-HK.webmanifest',
  'web-app-manifest-192x192.png',
  'web-app-manifest-512x512.png',
]

const pwaPlugin = VitePWA({
  registerType: 'autoUpdate',
  // Keep locale-specific manifests in public/; do not generate a competing one.
  manifest: false,
  includeAssets: pwaIncludeAssets,
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,json,webmanifest}'],
    navigateFallback: 'index.html',
    // Iframe PDF loads are navigations; without a denylist Workbox serves index.html
    // (course outline embeds become a miniature homepage). Keep programme path denylist
    // for the lander SW so sibling apps are not claimed.
    navigateFallbackDenylist: [
      /\.pdf$/i,
      ...(programmeId === 'lander'
        ? [/^\/msba(?:\/|$)/i, /^\/mgm(?:\/|$)/i, /^\/api(?:\/|$)/i]
        : []),
    ],
    // workbox-build's production terser pass can hang / fail ("Unfinished hook action(s) on exit: (terser) renderChunk").
    mode: 'development',
    maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
  },
  devOptions: {
    enabled: false,
  },
})

export default defineConfig({
  plugins: [react(), programmeHtmlPlugin(meta), pwaPlugin],
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
