/**
 * Export pack TS teachingPlanNotices → public/{id}/teachingPlanNotices.json
 * Requires: npx tsx (dev) or `npm run db:export-notices`
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const script = `
import { writeFileSync } from 'node:fs'
import { teachingPlanNotices as msba } from './src/programmes/msba/teachingPlanUpdates.ts'
import { teachingPlanNotices as mgm } from './src/programmes/mgm/teachingPlanUpdates.ts'
import { teachingPlanNotices as mecon } from './src/programmes/mecon/teachingPlanUpdates.ts'
for (const [id, data] of [['msba', msba], ['mgm', mgm], ['mecon', mecon]] as const) {
  writeFileSync('public/' + id + '/teachingPlanNotices.json', JSON.stringify(data, null, 2) + '\\n')
  console.log(id, data.length)
}
`

const result = spawnSync(
  path.join(root, 'node_modules/.bin/tsx'),
  ['--eval', script],
  { cwd: root, stdio: 'inherit', shell: false },
)

if (result.error || result.status !== 0) {
  // Fallback: npx tsx
  const npx = spawnSync('npx', ['--yes', 'tsx', '--eval', script], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  })
  process.exit(npx.status ?? 1)
}
