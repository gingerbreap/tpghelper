function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    vars[key] !== undefined ? String(vars[key]) : `{{${key}}}`,
  )
}

export type TranslationValue = string | string[] | { [key: string]: TranslationValue }
export type TranslationTree = { [key: string]: TranslationValue }

export function resolveTranslation(
  tree: TranslationTree,
  key: string,
): TranslationValue | undefined {
  const parts = key.split('.')
  let cur: TranslationValue | undefined = tree
  for (const part of parts) {
    if (!cur || typeof cur !== 'object' || Array.isArray(cur)) return undefined
    cur = cur[part]
  }
  return cur
}

export { interpolate }
