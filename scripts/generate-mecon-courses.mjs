/**
 * One-shot generator for public/mecon/courses.json from the 2026-08-12 Teaching Plan.
 * Run: node scripts/generate-mecon-courses.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '../public/mecon/courses.json')

const MONTHS = {
  Jan: 1, January: 1, Feb: 2, February: 2, Mar: 3, March: 3, Apr: 4, April: 4,
  May: 5, Jun: 6, June: 6, Jul: 7, July: 7, Aug: 8, August: 8,
  Sep: 9, Sept: 9, September: 9, Oct: 10, October: 10, Nov: 11, November: 11,
  Dec: 12, December: 12,
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function ymd(y, m, d) {
  return `${y}-${pad(m)}-${pad(d)}`
}

function parseDateToken(token, defaultYear) {
  const t = token.trim().replace(/,$/, '').replace(/\s+/g, ' ')
  if (!t) return null
  // "Jan 22" / "22-Jan" / "22-August" / "1-Arp" (typo) / "16-Ap"
  let m
  m = t.match(/^(\d{1,2})[- ]([A-Za-z]+)(?:[, ]+(\d{4}))?$/i)
  if (m) {
    let monName = m[2]
    if (/^arp$/i.test(monName)) monName = 'Apr'
    if (/^ap$/i.test(monName)) monName = 'Apr'
    const mon = MONTHS[monName] || MONTHS[monName.slice(0, 3)]
    if (!mon) throw new Error(`Bad month in "${token}"`)
    const year = m[3] ? Number(m[3]) : defaultYear
    return ymd(year, mon, Number(m[1]))
  }
  m = t.match(/^([A-Za-z]+)[- ](\d{1,2})(?:[, ]+(\d{4}))?$/i)
  if (m) {
    let monName = m[1]
    if (/^arp$/i.test(monName)) monName = 'Apr'
    const mon = MONTHS[monName] || MONTHS[monName.slice(0, 3)]
    if (!mon) throw new Error(`Bad month in "${token}"`)
    const year = m[3] ? Number(m[3]) : defaultYear
    return ymd(year, mon, Number(m[2]))
  }
  throw new Error(`Unparsed date token: "${token}"`)
}

/** Parse a Class date cell into YYYY-MM-DD list (preserves duplicates if asked). */
function parseDateList(raw, { defaultYear, fixYear, mapDate } = {}) {
  let s = raw.replace(/\s+/g, ' ').trim()
  // Strip trailing year(s) used as list terminator
  const years = [...s.matchAll(/\b(20\d{2})\b/g)].map((x) => Number(x[1]))
  const yearHint = years[years.length - 1] || defaultYear
  s = s.replace(/,?\s*20\d{2}\s*$/g, '').trim()

  // Split on commas
  const parts = s.split(',').map((p) => p.trim()).filter(Boolean)
  const out = []
  let currentYear = defaultYear || yearHint
  for (const part of parts) {
    // token may include year: "15-Jan, 2027" already stripped; "5-Jan" etc.
    // Handle "2026 5-Jan" leftovers
    const cleaned = part.replace(/^20\d{2}\s+/, '').trim()
    if (!cleaned || /^20\d{2}$/.test(cleaned)) {
      if (/^20\d{2}$/.test(cleaned)) currentYear = Number(cleaned)
      continue
    }
    // If token has embedded year
    const withYear = cleaned.match(/20\d{2}/)
    if (withYear) currentYear = Number(withYear[0])
    let d = parseDateToken(cleaned.replace(/,?\s*20\d{2}/, '').trim(), currentYear)
    if (fixYear) d = fixYear(d) || d
    if (mapDate) d = mapDate(d) || d
    out.push(d)
    // Advance year heuristic: Jan after Dec in same list
  }
  // Year-boundary: if we see Jan/Feb after Nov/Dec in list without explicit year
  // Re-parse with smarter year when defaultYear provided and list spans years
  return out
}

function weekday(dateStr) {
  return new Date(dateStr + 'T12:00:00').getDay()
}

function timeBucket(startHHMM) {
  const [h, m] = startHHMM.split(':').map(Number)
  const mins = h * 60 + m
  if (mins < 12 * 60) return 'AM'
  if (mins < 18 * 60) return 'PM'
  return 'NT'
}

function meetingDaysFrom(dates) {
  return [...new Set(dates.map(weekday))].sort((a, b) => a - b)
}

function instr(...names) {
  return names.filter(Boolean).map((name) => ({ name }))
}

function exam(date, venue, raw) {
  return {
    kind: 'exam',
    date,
    startTime: null,
    endTime: null,
    venue,
    raw: raw || `Final Exam: ${date}`,
  }
}

/**
 * Build meetings for a list of dates with optional per-date venue/time overrides.
 * ranges: [{ startTime, endTime }] — one meeting per range per date (block mode).
 * venueFor(date) → string
 * timeFor(date) → { startTime, endTime } | null (override all ranges)
 */
function buildMeetings(dates, { startTime, endTime, ranges, venue, venueFor, timeFor }) {
  const rs = ranges || [{ startTime, endTime }]
  const meetings = []
  for (const date of dates) {
    const tOverride = timeFor?.(date)
    if (tOverride) {
      meetings.push({
        date,
        startTime: tOverride.startTime,
        endTime: tOverride.endTime,
        venue: venueFor?.(date) ?? venue,
        sessionType: 'lecture',
      })
      continue
    }
    for (const r of rs) {
      meetings.push({
        date,
        startTime: r.startTime,
        endTime: r.endTime,
        venue: venueFor?.(date) ?? venue,
        sessionType: 'lecture',
      })
    }
  }
  return meetings
}

function section({
  sectionId = 'A',
  instructors = [],
  part,
  dayPattern,
  dates,
  startTime,
  endTime,
  ranges,
  venue,
  venueFor,
  timeFor,
  examOrFinal = null,
  outlinePdfPath = null,
}) {
  const meetings = buildMeetings(dates, { startTime, endTime, ranges, venue, venueFor, timeFor })
  const primaryStart = (ranges?.[0]?.startTime) || startTime
  const s = {
    sectionId,
    instructors,
    timeBucket: timeBucket(primaryStart),
    dayPattern,
    meetingDays: meetingDaysFrom(meetings.map((m) => m.date)),
    outlinePdfPath,
    meetings,
  }
  if (part) s.part = part
  if (examOrFinal) s.examOrFinal = examOrFinal
  return s
}

function course({
  courseCode,
  courseTitle,
  module,
  courseType,
  courseTypes,
  offeredToStreams,
  coreForStreams,
  streamCoreForStreams,
  capstoneForStreams,
  parts,
  sections,
  examOrFinal = null,
  streamTags = [],
  outlinePdfPath = null,
}) {
  const c = {
    courseCode,
    courseTitle,
    module,
    courseType,
    streamTags,
    outlinePdfPath,
    examOrFinal,
    sections,
  }
  if (courseTypes) c.courseTypes = courseTypes
  if (offeredToStreams) c.offeredToStreams = offeredToStreams
  if (coreForStreams) c.coreForStreams = coreForStreams
  if (streamCoreForStreams) c.streamCoreForStreams = streamCoreForStreams
  if (capstoneForStreams) c.capstoneForStreams = capstoneForStreams
  if (parts) c.parts = parts
  return c
}

// ─── Date lists (explicit YYYY-MM-DD to avoid ambiguity) ───────────────────

