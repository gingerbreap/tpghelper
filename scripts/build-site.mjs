#!/usr/bin/env node
/**
 * Production site merge: lander → msba → mgm into server/public/.
 * Each Vite build uses a dedicated outDir so artefacts do not clobber each other.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = path.join(root, 'server/public')
const bin = name => path.join(root, 'node_modules/.bin', name)

function run(label, command, args, env = {}) {
  console.log(`\n[build-site] ${label}`)
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: 'inherit',
  })
  if (result.status !== 0) {
    console.error(`[build-site] failed: ${label}`)
    process.exit(result.status ?? 1)
  }
}

function buildProgramme(id, outDir) {
  if (id !== 'lander') {
    run(`select ${id}`, process.execPath, [
      path.join(root, 'scripts/select-programme.mjs'),
      id,
    ])
  }
  run(`tsc (${id})`, bin('tsc'), ['-b'], { PROGRAMME: id })
  run(`vite (${id} → ${outDir})`, bin('vite'), ['build', '--outDir', outDir], {
    PROGRAMME: id,
  })
}

fs.rmSync(publicDir, { recursive: true, force: true })
fs.mkdirSync(publicDir, { recursive: true })

buildProgramme('lander', 'server/public')
buildProgramme('msba', 'server/public/msba')
buildProgramme('mgm', 'server/public/mgm')

// Leave shared re-exports on the default pack for local/dev consistency.
run('select msba (reset)', process.execPath, [
  path.join(root, 'scripts/select-programme.mjs'),
  'msba',
])

// Vite emptyOutDir clears the lander outDir; keep a tracked placeholder.
fs.writeFileSync(path.join(publicDir, '.gitkeep'), '')

console.log('\n[build-site] done → server/public/')
