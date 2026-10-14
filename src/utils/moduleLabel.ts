import { getActiveProgramme } from '../programmes'

/** Resolve module heading via i18n key `timetable.module{n}`, with sensible fallbacks. */
export function moduleLabelKey(module: number): string {
  return `timetable.module${module}`
}

export function formatModuleLabel(
  module: number,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const key = moduleLabelKey(module)
  const labelled = t(key)
  // i18n returns the key itself when missing
  if (labelled && labelled !== key) return labelled
  const programme = getActiveProgramme()
  if (programme.id === 'mecon') {
    if (module === 0) return 'Bootcamp'
    if (module === 11) return 'Semester 1 (M1-2) — 5 Sep ~ 30 Nov 2026'
    if (module === 12) return 'Semester 2 (M4-5) — 22 Jan ~ 4 May 2027'
  }
  return t('common.module', { module })
}