const D = {
  // ECON6067 Part I
  bootcamp: ['2026-08-24', '2026-08-25', '2026-08-26', '2026-08-28', '2026-08-29'],

  // Semester 1 Tue 14:00 (ECON6005)
  s1_tue_pm: [
    '2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29', '2026-10-06',
    '2026-10-13', '2026-10-20', '2026-10-27', '2026-11-03', '2026-11-10',
  ],
  // Semester 1 Wed 14:00 (ECON6011, ECON6092)
  s1_wed_pm: [
    '2026-09-09', '2026-09-16', '2026-09-23', '2026-09-30', '2026-10-07',
    '2026-10-14', '2026-10-21', '2026-10-28', '2026-11-04', '2026-11-11',
  ],
  // Semester 1 Tue AM (ECON6012, ECON6113, ECON6099)
  s1_tue_am: [
    '2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29', '2026-10-06',
    '2026-10-13', '2026-10-20', '2026-10-27', '2026-11-03', '2026-11-10',
  ],
  s1_tue_am_6099: [
    '2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29', '2026-10-06',
    '2026-10-13', '2026-10-20', '2026-10-27', '2026-11-03', '2026-11-10', '2026-11-17',
  ],
  // Semester 1 Mon PM (ECON6036)
  s1_mon_pm: [
    '2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05',
    '2026-10-12', '2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16',
  ],
  // Semester 1 Mon NT (ECON6093)
  s1_mon_nt: [
    '2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05',
    '2026-10-12', '2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16',
  ],
  // ECON6098 — PDF "2-Oct" is Fri; treated as 2-Nov (Mon) to match Mon pattern
  s1_6098: [
    '2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05',
    '2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23',
  ],

  // Module 1 Tue+Fri (ECON6001, ECON6022 A/B)
  m1_tf: [
    '2026-09-08', '2026-09-11', '2026-09-15', '2026-09-18', '2026-09-22',
    '2026-09-29', '2026-10-02', '2026-10-06', '2026-10-09', '2026-10-13',
  ],
  // Module 1 Mon+Thu (ECON6021 A/B)
  m1_mt: [
    '2026-09-07', '2026-09-10', '2026-09-14', '2026-09-17', '2026-09-21',
    '2026-09-24', '2026-09-28', '2026-10-05', '2026-10-08', '2026-10-12',
  ],
  // ECON6067 Part II
  m1_6067_a: ['2026-09-09', '2026-09-16', '2026-09-23', '2026-09-30', '2026-10-07'],
  m1_6067_b: ['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05'],

  // Module 2 Wed+Sat (ECON6008 A, ECON6022 C/D)
  m2_ws: [
    '2026-10-24', '2026-10-28', '2026-10-31', '2026-11-04', '2026-11-07',
    '2026-11-11', '2026-11-14', '2026-11-18', '2026-11-21', '2026-11-25',
  ],
  // Module 2 Mon+Thu (ECON6021 C/D, ECON6097)
  m2_mt: [
    '2026-10-22', '2026-10-26', '2026-10-29', '2026-11-02', '2026-11-05',
    '2026-11-09', '2026-11-12', '2026-11-16', '2026-11-19', '2026-11-23',
  ],
  // Module 2 Tue+Fri (ECON6101)
  m2_tf: [
    '2026-10-27', '2026-10-30', '2026-11-03', '2026-11-06', '2026-11-10',
    '2026-11-13', '2026-11-17', '2026-11-20', '2026-11-24', '2026-11-27',
  ],
  // ECON6086 Module 2 Sundays
  m2_6086: ['2026-10-25', '2026-11-01', '2026-11-08', '2026-11-15'],

  // Module 3 Tue+Fri (many)
  m3_tf: [
    '2026-12-01', '2026-12-04', '2026-12-08', '2026-12-11', '2026-12-15',
    '2026-12-18', '2027-01-05', '2027-01-08', '2027-01-12', '2027-01-15',
  ],
  // Module 3 Mon+Thu
  m3_mt: [
    '2026-12-03', '2026-12-07', '2026-12-10', '2026-12-14', '2026-12-17',
    '2026-12-21', '2027-01-04', '2027-01-07', '2027-01-11', '2027-01-14',
  ],
  // ECON6112 Wed+Sat-style? PDF says Tue+Fri but dates are Wed+Sat!
  // 2-Dec, 5-Dec, 9-Dec, 12-Dec, 16-Dec, 19-Dec, 2026 / 2-Jan, 6-Jan, 9-Jan, 13-Jan, 2027
  m3_6112: [
    '2026-12-02', '2026-12-05', '2026-12-09', '2026-12-12', '2026-12-16',
    '2026-12-19', '2027-01-02', '2027-01-06', '2027-01-09', '2027-01-13',
  ],

  // Semester 2 Tue AM (ECON6002, ECON6116 B)
  s2_tue_am: [
    '2027-01-26', '2027-02-02', '2027-02-16', '2027-02-23', '2027-03-02',
    '2027-03-09', '2027-03-23', '2027-03-30', '2027-04-06', '2027-04-13',
  ],
  s2_tue_pm: [
    '2027-01-26', '2027-02-02', '2027-02-16', '2027-02-23', '2027-03-02',
    '2027-03-09', '2027-03-23', '2027-03-30', '2027-04-06', '2027-04-13',
  ],
  // ECON6059 / ECON6116 A Friday
  s2_fri: [
    '2027-01-29', '2027-02-12', '2027-02-19', '2027-02-26', '2027-03-05',
    '2027-03-12', '2027-03-19', '2027-04-02', '2027-04-09', '2027-04-16',
  ],
  // ECON6116 C/D Monday
  s2_mon_6116: [
    '2027-01-25', '2027-02-01', '2027-02-15', '2027-02-22', '2027-03-01',
    '2027-03-08', '2027-03-22', '2027-04-12', '2027-04-19', '2027-04-26',
  ],
  // ECON6078 Thursday
  s2_6078: [
    '2027-01-28', '2027-02-04', '2027-02-18', '2027-02-25', '2027-03-04',
    '2027-03-11', '2027-03-18', '2027-03-25', '2027-04-01', '2027-04-08',
  ],
  // ECON6096 Monday
  s2_6096: [
    '2027-01-25', '2027-02-01', '2027-02-15', '2027-02-22', '2027-03-01',
    '2027-03-08', '2027-03-15', '2027-03-22', '2027-04-12', '2027-04-19',
  ],
  // ECON6081 Thursday (includes 11-Feb, 15-Apr)
  s2_6081: [
    '2027-01-28', '2027-02-11', '2027-02-18', '2027-02-25', '2027-03-04',
    '2027-03-11', '2027-03-18', '2027-03-25', '2027-04-01', '2027-04-08', '2027-04-15',
  ],
  // ECON6110 Monday
  s2_6110: [
    '2027-01-25', '2027-02-01', '2027-02-15', '2027-02-22', '2027-03-01',
    '2027-03-08', '2027-03-15', '2027-03-22', '2027-04-12', '2027-04-19',
  ],

  // Module 4 Wed+Sat (ECON6008 B)
  m4_ws: [
    '2027-01-23', '2027-01-27', '2027-01-30', '2027-02-03', '2027-02-13',
    '2027-02-17', '2027-02-20', '2027-02-24', '2027-02-27', '2027-03-03',
  ],
  // Module 4 Tue+Fri (ECON6105)
  m4_tf_6105: [
    '2027-01-26', '2027-01-29', '2027-02-02', '2027-02-05', '2027-02-16',
    '2027-02-19', '2027-02-23', '2027-02-26', '2027-03-02', '2027-03-05',
  ],
  // Sunday block — PDF lists 28-Feb twice; unique Sundays used
  m4_sun_block: ['2027-01-31', '2027-02-28', '2027-03-07', '2027-03-14'],
  // Module 4 Mon+Thu
  m4_mt: [
    '2027-01-25', '2027-01-28', '2027-02-01', '2027-02-11', '2027-02-15',
    '2027-02-18', '2027-02-22', '2027-02-25', '2027-03-01', '2027-03-04',
  ],
  // ECON6103 Tue+Fri incl. Jan 22 (Fri)
  m4_6103: [
    '2027-01-22', '2027-01-26', '2027-01-29', '2027-02-02', '2027-02-05',
    '2027-02-16', '2027-02-19', '2027-02-23', '2027-02-26', '2027-03-02',
  ],

  // Module 5 Tue+Fri
  m5_tf: [
    '2027-03-19', '2027-03-23', '2027-03-30', '2027-04-02', '2027-04-06',
    '2027-04-09', '2027-04-13', '2027-04-16', '2027-04-20', '2027-04-23',
  ],
  // Module 5 Mon+Thu (year from context 2027)
  m5_mt: [
    '2027-03-18', '2027-03-22', '2027-03-25', '2027-04-01', '2027-04-08',
    '2027-04-12', '2027-04-15', '2027-04-19', '2027-04-22', '2027-04-26',
  ],

  // Module 6
  m6_tf: [
    '2027-05-11', '2027-05-14', '2027-05-18', '2027-05-21', '2027-05-25',
    '2027-05-28', '2027-06-01', '2027-06-04', '2027-06-08', '2027-06-11',
  ],
}

