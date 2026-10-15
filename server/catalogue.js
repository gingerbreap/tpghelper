/**
 * Build Course[] for a programme+year from Azure SQL, or fall back to public/{id}/courses.json.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { academicYearDefault, getPool, sql, sqlConfigured } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoPublic = path.join(__dirname, '..', 'public')
const builtPublic = path.join(__dirname, 'public')

const PROGRAMME_IDS = new Set(['msba', 'mgm', 'mecon'])

/** @type {Map<string, { at: number, courses: unknown[] }>} */
const cache = new Map()
const CACHE_MS = Number(process.env.CATALOGUE_CACHE_MS || 60_000)

function cacheKey(programmeId, year) {
  return `${programmeId}:${year}`
}

export function isProgrammeId(id) {
  return PROGRAMME_IDS.has(id)
}

function readFilesystemCourses(programmeId) {
  const candidates = [
    path.join(builtPublic, programmeId, 'courses.json'),
    path.join(repoPublic, programmeId, 'courses.json'),
  ]
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    return Array.isArray(data) ? data : []
  }
  return null
}

function parseJson(raw, fallback) {
  if (raw == null || raw === '') return fallback
  if (typeof raw !== 'string') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function siteRootOutline(hostProgramme, relativeOrAbsolute) {
  if (!relativeOrAbsolute) return null
  if (
    relativeOrAbsolute.startsWith('http://') ||
    relativeOrAbsolute.startsWith('https://') ||
    relativeOrAbsolute.startsWith('/')
  ) {
    return relativeOrAbsolute
  }
  const base = (process.env.COURSE_OUTLINES_BASE_URL || '').replace(/\/$/, '')
  if (base) return `${base}/${hostProgramme}/${relativeOrAbsolute}`
  return `/${hostProgramme}/${relativeOrAbsolute}`
}

async function loadFromSql(programmeId, year) {
  const pool = await getPool()
  const result = await pool
    .request()
    .input('programmeId', sql.NVarChar(16), programmeId)
    .input('year', sql.NVarChar(10), year)
    .query(`
      SELECT
        pc.CourseCode,
        c.CourseTitle,
        pc.Module,
        pc.CourseType,
        pc.CourseTypesJson,
        pc.StreamTagsJson,
        pc.OfferedToStreamsJson,
        pc.CapstoneForStreamsJson,
        pc.StreamCoreForStreamsJson,
        pc.CoreForStreamsJson,
        o.OfferingId,
        o.HostProgramme,
        o.ExamOrFinalJson AS OfferingExamJson,
        o.PartsJson,
        s.SectionRowId,
        s.SectionId,
        s.Part,
        s.InstructorsJson,
        s.TimeBucket,
        s.DayPattern,
        s.MeetingDaysJson,
        s.OutlinePdfPath,
        s.ExamOrFinalJson AS SectionExamJson,
        ol.PdfUrl AS OutlinePdfUrl,
        m.MeetingDate,
        m.StartTime,
        m.EndTime,
        m.Venue,
        m.SessionType,
        m.InstructorsJson AS MeetingInstructorsJson,
        m.TutorialForJson
      FROM dbo.ProgrammeCourse pc
      INNER JOIN dbo.Course c
        ON c.AcademicYear = pc.AcademicYear AND c.CourseCode = pc.CourseCode
      INNER JOIN dbo.Offering o
        ON o.AcademicYear = pc.AcademicYear
        AND o.CourseCode = pc.CourseCode
        AND o.Module = pc.Module
      INNER JOIN dbo.Section s ON s.OfferingId = o.OfferingId
      LEFT JOIN dbo.Outline ol ON ol.OutlineId = s.OutlineId
      LEFT JOIN dbo.Meeting m ON m.SectionRowId = s.SectionRowId
      WHERE pc.ProgrammeId = @programmeId AND pc.AcademicYear = @year
      ORDER BY pc.CourseCode, pc.Module, s.SectionId, m.MeetingDate, m.StartTime
    `)

  /** @type {Map<string, any>} */
  const courses = new Map()
  /** @type {Map<string, any>} */
  const sections = new Map()

  for (const row of result.recordset) {
    const courseKey = `${row.CourseCode}::${row.Module}`
    let course = courses.get(courseKey)
    if (!course) {
      course = {
        courseCode: row.CourseCode,
        courseTitle: row.CourseTitle,
        module: row.Module,
        courseType: row.CourseType,
        courseTypes: parseJson(row.CourseTypesJson, undefined),
        streamTags: parseJson(row.StreamTagsJson, []),
        offeredToStreams: parseJson(row.OfferedToStreamsJson, undefined),
        capstoneForStreams: parseJson(row.CapstoneForStreamsJson, undefined),
        streamCoreForStreams: parseJson(row.StreamCoreForStreamsJson, undefined),
        coreForStreams: parseJson(row.CoreForStreamsJson, undefined),
        parts: parseJson(row.PartsJson, undefined),
        outlinePdfPath: null,
        examOrFinal: parseJson(row.OfferingExamJson, null),
        sections: [],
        _host: row.HostProgramme,
      }
      courses.set(courseKey, course)
    }

    const sectionKey = `${courseKey}::${row.SectionId}`
    let section = sections.get(sectionKey)
    if (!section) {
      const outline =
        row.OutlinePdfUrl ||
        siteRootOutline(row.HostProgramme, row.OutlinePdfPath)
      section = {
        sectionId: row.SectionId,
        part: row.Part || undefined,
        instructors: parseJson(row.InstructorsJson, []),
        timeBucket: row.TimeBucket,
        dayPattern: row.DayPattern || '',
        meetingDays: parseJson(row.MeetingDaysJson, []),
        outlinePdfPath: outline,
        examOrFinal: parseJson(row.SectionExamJson, undefined),
        meetings: [],
      }
      sections.set(sectionKey, section)
      course.sections.push(section)
      if (!course.outlinePdfPath && outline) course.outlinePdfPath = outline
    }

    if (row.MeetingDate) {
      const date =
        row.MeetingDate instanceof Date
          ? row.MeetingDate.toISOString().slice(0, 10)
          : String(row.MeetingDate).slice(0, 10)
      const meeting = {
        date,
        startTime: row.StartTime,
        endTime: row.EndTime,
        venue: row.Venue || '',
        sessionType: row.SessionType,
      }
      const meetingInstructors = parseJson(row.MeetingInstructorsJson, null)
      if (meetingInstructors) meeting.instructors = meetingInstructors
      const tutorialFor = parseJson(row.TutorialForJson, null)
      if (tutorialFor) meeting.tutorialFor = tutorialFor
      section.meetings.push(meeting)
    }
  }

  return [...courses.values()].map(c => {
    const { _host, ...rest } = c
    if (rest.courseTypes == null) delete rest.courseTypes
    if (rest.offeredToStreams == null) delete rest.offeredToStreams
    if (rest.capstoneForStreams == null) delete rest.capstoneForStreams
    if (rest.streamCoreForStreams == null) delete rest.streamCoreForStreams
    if (rest.coreForStreams == null) delete rest.coreForStreams
    if (rest.parts == null) delete rest.parts
    return rest
  })
}

/**
 * @param {string} programmeId
 * @param {string} [year]
 */
export async function getProgrammeCourses(programmeId, year = academicYearDefault()) {
  if (!isProgrammeId(programmeId)) {
    const err = new Error('unknown_programme')
    err.status = 404
    throw err
  }

  const key = cacheKey(programmeId, year)
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_MS) return { courses: hit.courses, source: 'cache', year }

  if (sqlConfigured()) {
    try {
      const courses = await loadFromSql(programmeId, year)
      cache.set(key, { at: Date.now(), courses })
      return { courses, source: 'sql', year }
    } catch (err) {
      console.error('[catalogue] SQL load failed, trying filesystem', err)
    }
  }

  const courses = readFilesystemCourses(programmeId)
  if (!courses) {
    const err = new Error('courses_unavailable')
    err.status = 503
    throw err
  }
  cache.set(key, { at: Date.now(), courses })
  return { courses, source: 'filesystem', year }
}

export function clearCatalogueCache() {
  cache.clear()
}
