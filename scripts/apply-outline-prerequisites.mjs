/**
 * Apply scripts/data/outline-prerequisites.json onto public/{msba,mgm,mecon}
 * courses.json (+ sync course-code prerequisite enrollmentRules).
 *
 * Schema:
 *   { "MSBA7027": { "prerequisites": [{ courseCode, courseTitle? }], "prerequisiteNotes": ["..."] } }
 * Legacy array-of-courses still accepted.
 *
 * Usage: node scripts/apply-outline-prerequisites.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const DATA = path.join(__dirname, 'data/outline-prerequisites.json')
const PACKS = ['msba', 'mgm', 'mecon']

const raw = JSON.parse(fs.readFileSync(DATA, 'utf8'))

function normalizeEntry(entry) {
  if (Array.isArray(entry)) {
    return { prerequisites: entry, prerequisiteNotes: [] }
  }
  return {
    prerequisites: entry?.prerequisites || [],
    prerequisiteNotes: entry?.prerequisiteNotes || [],
  }
}

const map = Object.fromEntries(
  Object.entries(raw).map(([code, entry]) => [code, normalizeEntry(entry)]),
)

// Fill titles from CE prerequisite index when missing.
const ceIndexPath = path.join(root, 'public/common-electives/26-27/index.json')
if (fs.existsSync(ceIndexPath)) {
  const ce = JSON.parse(fs.readFileSync(ceIndexPath, 'utf8'))
  const titleByCode = new Map()
  for (const p of ce.prerequisiteIndex || []) {
    if (p.courseCode && (p.courseTitle || p.title)) {
      titleByCode.set(p.courseCode, p.courseTitle || p.title)
    }
  }
  for (const c of ce.courses || []) {
    if (c.courseCode && c.courseTitle) titleByCode.set(c.courseCode, c.courseTitle)
  }
  for (const entry of Object.values(map)) {
    for (const p of entry.prerequisites) {
      if (!p.courseTitle && titleByCode.has(p.courseCode)) {
        p.courseTitle = titleByCode.get(p.courseCode)
      }
    }
  }
}

fs.writeFileSync(
  DATA,
  `${JSON.stringify(
    Object.fromEntries(
      Object.entries(map).map(([code, entry]) => [
        code,
        {
          prerequisites: entry.prerequisites.map(p =>
            p.courseTitle
              ? { courseCode: p.courseCode, courseTitle: p.courseTitle }
              : { courseCode: p.courseCode },
          ),
          prerequisiteNotes: entry.prerequisiteNotes,
        },
      ]),
    ),
    null,
    2,
  )}\n`,
)

function upsertPrerequisiteRule(rules, courseCode, requires) {
  const reqs = [...requires]
  const existing = rules.find(
    r => r.type === 'prerequisite' && r.courseCode === courseCode,
  )
  const message = `${courseCode} requires ${reqs.join(', ')} first`
  const messageZh = `${courseCode} 需先满足先修：${reqs.join('、')}`
  if (existing) {
    existing.requires = reqs
    existing.message = message
    existing.messageZh = messageZh
    return
  }
  rules.push({
    type: 'prerequisite',
    courseCode,
    requires: reqs,
    message,
    messageZh,
  })
}

for (const packId of PACKS) {
  const coursesPath = path.join(root, 'public', packId, 'courses.json')
  const reqPath = path.join(root, 'public', packId, 'requirements.json')
  const courses = JSON.parse(fs.readFileSync(coursesPath, 'utf8'))
  const req = JSON.parse(fs.readFileSync(reqPath, 'utf8'))
  const rules = Array.isArray(req.enrollmentRules) ? [...req.enrollmentRules] : []

  const titleByCode = new Map()
  for (const c of courses) titleByCode.set(c.courseCode, c.courseTitle)

  let courseHits = 0
  for (const course of courses) {
    const entry = map[course.courseCode]
    if (!entry || (!entry.prerequisites.length && !entry.prerequisiteNotes.length)) {
      delete course.prerequisites
      delete course.prerequisiteNotes
      continue
    }
    const normalized = entry.prerequisites.map(p => ({
      courseCode: p.courseCode,
      courseTitle: titleByCode.get(p.courseCode) || p.courseTitle || undefined,
    }))
    if (normalized.length) {
      course.prerequisites = normalized.map(p =>
        p.courseTitle
          ? { courseCode: p.courseCode, courseTitle: p.courseTitle }
          : { courseCode: p.courseCode },
      )
      upsertPrerequisiteRule(
        rules,
        course.courseCode,
        normalized.map(p => p.courseCode),
      )
    } else {
      delete course.prerequisites
    }
    if (entry.prerequisiteNotes.length) {
      course.prerequisiteNotes = [...entry.prerequisiteNotes]
    } else {
      delete course.prerequisiteNotes
    }
    courseHits++
  }

  req.enrollmentRules = rules
  fs.writeFileSync(coursesPath, `${JSON.stringify(courses, null, 2)}\n`)
  fs.writeFileSync(reqPath, `${JSON.stringify(req, null, 2)}\n`)
  console.log(`[${packId}] courses with prerequisite info: ${courseHits}; enrollmentRules: ${rules.length}`)
}