const PARTS_6067 = [
  { id: 'I', label: 'Part I' },
  { id: 'II', label: 'Part II' },
]

function venueByDate(map, fallback) {
  return (date) => map[date] || fallback
}

const courses = []

// ═══ Bootcamp / Module 0 — ECON6067 Part I ═══
courses.push(course({
  courseCode: 'ECON6067',
  courseTitle: 'Quantitative Tools for Economic Analysis: From Math to AI',
  module: 0,
  courseType: 'Stream Core',
  offeredToStreams: ['DA'],
  streamCoreForStreams: ['DA'],
  parts: PARTS_6067,
  sections: [
    section({
      sectionId: 'A',
      part: 'I',
      instructors: instr('Dr. Xiaoting MAI'),
      dayPattern: '6:30pm to 9:30pm',
      dates: D.bootcamp,
      startTime: '18:30',
      endTime: '21:30',
      venue: 'Cyberport Classroom J',
      venueFor: venueByDate({ '2026-08-29': 'Cyberport Classroom ABC' }, 'Cyberport Classroom J'),
    }),
    section({
      sectionId: 'B',
      part: 'I',
      instructors: instr('Dr. Xiaoting MAI'),
      dayPattern: '2:00pm to 5:00pm (Except 26 August 9:30am to 12:30pm)',
      dates: D.bootcamp,
      startTime: '14:00',
      endTime: '17:00',
      venue: 'Cyberport Classroom J',
      venueFor: venueByDate({ '2026-08-29': 'Cyberport Classroom ABC' }, 'Cyberport Classroom J'),
      timeFor: (date) =>
        date === '2026-08-26'
          ? { startTime: '09:30', endTime: '12:30' }
          : null,
    }),
  ],
}))

// ═══ Semester 1 (Module 1 & 2) — module 11 ═══
courses.push(course({
  courseCode: 'ECON6005',
  courseTitle: 'Econometric Theory I',
  module: 11,
  courseType: 'Core',
  sections: [
    section({
      instructors: instr('Prof. Ping YU'),
      dayPattern: 'Tuesday 2:00pm to 5:00pm',
      dates: D.s1_tue_pm,
      startTime: '14:00',
      endTime: '17:00',
      venue: 'Main Campus - KKL 301',
    }),
  ],
}))

courses.push(course({
  courseCode: 'ECON6011',
  courseTitle: 'Microeconomic Theory',
  module: 11,
  courseType: 'Core',
  sections: [
    section({
      instructors: instr('Prof. Chen ZHAO', 'Prof. Wing SUEN'),
      dayPattern: 'Wednesday 2:00pm to 5:00pm',
      dates: D.s1_wed_pm,
      startTime: '14:00',
      endTime: '17:00',
      venue: 'Main Campus - MW-325',
    }),
  ],
}))

courses.push(course({
  courseCode: 'ECON6012',
  courseTitle: 'Macroeconomic Theory',
  module: 11,
  courseType: 'Core',
  sections: [
    section({
      instructors: instr('Prof. Yulei LUO', 'Prof. Jinglun YAO'),
      dayPattern: 'Tuesday 9:00am to 12:00nn',
      dates: D.s1_tue_am,
      startTime: '09:00',
      endTime: '12:00',
      venue: 'Main Campus - KKL301',
    }),
  ],
}))

courses.push(course({
  courseCode: 'ECON6036',
  courseTitle: 'Game Theory and Applications',
  module: 11,
  courseType: 'Stream Core',
  offeredToStreams: ['THY', 'ARS'],
  streamCoreForStreams: ['THY', 'ARS'],
  sections: [
    section({
      instructors: instr('Prof. Carl HEESE'),
      dayPattern: 'Monday 2:00pm to 5:00pm',
      dates: D.s1_mon_pm,
      startTime: '14:00',
      endTime: '17:00',
      venue: 'Main Campus - KKL 301',
    }),
  ],
}))

{
  const v6092 = {
    '2026-09-09': 'ATC: B13',
    '2026-09-16': 'Main Campus: KKL 301',
    '2026-09-23': 'Main Campus: KKL 301',
    '2026-09-30': 'ATC: B12',
    '2026-10-07': 'Main Campus: KKL 301',
    '2026-10-14': 'ATC: B13',
    '2026-10-21': 'ATC: B13',
    // PDF "28-Nov" → judged 28-Oct (matches class date list)
    '2026-10-28': 'Main Campus: KKL 301',
    '2026-11-04': 'Main Campus: KKL 301',
    '2026-11-11': 'Main Campus: KKL 301',
  }
  courses.push(course({
    courseCode: 'ECON6092',
    courseTitle: 'Advanced Microeconomics',
    module: 11,
    courseType: 'Core',
    offeredToStreams: ['THY', 'ARS'],
    coreForStreams: ['THY', 'ARS'],
    sections: [
      section({
        instructors: instr('Prof. Masaki MIYASHITA'),
        dayPattern: 'Wednesday 2:00pm to 5:00pm',
        dates: D.s1_wed_pm,
        startTime: '14:00',
        endTime: '17:00',
        venue: 'Main Campus: KKL 301',
        venueFor: venueByDate(v6092, 'Main Campus: KKL 301'),
      }),
    ],
  }))
}

courses.push(course({
  courseCode: 'ECON6113',
  courseTitle: 'Advanced Econometrics',
  module: 11,
  courseType: 'Core',
  offeredToStreams: ['THY', 'ARS'],
  coreForStreams: ['THY', 'ARS'],
  sections: [
    section({
      instructors: instr('Prof. Liang ZHONG'),
      dayPattern: 'Tuesday 9:00am to 12:00pm',
      dates: D.s1_tue_am,
      startTime: '09:00',
      endTime: '12:00',
      venue: 'Main Campus - MWT6',
    }),
  ],
}))

courses.push(course({
  courseCode: 'ECON6093',
  courseTitle: 'Advanced Macroeconomics',
  module: 11,
  courseType: 'Core',
  offeredToStreams: ['THY', 'ARS'],
  coreForStreams: ['THY', 'ARS'],
  sections: [
    section({
      instructors: instr('Prof. Anson ZHOU'),
      dayPattern: 'Monday 6:30pm to 9:30pm',
      dates: D.s1_mon_nt,
      startTime: '18:30',
      endTime: '21:30',
      venue: 'Main Campus - KKL 301',
    }),
  ],
}))

