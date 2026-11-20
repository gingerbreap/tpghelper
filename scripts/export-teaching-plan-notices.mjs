/**
 * Export pack TS teachingPlanNotices → public/{id}/teachingPlanNotices.json
 * Requires: npx tsx (dev) or `npm run db:export-notices`
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const runner = `
import { writeFileSync } from 'node:fs'
import { teachingPlanNotices as msba } from ${JSON.stringify(path.join(root, 'src/programmes/msba/teachingPlanUpdates.ts'))}
import { teachingPlanNotices as mgm } from ${JSON.stringify(path.join(root, 'src/programmes/mgm/teachingPlanUpdates.ts'))}
import { teachingPlanNotices as mecon } from ${JSON.stringify(path.join(root, 'src/programmes/mecon/teachingPlanUpdates.ts'))}
for (const [id, data] of [['msba', msba], ['mgm', mgm], ['mecon', mecon]] as const) {
  writeFileSync(
    ${JSON.stringify(path.join(root, 'public'))} + '/' + id + '/teachingPlanNotices.json',
    JSON.stringify(data, null, 2) + '\\n',
  )
  console.log(id, data.length)
}
`

const tmp = path.join(os.tmpdir(), `tpghelper-export-notices-${process.pid}.mts`)
fs.writeFileSync(tmp, runner)

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: false, ...opts })
}

try {
  const localTsx = path.join(root, 'node_modules/.bin/tsx')
  let result = fs.existsSync(localTsx)
    ? run(localTsx, [tmp])
    : { error: new Error('no local tsx'), status: 1 }

  if (result.error || result.status !== 0) {
    result = run('npx', ['--yes', 'tsx', tmp])
  }

  process.exit(result.status ?? 1)
} finally {
  try {
    fs.unlinkSync(tmp)
  } catch {
    /* ignore */
  }
}