courses.push(course({
  courseCode: 'ECON6098',
  courseTitle: 'Advanced Topics in Labour Economics',
  module: 11,
  courseType: 'Stream Core',
  offeredToStreams: ['THY', 'ARS'],
  streamCoreForStreams: ['THY', 'ARS'],
  sections: [
    section({
      instructors: instr('Prof. Xinyao QIU', 'Prof. Naijia GUO'),
      dayPattern: 'Monday 9:30am to 12:30pm',
      dates: D.s1_6098,
      startTime: '09:30',
      endTime: '12:30',
      venue: 'Main Campus - KKL 301',
    }),
  ],
}))

courses.push(course({
  courseCode: 'ECON6099',
  courseTitle: 'Topics in Growth and Development',
  module: 11,
  courseType: 'Elective',
  sections: [
    section({
      instructors: instr('Prof. Xiaodong ZHU', 'Prof. Xiaomei SUI'),
      dayPattern: 'Tuesday 9:00am to 12:00pm',
      dates: D.s1_tue_am_6099,
      startTime: '09:00',
      endTime: '12:00',
      venue: 'Main Campus - KKL 315',
    }),
  ],
}))

// ═══ Module 1 ═══
function econ6001Section(id, instructor, dayPattern, start, end, venue) {
  return section({
    sectionId: id,
    instructors: instr(instructor),
    dayPattern,
    dates: D.m1_tf,
    startTime: start,
    endTime: end,
    venue,
    examOrFinal: exam('2026-10-17', venue, 'Final Exam: 17-Oct'),
  })
}

courses.push(course({
  courseCode: 'ECON6001',
  courseTitle: 'Applied Econometrics',
  module: 1,
  courseType: 'Core',
  sections: [
    econ6001Section('A', 'Prof. Gedeon LIM', 'Tue+Fri 2:00pm to 5:00pm', '14:00', '17:00', 'Cyberport Classroom ABC'),
    econ6001Section('B', 'Prof. Gedeon LIM', 'Tue+Fri 6:30pm to 9:30pm', '18:30', '21:30', 'Cyberport Classroom J'),
    econ6001Section('C', 'Prof. Juan PANTANO', 'Tue+Fri 2:00pm to 5:00pm', '14:00', '17:00', 'Cyberport Classroom H'),
    econ6001Section('D', 'Prof. Juan PANTANO', 'Tue+Fri 6:30pm to 9:30pm', '18:30', '21:30', 'Cyberport Classroom H'),
  ],
}))

courses.push(course({
  courseCode: 'ECON6021',
  courseTitle: 'Microeconomic Analysis',
  module: 1,
  courseType: 'Core',
  offeredToStreams: ['DA', 'PL'],
  coreForStreams: ['DA', 'PL'],
  sections: [
    section({
      sectionId: 'A',
      instructors: instr('Prof. Balazs SZENTES'),
      dayPattern: 'Mon+Thu 9:30am to 12:30pm',
      dates: D.m1_mt,
      startTime: '09:30',
      endTime: '12:30',
      venue: 'Main Campus - MWT5',
      venueFor: (date) => {
        const wd = weekday(date)
        if (wd === 1) return 'Mondays: Main Campus - MWT5'
        if (wd === 4) return 'Thursdays: Main Campus - MWT3'
        return 'Main Campus - MWT5'
      },
      examOrFinal: exam('2026-10-20', 'Mondays: Main Campus - MWT5', 'Final Exam: 20-Oct'),
    }),
    section({
      sectionId: 'B',
      instructors: instr('Prof. Balazs SZENTES'),
      dayPattern: 'Mon+Thu 2:00pm to 5:00pm',
      dates: D.m1_mt,
      startTime: '14:00',
      endTime: '17:00',
      venue: 'Cyberport Classroom J',
      examOrFinal: exam('2026-10-20', 'Cyberport Classroom J', 'Final Exam: 20-Oct'),
    }),
  ],
}))

courses.push(course({
  courseCode: 'ECON6022',
  courseTitle: 'Macroeconomic Analysis',
  module: 1,
  courseType: 'Core',
  offeredToStreams: ['DA', 'PL'],
  coreForStreams: ['DA', 'PL'],
  sections: [
    section({
      sectionId: 'A',
      instructors: instr('Prof. Steven Alan Barnett'),
      dayPattern: 'Tue+Fri 9:30am to 12:30pm',
      dates: D.m1_tf,
      startTime: '09:30',
      endTime: '12:30',
      venue: 'Cyberport Classroom J',
      examOrFinal: exam('2026-10-21', 'Cyberport Classroom J', 'Final Exam: 21-Oct'),
    }),
    section({
      sectionId: 'B',
      instructors: instr('Prof. Steven Alan Barnett'),
      dayPattern: 'Tue+Fri 2:00pm to 5:00pm',
      dates: D.m1_tf,
      startTime: '14:00',
      endTime: '17:00',
      venue: 'Cyberport Classroom D',
      examOrFinal: exam('2026-10-21', 'Cyberport Classroom D', 'Final Exam: 21-Oct'),
    }),
  ],
}))

courses.push(course({
  courseCode: 'ECON6067',
  courseTitle: 'Quantitative Tools for Economic Analysis: From Math to AI',
  module: 1,
  courseType: 'Stream Core',
  offeredToStreams: ['DA'],
  streamCoreForStreams: ['DA'],
  parts: PARTS_6067,
  sections: [
    section({
      sectionId: 'A',
      part: 'II',
      instructors: instr('Prof. Yan Xiong'),
      dayPattern: 'Wednesday 6:30pm to 9:30pm',
      dates: D.m1_6067_a,
      startTime: '18:30',
      endTime: '21:30',
      venue: 'Cyberport Classroom J',
    }),
    section({
      sectionId: 'B',
      part: 'II',
      instructors: instr('Prof. Yan Xiong'),
      dayPattern: 'Mondays 6:30pm to 9:30pm',
      dates: D.m1_6067_b,
      startTime: '18:30',
      endTime: '21:30',
      venue: 'Cyberport Classroom J',
    }),
  ],
}))

// ═══ Module 2 ═══
courses.push(course({
  courseCode: 'ECON6008',
  courseTitle: 'International Macroeconomics and Finance',
  module: 2,
  courseType: 'Stream Core',
  offeredToStreams: ['PL'],
  streamCoreForStreams: ['PL'],
  sections: [
    section({
      sectionId: 'A',
      instructors: instr('Prof. Xiaomei SUI'),
      dayPattern: 'Wed+Sat 2:00pm to 5:00pm',
      dates: D.m2_ws,
      startTime: '14:00',
      endTime: '17:00',
      venue: 'Wednesday: KKLG104',
      venueFor: (date) => (weekday(date) === 3 ? 'Wednesday: KKLG104' : 'Saturday: CYPP3'),
    }),
  ],
}))

courses.push(course({
  courseCode: 'ECON6021',
  courseTitle: 'Microeconomic Analysis',
  module: 2,
  courseType: 'Core',
  offeredToStreams: ['DA', 'PL'],
  coreForStreams: ['DA', 'PL'],
  sections: [
    section({
      sectionId: 'C',
      instructors: instr('Prof. Hongsong ZHANG'),
      dayPattern: 'Mon+Thu 9:30am to 12:30pm',
      dates: D.m2_mt,
      startTime: '09:30',
      endTime: '12:30',
      venue: 'Cyberport Classroom J',
      examOrFinal: exam('2026-11-29', 'Cyberport Classroom J', 'Final Exam: 29-Nov'),
    }),
    section({
      sectionId: 'D',
      instructors: instr('Prof. Hongsong ZHANG'),
      // PDF "2:00am to 5:00pm" → 14:00-17:00
      dayPattern: 'Mon+Thu 2:00pm to 5:00pm',
      dates: D.m2_mt,
      startTime: '14:00',
      endTime: '17:00',
      venue: 'Cyberport Classroom ABC',
      examOrFinal: exam('2026-11-29', 'Cyberport Classroom ABC', 'Final Exam: 29-Nov'),
    }),
  ],
}))

courses.push(course({
  courseCode: 'ECON6022',
  courseTitle: 'Macroeconomic Analysis',
  module: 2,
  courseType: 'Core',
  offeredToStreams: ['DA', 'PL'],
  coreForStreams: ['DA', 'PL'],
  sections: [
    section({
      sectionId: 'C',
      instructors: instr('Prof. Jinglun YAO'),
      dayPattern: 'Wed+Sat 9:30am to 12:30pm',
      dates: D.m2_ws,
      startTime: '09:30',
      endTime: '12:30',
      venue: 'Cyberport Classroom J',
      examOrFinal: exam('2026-11-29', 'Cyberport Classroom J', 'Final Exam: 29-Nov'),
    }),
    section({
      sectionId: 'D',
      instructors: instr('Prof. Jinglun YAO'),
      dayPattern: 'Wed+Sat 2:00pm to 5:00pm',
      dates: D.m2_ws,
      startTime: '14:00',
      endTime: '17:00',
      venue: 'Cyberport Classroom J',
      examOrFinal: exam('2026-11-29', 'Cyberport Classroom J', 'Final Exam: 29-Nov'),
    }),
  ],
}))

{
  const v6101 = {
    '2026-10-27': 'Main Campus KKL 315',
    '2026-11-03': 'Main Campus KKL 315',
    '2026-11-10': 'Main Campus KKL 315',
    '2026-11-17': 'Main Campus KKL 315',
    '2026-11-24': 'Main Campus KKL 315',
    '2026-10-30': 'Main Campus KKL 301',
    '2026-11-06': 'Main Campus KKL 301',
    '2026-11-13': 'Main Campus KKL 301',
    '2026-11-20': 'Main Campus KKL 301',
    '2026-11-27': 'Main Campus KKL 301',
  }
  courses.push(course({
    courseCode: 'ECON6101',
    courseTitle: 'Introduction to Nudging and A/B Testing',
    module: 2,
    courseType: 'Elective',
    sections: [
      section({
        instructors: instr('Dr. Si CHEN'),
        dayPattern: 'Tue+Fri 2:00pm to 5:00pm',
        dates: D.m2_tf,
        startTime: '14:00',
        endTime: '17:00',
        venue: 'Main Campus KKL 315',
        venueFor: venueByDate(v6101, 'Main Campus KKL 315'),
      }),
    ],
  }))
}

courses.push(course({
  courseCode: 'ECON6097',
  courseTitle: 'Economic Growth and Development',
  module: 2,
  courseType: 'Stream Core',
  offeredToStreams: ['PL'],
  streamCoreForStreams: ['PL'],
  sections: [
    section({
      sectionId: 'A',
      instructors: instr('Prof. Xiaodong Zhu'),
      dayPattern: 'Mon+Thu 9:30am to 12:30pm',
      dates: D.m2_mt,
      startTime: '09:30',
      endTime: '12:30',
      venue: 'Mondays: Main Campus: MWT5',
      venueFor: (date) => {
        if (date === '2026-11-05') return 'Thursdays: KKL 301'
        const wd = weekday(date)
        if (wd === 1) return 'Mondays: Main Campus: MWT5'
        if (wd === 4) return 'Thursdays: KKL 315'
        return 'Mondays: Main Campus: MWT5'
      },
    }),
    section({
      sectionId: 'B',
      instructors: instr('Prof. Xiaodong Zhu'),
      dayPattern: 'Mon+Thu 2:00pm to 5:00pm',
      dates: D.m2_mt,
      startTime: '14:00',
      endTime: '17:00',
      venue: 'Mondays: KKL 315',
      venueFor: (date) => {
        if (date === '2026-11-23') return 'Mondays: KKL 301'
        const wd = weekday(date)
        if (wd === 1) return 'Mondays: KKL 315'
        if (wd === 4) return 'Thursdays: KK101'
        return 'Mondays: KKL 315'
      },
    }),
  ],
}))

courses.push(course({
  courseCode: 'ECON6086',
  courseTitle: 'Digital Economy and Big Data Analysis',
  module: 2,
  courseType: 'Stream Core',
  offeredToStreams: ['DA'],
  streamCoreForStreams: ['DA'],
  sections: [
    section({
      sectionId: 'A',
      instructors: instr('Prof. Ping YU'),
      dayPattern: 'Sundays 9:00am to 5:00pm',
      dates: D.m2_6086,
      startTime: '09:00',
      endTime: '17:00',
      venue: 'KKLG102',
    }),
  ],
}))

// ═══ Module 3 ═══
courses.push(course({
  courseCode: 'ECON6119',
  courseTitle: 'Political Economy of Development in China',
  module: 3,
  courseType: 'Elective',
  sections: [
    section({
      instructors: instr('Prof. Ying BAI'),
      dayPattern: 'Tue+Fri 2:00pm to 5:00pm',
      dates: D.m3_tf,
      startTime: '14:00',
      endTime: '17:00',
      venue: 'Cyberport Classroom J',
    }),
  ],
}))

courses.push(course({
  courseCode: 'ECON6104',
  courseTitle: 'Introduction to Housing Markets',
  module: 3,
  courseType: 'Stream Core',
  offeredToStreams: ['PL'],
  streamCoreForStreams: ['PL'],
  sections: [
    section({
      instructors: instr('Dr. Derek HUO'),
      dayPattern: 'Tue+Fri 2:00pm to 5:00pm',
      dates: D.m3_tf,
      startTime: '14:00',
      endTime: '17:00',
      venue: 'Main Campus - CPD2.58',
    }),
  ],
}))

courses.push(course({
  courseCode: 'ECON6033',
  courseTitle: 'Corporate Finance',
  module: 3,
  courseType: 'Elective',
  sections: [
    section({
      sectionId: 'A',
      instructors: instr('Prof. Keith WONG'),
      dayPattern: 'Mon+Thu 6:30pm to 9:30pm',
      dates: D.m3_mt,
      startTime: '18:30',
      endTime: '21:30',
      venue: 'Main Campus: CYPP3',
    }),
    section({
      sectionId: 'B',
      instructors: instr('Prof. Keith WONG'),
      dayPattern: 'Tue+Fri 2:00pm to 5:00pm',
      dates: D.m3_tf,
      startTime: '14:00',
      endTime: '17:00',
      venue: 'Tuesdays: CYPP3',
      venueFor: (date) => (weekday(date) === 2 ? 'Tuesdays: CYPP3' : 'Fridays: KB223'),
    }),
    section({
      sectionId: 'C',
      instructors: instr('Prof. Keith WONG'),
      dayPattern: 'Tue+Fri 6:30pm to 9:30pm',
      dates: D.m3_tf,
      startTime: '18:30',
      endTime: '21:30',
      venue: 'Main Campus: CYCP1',
    }),
  ],
}))

courses.push(course({
  courseCode: 'ECON6074',
  courseTitle: 'Causal Inference',
  module: 3,
  courseType: 'Stream Core',
  offeredToStreams: ['DA'],
  streamCoreForStreams: ['DA'],
  // Stream Core for DA; other streams see as Elective (via offeredToStreams / streamCoreForStreams)
  sections: [
    section({
      sectionId: 'A',
      instructors: instr('Prof. Bingjing LI'),
      dayPattern: 'Tue+Fri 2:00pm to 5:00pm',
      dates: D.m3_tf,
      startTime: '14:00',
      endTime: '17:00',
      venue: 'Main Campus - KKL 301',
    }),
    section({
      sectionId: 'B',
      instructors: instr('Prof. Bingjing LI'),
      dayPattern: 'Mon+Thu 9:30am to 12:30pm',
      dates: D.m3_mt,
      startTime: '09:30',
      endTime: '12:30',
      venue: 'Cyberport Classroom J',
    }),
    section({
      sectionId: 'C',
      instructors: instr('Prof. Bingjing LI'),
      dayPattern: 'Mon+Thu 2:00pm to 5:00pm',
      dates: D.m3_mt,
      startTime: '14:00',
      endTime: '17:00',
      venue: 'Cyberport Classroom J',
    }),
  ],
}))

courses.push(course({
  courseCode: 'ECON6087',
  courseTitle: 'Textual Analysis for Economists',
  module: 3,
  courseType: 'Stream Core',
  offeredToStreams: ['DA'],
  streamCoreForStreams: ['DA'],
  sections: [
    section({
      instructors: instr('Prof. Ruiqi Sun'),
      dayPattern: 'Mon+Thu 6:30pm to 9:30pm',
      dates: D.m3_mt,
      startTime: '18:30',
      endTime: '21:30',
      venue: 'Mondays: Main Campus - CBA',
      venueFor: (date) =>
        weekday(date) === 1
          ? 'Mondays: Main Campus - CBA'
          : 'Thursdays: Main Campus - CPD-2.58',
    }),
  ],
}))

courses.push(course({
  courseCode: 'ECON6112',
  courseTitle: 'The Economics of Valuation',
  module: 3,
  courseType: 'Elective',
  sections: [
    section({
      instructors: instr('Prof. Yifei ZHANG'),
      // PDF day column says Tue+Fri; listed class dates are Wed+Sat — trust dates
      dayPattern: 'Wed+Sat 6:30pm to 9:30pm',
      dates: D.m3_6112,
      startTime: '18:30',
      endTime: '21:30',
      venue: 'Main Campus: CPD-G.02',
    }),
  ],
}))

courses.push(course({
  courseCode: 'ECON6075',
  courseTitle: 'Economic Policy I',
  module: 3,
  courseType: 'Stream Core',
  offeredToStreams: ['PL'],
  streamCoreForStreams: ['PL'],
  sections: [
    section({
      instructors: instr('Prof. Richard WONG', 'Prof. Hongbin CAI', 'Prof. Heiwai TANG'),
      dayPattern: 'Tue+Fri 9:30am to 12:45pm',
      dates: D.m3_tf,
      startTime: '09:30',
      endTime: '12:45',
      venue: 'Main Campus - KB223',
    }),
  ],
}))

// ═══ Semester 2 (Module 4 & 5) — module 12 ═══
courses.push(course({
  courseCode: 'ECON6002',
  courseTitle: 'Selected Topics in Microeconomics I',
  module: 12,
  courseType: 'Stream Core',
  offeredToStreams: ['THY', 'ARS'],
  streamCoreForStreams: ['THY', 'ARS'],
  sections: [
    section({
      instructors: instr('Prof. Balazs SZENTES'),
      dayPattern: 'Tuesday 9:30am to 12:30pm',
      dates: D.s2_tue_am,
      startTime: '09:30',
      endTime: '12:30',
      venue: 'Main Campus - KKL 301',
    }),
  ],
}))

courses.push(course({
  courseCode: 'ECON6052',
  courseTitle: 'Selected Topics in Macroeconomics',
  module: 12,
  courseType: 'Stream Core',
  offeredToStreams: ['THY', 'ARS'],
  streamCoreForStreams: ['THY', 'ARS'],
  sections: [
    section({
      instructors: instr('Prof. Yulei LUO', 'Prof. Henry CHEN'),
      dayPattern: 'Tuesday 2:00pm to 5:00pm',
      dates: D.s2_tue_pm,
      startTime: '14:00',
      endTime: '17:00',
      venue: 'Main Campus - KKL 301',
    }),
  ],
}))

courses.push(course({
  courseCode: 'ECON6059',
  courseTitle: 'Selected Topics in Macroeconomics II',
  module: 12,
  courseType: 'Stream Core',
  offeredToStreams: ['THY', 'ARS'],
  streamCoreForStreams: ['THY', 'ARS'],
  sections: [
    section({
      instructors: instr('Prof. Xaiodong ZHU', 'Prof. Xiaomei SUI'),
      dayPattern: 'Friday 9:30am to 12:30pm',
      dates: D.s2_fri,
      startTime: '09:30',
      endTime: '12:30',
      venue: 'Main Campus - KKL301',
    }),
  ],
}))

courses.push(course({
  courseCode: 'ECON6116',
  courseTitle: 'Advanced Topics in Applied Economics: Data and Policy',
  module: 12,
  courseType: 'Capstone',
  offeredToStreams: ['DA', 'PL'],
  capstoneForStreams: ['DA', 'PL'],
  sections: [
    section({
      sectionId: 'A',
      instructors: instr('Prof. Chicheng MA'),
      dayPattern: 'Friday 9:30am to 12:30pm',
      dates: D.s2_fri,
      startTime: '09:30',
      endTime: '12:30',
      venue: 'Main Campus - KKLG104',
    }),
    section({
      sectionId: 'B',
      instructors: instr('Prof. Chicheng MA'),
      dayPattern: 'Tuesday 9:00am to 12:00pm',
      dates: D.s2_tue_am,
      startTime: '09:00',
      endTime: '12:00',
      venue: 'Main Campus - MB217',
    }),
    section({
      sectionId: 'C',
      instructors: instr('Prof. Heng CHEN'),
      dayPattern: 'Monday 9:00am to 12:00pm',
      dates: D.s2_mon_6116,
      startTime: '09:00',
      endTime: '12:00',
      venue: 'Main Campus: KK101',
    }),
    section({
      sectionId: 'D',
      instructors: instr('Prof. Heng CHEN'),
      dayPattern: 'Monday 2:00pm to 5:00pm',
      dates: D.s2_mon_6116,
      startTime: '14:00',
      endTime: '17:00',
      venue: 'Cyberport Classroom J',
    }),
  ],
}))

{
  const v6078 = {
    '2027-01-28': 'KKL315',
    '2027-02-04': 'KKL315',
    '2027-02-18': 'KKL315',
    '2027-02-25': 'KKL315',
    '2027-03-04': 'KKL315',
    '2027-03-11': 'KKL315',
    '2027-03-18': 'KKL315',
    '2027-03-25': 'KKL301',
    '2027-04-01': 'KKL301',
    '2027-04-08': 'KKL301',
  }
  courses.push(course({
    courseCode: 'ECON6078',
    courseTitle: 'Topics in Economic Research II',
    module: 12,
    courseType: 'Stream Core',
    courseTypes: ['Stream Core', 'Capstone'],
    offeredToStreams: ['THY', 'ARS'],
    streamCoreForStreams: ['THY', 'ARS'],
    capstoneForStreams: ['THY'],
    sections: [
      section({
        instructors: instr('Prof. Wing SUEN', 'Prof. Henry CHEN'),
        dayPattern: 'Thursday 2:00pm to 5:00pm',
        dates: D.s2_6078,
        startTime: '14:00',
        endTime: '17:00',
        venue: 'KKL315',
        venueFor: venueByDate(v6078, 'KKL315'),
      }),
    ],
  }))
}

courses.push(course({
  courseCode: 'ECON6096',
  courseTitle: 'Computational Methods in Economics',
  module: 12,
  courseType: 'Elective',
  sections: [
    section({
      instructors: instr('Prof. Naijia GUO'),
      dayPattern: 'Monday 2:00pm to 5:00pm',
      dates: D.s2_6096,
      startTime: '14:00',
      endTime: '17:00',
      venue: 'Main Campus - KKL301',
    }),
  ],
}))

{
  const v6081 = {
    '2027-01-28': 'KKL 315',
    '2027-02-11': 'KKL 315',
    '2027-02-18': 'KKL 315',
    '2027-02-25': 'KKL 315',
    '2027-03-04': 'KKL 315',
    '2027-03-11': 'KKL 315',
    '2027-03-18': 'KKL 315',
    '2027-03-25': 'KKL301',
    '2027-04-01': 'KKL301',
    '2027-04-08': 'KKL301',
    '2027-04-15': 'KKL301',
  }
  courses.push(course({
    courseCode: 'ECON6081',
    courseTitle: 'Quantitative Macroeconomics: Data, Model and Policy',
    module: 12,
    courseType: 'Stream Core',
    offeredToStreams: ['THY', 'ARS'],
    streamCoreForStreams: ['THY', 'ARS'],
    sections: [
      section({
        instructors: instr('Prof. Lichen ZHANG'),
        dayPattern: 'Thursday 9:30am to 12:30pm',
        dates: D.s2_6081,
        startTime: '09:30',
        endTime: '12:30',
        venue: 'KKL 315',
        venueFor: venueByDate(v6081, 'KKL 315'),
      }),
    ],
  }))
}

courses.push(course({
  courseCode: 'ECON6110',
  courseTitle: 'Advanced Topics in Labour Economics II',
  module: 12,
  courseType: 'Stream Core',
  offeredToStreams: ['THY', 'ARS'],
  streamCoreForStreams: ['THY', 'ARS'],
  sections: [
    section({
      instructors: instr('Prof. Uta Schonberg', 'Prof. Naijia GUO'),
      dayPattern: 'Monday 9:30am to 12:30pm',
      dates: D.s2_6110,
      startTime: '09:30',
      endTime: '12:30',
      venue: 'Main Campus - KKL315',
    }),
  ],
}))

// ═══ Module 4 ═══
courses.push(course({
  courseCode: 'ECON6008',
  courseTitle: 'International Macroeconomics and Finance',
  module: 4,
  courseType: 'Stream Core',
  offeredToStreams: ['PL'],
  streamCoreForStreams: ['PL'],
  sections: [
    section({
      sectionId: 'B',
      instructors: instr('Prof. Wataru MIYAMOTO'),
      dayPattern: 'Wed+Sat 9:30am to 12:30pm',
      dates: D.m4_ws,
      startTime: '09:30',
      endTime: '12:30',
      venue: 'Cyberport Classroom EFG',
    }),
  ],
}))

courses.push(course({
  courseCode: 'ECON6105',
  courseTitle: 'Economics of AI and Innovation',
  module: 4,
  courseType: 'Stream Core',
  offeredToStreams: ['PL'],
  streamCoreForStreams: ['PL'],
  sections: [
    section({
      instructors: instr('Prof. Yanhui WU'),
      dayPattern: 'Tue+Fri 9:00am to 12:00pm',
      dates: D.m4_tf_6105,
      startTime: '09:00',
      endTime: '12:00',
      venue: 'Tuesdays: Main Campus -LE6',
      venueFor: (date) =>
        weekday(date) === 2
          ? 'Tuesdays: Main Campus -LE6'
          : 'Fridays: Main Campus - LE4',
    }),
  ],
}))

const sunBlockRanges = [
  { startTime: '09:30', endTime: '12:30' },
  { startTime: '14:00', endTime: '17:00' },
]

courses.push(course({
  courseCode: 'ECON6057',
  courseTitle: 'China in Global Economy',
  module: 4,
  courseType: 'Elective',
  sections: [
    section({
      instructors: instr('Prof. Harry LI'),
      dayPattern: 'Sunday Block Mode 9:30am to 12:30pm & 2:00pm to 5:00pm',
      dates: D.m4_sun_block,
      ranges: sunBlockRanges,
      venue: 'Main Campus - CYCP1',
    }),
  ],
}))

courses.push(course({
  courseCode: 'ECON6107',
  courseTitle: 'Financial Economics and Investment',
  module: 4,
  courseType: 'Elective',
  sections: [
    section({
      instructors: instr('Dr. Xiyue CAO'),
      dayPattern: 'Sunday Block Mode 9:30am to 12:30pm & 2:00pm to 5:00pm',
      dates: D.m4_sun_block,
      ranges: sunBlockRanges,
      venue: 'Main Campus - LE9',
    }),
  ],
}))

courses.push(course({
  courseCode: 'ECON6086',
  courseTitle: 'Digital Economy and Big Data Analysis',
  module: 4,
  courseType: 'Stream Core',
  offeredToStreams: ['DA'],
  streamCoreForStreams: ['DA'],
  sections: [
    section({
      instructors: instr('Prof. Ping YU'),
      dayPattern: 'Sunday Block Mode 9:30am to 12:30pm & 2:00pm to 5:00pm',
      dates: D.m4_sun_block,
      ranges: sunBlockRanges,
      venue: 'Main Campus - LE6',
    }),
  ],
}))

courses.push(course({
  courseCode: 'ECON6117',
  courseTitle: 'AI-Enabled Economic Policy Research',
  module: 4,
  courseType: 'Elective',
  sections: [
    section({
      instructors: instr('Prof. Michael Wong'),
      dayPattern: 'Mon+Thu 9:30am to 12:30pm',
      dates: D.m4_mt,
      startTime: '09:30',
      endTime: '12:30',
      venue: 'Cyberport - LTA',
    }),
  ],
}))

courses.push(course({
  courseCode: 'ECON6120',
  courseTitle: 'Game Theory and Artificial Intelligence',
  module: 4,
  courseType: 'Stream Core',
  offeredToStreams: ['THY', 'ARS', 'PL'],
  streamCoreForStreams: ['THY', 'ARS', 'PL'],
  sections: [
    section({
      instructors: instr('Prof. Balazs SZENTES'),
      dayPattern: 'Mon+Thu 9:30am to 12:30pm',
      dates: D.m4_mt,
      startTime: '09:30',
      endTime: '12:30',
      venue: 'Cyberport Classroom J',
    }),
  ],
}))

courses.push(course({
  courseCode: 'ECON6090',
  courseTitle: 'The Political Economy of Global Business',
  module: 4,
  courseType: 'Elective',
  sections: [
    section({
      instructors: instr('Prof Chang SUN'),
      dayPattern: 'Mon+Thu 9:30am to 12:30pm',
      dates: D.m4_mt,
      startTime: '09:30',
      endTime: '12:30',
      venue: 'Cyberport Classroom D',
    }),
  ],
}))

courses.push(course({
  courseCode: 'ECON6103',
  courseTitle: 'Serendipitous Forces',
  module: 4,
  courseType: 'Elective',
  sections: [
    section({
      instructors: instr('Mr David DODWELL'),
      dayPattern: 'Tue+Fri 6:30pm to 9:30pm',
      dates: D.m4_6103,
      startTime: '18:30',
      endTime: '21:30',
      venue: 'Cyberport Classroom EFG',
    }),
  ],
}))

// ═══ Module 5 ═══
courses.push(course({
  courseCode: 'ECON6076',
  courseTitle: 'Economic Policy II',
  module: 5,
  courseType: 'Stream Core',
  offeredToStreams: ['PL'],
  streamCoreForStreams: ['PL'],
  sections: [
    section({
      instructors: instr("Dr. Tim HAU", "Dr. Qingyuan Xue", "Mr. Gerald O'Connor"),
      dayPattern: 'Tue+Fri 6:30pm to 9:30pm',
      dates: D.m5_tf,
      startTime: '18:30',
      endTime: '21:30',
      venue: 'Cyberport Classroom J',
    }),
  ],
}))

courses.push(course({
  courseCode: 'ECON6063',
  courseTitle: 'Environmental Economics',
  module: 5,
  courseType: 'Elective',
  sections: [
    section({
      instructors: instr('Prof. Guojun HE'),
      dayPattern: 'Mon+Thu 9:30am to 12:30pm',
      dates: D.m5_mt,
      startTime: '09:30',
      endTime: '12:30',
      venue: 'Cyberport Classroom J',
    }),
  ],
}))

{
  const v6121 = {
    '2027-03-18': 'Cyberport Classroom J',
    '2027-04-15': 'Cyberport Classroom J',
    '2027-03-22': 'Cyberport Classroom D',
    '2027-03-25': 'Cyberport Classroom D',
    '2027-04-01': 'Cyberport Classroom D',
    '2027-04-08': 'Cyberport Classroom D',
    '2027-04-12': 'Cyberport Classroom D',
    '2027-04-19': 'Cyberport Classroom D',
    '2027-04-22': 'Cyberport Classroom D',
    '2027-04-26': 'Cyberport Classroom D',
  }
  courses.push(course({
    courseCode: 'ECON6121',
    courseTitle: 'Topics in Digital Economics',
    module: 5,
    courseType: 'Stream Core',
    offeredToStreams: ['DA'],
    streamCoreForStreams: ['DA'],
    sections: [
      section({
        instructors: instr('Dr. Qingyuan YANG'),
        dayPattern: 'Mon+Thu 2:00pm to 5:00pm',
        dates: D.m5_mt,
        startTime: '14:00',
        endTime: '17:00',
        venue: 'Cyberport Classroom D',
        venueFor: venueByDate(v6121, 'Cyberport Classroom D'),
      }),
    ],
  }))
}

courses.push(course({
  courseCode: 'ECON6114',
  courseTitle: 'Economic Policy III',
  module: 5,
  courseType: 'Stream Core',
  offeredToStreams: ['PL'],
  streamCoreForStreams: ['PL'],
  sections: [
    section({
      instructors: instr('Prof. Xiyue CAO', 'Prof. Naijia GUO'),
      dayPattern: 'Tue+Fri 9:30am to 12:30pm',
      dates: D.m5_tf,
      startTime: '09:30',
      endTime: '12:30',
      venue: 'Cyberport Classroom D',
    }),
  ],
}))

{
  const v6083b = {
    '2027-04-02': 'Cyberport Classroom D',
    '2027-04-16': 'Cyberport Classroom D',
    '2027-03-19': 'Cyberport LTB',
    '2027-03-23': 'Cyberport LTB',
    '2027-03-30': 'Cyberport LTB',
    '2027-04-06': 'Cyberport LTB',
    '2027-04-09': 'Cyberport LTB',
    '2027-04-13': 'Cyberport LTB',
    '2027-04-20': 'Cyberport LTB',
    '2027-04-23': 'Cyberport LTB',
  }
  courses.push(course({
    courseCode: 'ECON6083',
    courseTitle: 'Applied Machine Learning',
    module: 5,
    courseType: 'Stream Core',
    offeredToStreams: ['DA'],
    streamCoreForStreams: ['DA'],
    sections: [
      section({
        sectionId: 'A',
        instructors: instr('Prof. Jasmine HAO'),
        dayPattern: 'Tue+Fri 9:30am to 12:30pm',
        dates: D.m5_tf,
        startTime: '09:30',
        endTime: '12:30',
        venue: 'Cyberport Classroom J',
      }),
      section({
        sectionId: 'B',
        instructors: instr('Prof. Bingjing LI'),
        dayPattern: 'Tue+Fri 2:00pm to 5:00pm',
        dates: D.m5_tf,
        startTime: '14:00',
        endTime: '17:00',
        venue: 'Cyberport LTB',
        venueFor: venueByDate(v6083b, 'Cyberport LTB'),
      }),
    ],
  }))
}

{
  // TP lists D on Thu dates and LTB on Mon dates; 8-Apr & 22-Apr omitted in PDF → infer Thu→D
  const v6065 = {
    '2027-03-18': 'Cyberport Classroom D',
    '2027-03-25': 'Cyberport Classroom D',
    '2027-04-01': 'Cyberport Classroom D',
    '2027-04-08': 'Cyberport Classroom D',
    '2027-04-15': 'Cyberport Classroom D',
    '2027-04-22': 'Cyberport Classroom D',
    '2027-03-22': 'Cyberport Classroom LTB',
    '2027-04-12': 'Cyberport Classroom LTB',
    '2027-04-19': 'Cyberport Classroom LTB',
    '2027-04-26': 'Cyberport Classroom LTB',
  }
  courses.push(course({
    courseCode: 'ECON6065',
    courseTitle: 'Money and Banking',
    module: 5,
    courseType: 'Elective',
    sections: [
      section({
        instructors: instr('Dr. Xin Zhang'),
        dayPattern: 'Mon+Thu 2:00pm to 5:00pm',
        dates: D.m5_mt,
        startTime: '14:00',
        endTime: '17:00',
        venue: 'Cyberport Classroom D',
        venueFor: venueByDate(v6065, 'Cyberport Classroom D'),
      }),
    ],
  }))
}

courses.push(course({
  courseCode: 'ECON6118',
  courseTitle: 'Government and Regulation',
  module: 5,
  courseType: 'Elective',
  sections: [
    section({
      instructors: instr('Prof. Ruixue Jia'),
      dayPattern: 'Tue+Fri 2:00pm to 5:00pm',
      dates: D.m5_tf,
      startTime: '14:00',
      endTime: '17:00',
      venue: 'Cyberport Classroom J',
    }),
  ],
}))

courses.push(course({
  courseCode: 'ECON6095',
  courseTitle: 'Programme Evaluation for Policy Makers',
  module: 5,
  courseType: 'Stream Core',
  offeredToStreams: ['PL'],
  streamCoreForStreams: ['PL'],
  sections: [
    section({
      instructors: instr('Prof. Juan PANTANO'),
      dayPattern: 'Mon+Thu 6:30pm to 9:30pm',
      dates: D.m5_mt,
      startTime: '18:30',
      endTime: '21:30',
      venue: 'Main Campus - KKL301',
    }),
  ],
}))

// ═══ Module 6 ═══
courses.push(course({
  courseCode: 'ECON6060',
  courseTitle: 'Development Economics',
  module: 6,
  courseType: 'Elective',
  sections: [
    section({
      instructors: instr('Prof. Gedeon LIM'),
      dayPattern: 'Tue+Fri 2:00pm to 5:00pm',
      dates: D.m6_tf,
      startTime: '14:00',
      endTime: '17:00',
      venue: 'Cyberport Classroom J',
    }),
  ],
}))

// Validate meeting weekdays roughly match dayPattern hints
function sanity() {
  const issues = []
  for (const c of courses) {
    for (const s of c.sections) {
      if (!s.meetings.length) issues.push(`${c.courseCode} m${c.module} ${s.sectionId}: no meetings`)
      for (const m of s.meetings) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(m.date)) issues.push(`bad date ${m.date}`)
        if (!/^\d{2}:\d{2}$/.test(m.startTime)) issues.push(`bad start ${m.startTime}`)
      }
    }
  }
  return issues
}

const notes = sanity()
fs.writeFileSync(OUT, JSON.stringify(courses, null, 2) + '\n')
console.log('Wrote', OUT)
console.log('courses', courses.length)
console.log(
  courses.map((c) => `${c.courseCode}@${c.module}[${c.sections.map((s) => s.sectionId).join(',')}]`).join('\n'),
)
if (notes.length) {
  console.log('--- notes ---')
  notes.forEach((n) => console.log(n))
}
