/**
 * Parse 2026-11 Common Electives sheet → master index + merge into msba/mgm/mecon.
 *
 * Usage:
 *   node scripts/import-common-electives.mjs              # parse + download + merge
 *   node scripts/import-common-electives.mjs --parse-only
 *   node scripts/import-common-electives.mjs --merge-only
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { HTMLParser } from './lib/html-table.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const SHEET = path.join(root, 'tmp-common-electives/outline_files/sheet001.htm')
const OUT_DIR = path.join(root, 'public/common-electives/26-27')
const OUTLINES_DIR = path.join(OUT_DIR, 'outlines')
const INDEX_PATH = path.join(OUT_DIR, 'index.json')
const PDF_BASE =
  'https://www.fbeitt.hku.hk/webform/msc/2026-11-common-elective-course-enrollment-26-27/doc'

const MONTHS = {
  Jan: 1, January: 1, Feb: 2, February: 2, Mar: 3, March: 3, Apr: 4, April: 4,
  May: 5, Jun: 6, June: 6, Jul: 7, July: 7, Aug: 8, August: 8,
  Sep: 9, Sept: 9, September: 9, Oct: 10, October: 10, Nov: 11, November: 11,
  Dec: 12, December: 12,
}

const MODULE_WINDOWS = [
  { module: 3, start: '2026-12-01', end: '2027-01-21' },
  { module: 4, start: '2027-01-22', end: '2027-03-10' },
  { module: 5, start: '2027-03-18', end: '2027-05-04' },
  { module: 6, start: '2027-05-05', end: '2027-06-18' },
]

const HOST_LABEL_TO_ID = {
  IMBA: 'imba',
  MBA: 'mba',
  MAA: 'maa',
  MAcct: 'macct',
  MAIB: 'maib',
  MEcon: 'mecon',
  MFFinTech: 'mffintech',
  MFin: 'mfin',
  MGM: 'mgm',
  MSAF: 'msaf',
  'MSc(BA)': 'msba',
  'MSc(Mktg)': 'msmkt',
  MWM: 'mwm',
}

const NOT_OPEN_ALIASES = {
  'msc(ba)': 'msba',
  'msc(ba) students': 'msba',
  mgm: 'mgm',
  mecon: 'mecon',
  macct: 'macct',
  msaf: 'msaf',
  maa: 'maa',
  maib: 'maib',
  mfin: 'mfin',
  mffintech: 'mffintech',
  mfwm: 'mwm',
  mwm: 'mwm',
  'msc(mktg)': 'msmkt',
  'msc(mktg) students': 'msmkt',
}

const PACK_HOST_PREFIX = {
  msba: /^MSBA/i,
  mgm: /^PMGM/i,
  mecon: /^ECON/i,
}

const LIVE_PACKS = ['msba', 'mgm', 'mecon']

/** Known equivalent / cross-list pairs (bidirectional antirequisite). */
const CROSS_LIST_PAIRS = [
  ['PMGM7040', 'ECON6105'],
  ['PMGM7046', 'ECON6117'],
  ['PMGM7015', 'ECON6090'],
  ['PMGM7036', 'ECON6103'],
  ['PMGM7035', 'MACC7024'],
  ['PMGM7035', 'PMAA7015'],
  ['MACC7024', 'PMAA7015'],
  ['PMGM7039', 'PMBA6119'],
  ['PMBA6089', 'MSMK7021'],
  ['PMBA6089', 'IMBA6114'],
  ['MSMK7021', 'IMBA6114'],
  ['IMBA6116', 'PMBA6110'],
  ['IMBA6067', 'PMBA6100'],
  ['IMBA6067', 'MSMK7013'],
  ['PMBA6023', 'IMBA6034'],
  ['MACC7013', 'MSAF7026'],
  ['MACC7011', 'PMGM7021'],
  ['MACC7011', 'MSAF7008'],
  ['PMGM7021', 'MSAF7008'],
  ['PMGM7021', 'MACC7011'],
  ['MSAF7008', 'PMGM7028'],
  ['MFIN7068', 'PMAA7008'],
  ['MFIN7053', 'MACC7023'],
  ['MFIN7053', 'PMAA7022'],
  ['PMWM7016', 'MSAF7017'],
  ['PMWM7017', 'MSAF7019'],
]

function pad(n) {
  return String(n).padStart(2, '0')
}
function ymd(y, m, d) {
  return `${y}-${pad(m)}-${pad(d)}`
}
function cleanText(s) {
  return String(s || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
function normSpace(s) {
  return cleanText(s).replace(/\s+/g, ' ')
}

function parseModuleHint(offerDateRaw) {
  const m = offerDateRaw.match(/Module\s*(\d)/i)
  return m ? Number(m[1]) : null
}

function moduleFromDate(dateStr) {
  for (const w of MODULE_WINDOWS) {
    if (dateStr >= w.start && dateStr <= w.end) return w.module
  }
  // MBA Jan modular often sits in M4 window
  if (dateStr >= '2027-01-01' && dateStr < '2027-01-22') return 4
  if (dateStr >= '2027-03-11' && dateStr < '2027-03-18') return 4
  return 4
}

function parseTimeRange(raw) {
  const s = normSpace(raw)
  // 9:00-12:30 / 09:30am - 5:00pm / 14:00-17:00 / 2:00pm to 5:00pm
  const m = s.match(
    /(\d{1,2}):(\d{2})\s*(am|pm)?\s*[-–to]+\s*(\d{1,2}):(\d{2})\s*(am|pm)?/i,
  )
  if (!m) return null
  let h1 = Number(m[1])
  let h2 = Number(m[4])
  const ap1 = (m[3] || '').toLowerCase()
  const ap2 = (m[6] || m[3] || '').toLowerCase()
  if (ap1 === 'pm' && h1 < 12) h1 += 12
  if (ap1 === 'am' && h1 === 12) h1 = 0
  if (ap2 === 'pm' && h2 < 12) h2 += 12
  if (ap2 === 'am' && h2 === 12) h2 = 0
  // bare afternoon heuristics: 2:00-5:00 without am/pm when start < 8 likely pm
  if (!m[3] && !m[6] && h1 <= 6 && h2 <= 9 && h2 > h1) {
    /* keep as 24h already like 14:00 */
  }
  return { startTime: `${pad(h1)}:${m[2]}`, endTime: `${pad(h2)}:${m[5]}` }
}

function parseAllTimeRanges(raw) {
  const s = normSpace(raw)
  const out = []
  const re =
    /(\d{1,2}):(\d{2})\s*(am|pm)?\s*[-–to]+\s*(\d{1,2}):(\d{2})\s*(am|pm)?/gi
  let m
  while ((m = re.exec(s))) {
    const t = parseTimeRange(m[0])
    if (t) out.push(t)
  }
  return out
}

function timeBucket(startHHMM) {
  const [h, mi] = startHHMM.split(':').map(Number)
  const mins = h * 60 + mi
  if (mins < 12 * 60) return 'AM'
  if (mins < 18 * 60) return 'PM'
  return 'NT'
}

function meetingDaysFrom(dates) {
  return [...new Set(dates.map(d => new Date(d + 'T12:00:00').getDay()))].sort()
}

function parseDateToken(token, defaultYear) {
  const t = token.trim().replace(/,$/, '')
  let m = t.match(/^(\d{1,2})[- ]([A-Za-z]+)(?:[, ]+(\d{4}))?$/i)
  if (m) {
    const mon = MONTHS[m[2]] || MONTHS[m[2].slice(0, 3)]
    if (!mon) return null
    return ymd(m[3] ? Number(m[3]) : defaultYear, mon, Number(m[1]))
  }
  m = t.match(/^([A-Za-z]+)[- ](\d{1,2})(?:[, ]+(\d{4}))?$/i)
  if (m) {
    const mon = MONTHS[m[1]] || MONTHS[m[1].slice(0, 3)]
    if (!mon) return null
    return ymd(m[3] ? Number(m[3]) : defaultYear, mon, Number(m[2]))
  }
  return null
}

/** Expand "March 18-21, 2027" into daily dates. */
function expandRange(raw) {
  const m = normSpace(raw).match(
    /^([A-Za-z]+)\s+(\d{1,2})\s*[-–]\s*(\d{1,2}),?\s*(\d{4})$/,
  )
  if (!m) return null
  const mon = MONTHS[m[1]] || MONTHS[m[1].slice(0, 3)]
  if (!mon) return null
  const y = Number(m[4])
  const d1 = Number(m[2])
  const d2 = Number(m[3])
  const out = []
  for (let d = d1; d <= d2; d++) out.push(ymd(y, mon, d))
  return out
}

/**
 * Parse mixed date lists: "Jan 9, 16, 23, 30, Feb 13, 2027"
 * or "3-Dec, 7-Dec, ... 2026" / "Jan 22, 26, 29, 2027\nFeb 2, ..."
 */
function parseDateList(raw) {
  const range = expandRange(raw.split(/\n/)[0] || raw)
  if (range) return range

  let s = cleanText(raw)
  // Drop day-of-week / time lines for date extraction
  const dateBlock = s
    .split(/\n/)
    .filter(line => {
      const L = line.trim()
      if (!L) return false
      if (/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i.test(L))
        return false
      if (/\d{1,2}:\d{2}/.test(L) && !/[A-Za-z]{3}/.test(L)) return false
      if (/except\b/i.test(L)) return false
      if (/tentative|company site|occasionally|sessions?\s+only/i.test(L)) return false
      return true
    })
    .join(', ')

  s = dateBlock.replace(/\s+/g, ' ').trim()
  const years = [...s.matchAll(/\b(20\d{2})\b/g)].map(x => Number(x[1]))
  let currentYear = years[0] || 2027
  // Remove trailing year-only tokens but keep embedded
  const parts = s.split(/[,&]+/).map(p => p.trim()).filter(Boolean)
  const out = []
  let lastMonth = null
  for (let part of parts) {
    if (/^20\d{2}$/.test(part)) {
      currentYear = Number(part)
      continue
    }
    // "May 14 (Morning)" → May 14
    part = part.replace(/\([^)]*\)/g, '').trim()
    // "Apr 22" style after year seen
    const yIn = part.match(/20\d{2}/)
    if (yIn) currentYear = Number(yIn[0])
    const cleaned = part.replace(/,?\s*20\d{2}/, '').trim()
    if (!cleaned) continue

    // Day-only after month established: "16" after "Jan 9"
    if (/^\d{1,2}$/.test(cleaned) && lastMonth) {
      out.push(ymd(currentYear, lastMonth, Number(cleaned)))
      continue
    }

    const d = parseDateToken(cleaned, currentYear)
    if (d) {
      out.push(d)
      lastMonth = Number(d.slice(5, 7))
      // If we just saw Dec and next is Jan without year, bump later via heuristic
      continue
    }
  }

  // Fix year boundary / explicit later year in list (e.g. Dec 2026 then Jan 5, 8, 2027)
  const terminalYear = years[years.length - 1]
  for (let i = 1; i < out.length; i++) {
    const prev = out[i - 1]
    let cur = out[i]
    const prevY = Number(prev.slice(0, 4))
    const prevM = Number(prev.slice(5, 7))
    const curM = Number(cur.slice(5, 7))
    let curY = Number(cur.slice(0, 4))
    if (curM < prevM && curY <= prevY) {
      curY = prevY + 1
      cur = `${curY}${cur.slice(4)}`
      out[i] = cur
    } else if (terminalYear && curM <= 6 && curY < terminalYear && prevM >= 11) {
      cur = `${terminalYear}${cur.slice(4)}`
      out[i] = cur
    }
  }
  // If list ends with an explicit year token, ensure Jan–Jun dates use it when preceding was Dec
  if (terminalYear) {
    for (let i = 0; i < out.length; i++) {
      const m = Number(out[i].slice(5, 7))
      const y = Number(out[i].slice(0, 4))
      if (m <= 6 && y === terminalYear - 1 && out.some(d => d.startsWith(String(terminalYear - 1) + '-12'))) {
        out[i] = `${terminalYear}${out[i].slice(4)}`
      }
    }
  }
  return out
}

function extractSectionId(title) {
  const m = title.match(/\(Class\s*([A-Z])\)/i)
  return m ? m[1].toUpperCase() : 'A'
}

function stripClassFromTitle(title) {
  return normSpace(title.replace(/\(Class\s*[A-Z]\)/gi, '')).replace(/\s+/g, ' ')
}

function parseInstructors(raw) {
  const s = cleanText(raw)
  if (!s) return []
  // Split on ; or newlines for role segments — section-level uses primary names
  const names = []
  const re =
    /((?:Prof\.?|Dr\.?|Mr\.?|Ms\.?|Professors?)\s+[^;(]+?)(?=\s*\(|\s*;|$|\n)/gi
  let m
  while ((m = re.exec(s))) {
    const name = normSpace(m[1]).replace(/,\s*$/, '')
    if (name && !/company site/i.test(name)) names.push({ name })
  }
  if (names.length === 0) {
    // Fallback: whole line as one instructor
    const one = normSpace(s.split('\n')[0])
    if (one && !/^N$/i.test(one)) names.push({ name: one })
  }
  return names
}

function extractCourseCodes(text) {
  return [...new Set((text.match(/\b[A-Z]{2,5}\d{4}\b/g) || []))]
}

function filterAttendance(items) {
  return items.filter(x => !/70%\s*attendance/i.test(x))
}

function parseOtherRequirements(raw, prereqRaw, courseCode) {
  const items = []
  const text = cleanText(raw)
  const prereq = cleanText(prereqRaw)

  // MSBA7021: prior knowledge in prereq column
  if (courseCode === 'MSBA7021' || /prior knowledge required/i.test(prereq)) {
    const m = prereq.match(/prior knowledge required:\s*([^)]+)/i)
    if (m) items.push(normSpace(m[1]))
    else if (/prior knowledge/i.test(prereq)) {
      items.push(normSpace(prereq.replace(/^N\s*/i, '')))
    }
  }

  const joined = normSpace(text.replace(/\n+/g, ' '))
  for (const line of joined.split(/;/)) {
    let L = normSpace(line)
    if (!L || /^N$/i.test(L)) continue
    if (/70%\s*attendance/i.test(L) && !/work experience|english|proficiency|prior knowledge/i.test(L)) {
      continue
    }
    L = L.replace(/\s*&\s*70%\s*attendance[^;]*/i, '')
      .replace(/\s*70%\s*attendance[^;]*/i, '')
      .trim()
    if (L && !/^N$/i.test(L)) items.push(L)
  }
  return filterAttendance([...new Set(items)])
}

function parsePrerequisites(raw, courseCode) {
  if (courseCode === 'MSBA7021') return [] // skills → otherRequirements
  const text = cleanText(raw)
  if (!text || /^N$/i.test(text.split('\n')[0].trim())) return []
  if (/prior knowledge/i.test(text)) return []
  const codes = extractCourseCodes(text)
  // Also keep human text titles for stubs
  return codes.map(code => {
    const m = text.match(new RegExp(`${code}\\s+([^\\n]+?)(?:\\s+or\\s+equivalent)?$`, 'i'))
    const titlePart = m ? normSpace(m[1]).replace(/\s+or\s+equivalent.*/i, '') : code
    return { courseCode: code, title: titlePart || code }
  })
}

function parseNotOpenTo(remarks) {
  const text = normSpace(cleanText(remarks))
  const packs = new Set()
  const labels = []
  // "Not open to X[, Y] and Z students as common elective"
  const re =
    /not open to\s+(.+?)\s+students(?:\s+as\s+common elective|\s+for enrolment[^.|;]*)?/gi
  let m
  while ((m = re.exec(text))) {
    const chunk = m[1]
    // Ignore "students who have taken…" antireq clauses
    if (/^students who have taken/i.test(chunk) || /who have taken or are taking/i.test(chunk)) {
      continue
    }
    for (const part of chunk.split(/\s+and\s+|,\s*/i)) {
      const key = normSpace(part).toLowerCase().replace(/\s+students$/i, '')
      if (!key || key === 'students') continue
      labels.push(normSpace(part))
      if (NOT_OPEN_ALIASES[key]) packs.add(NOT_OPEN_ALIASES[key])
    }
  }
  return { notOpenToPacks: [...packs], notOpenToLabels: [...new Set(labels)] }
}

function parseAntirequisiteCodes(remarks) {
  const text = cleanText(remarks)
  const codes = []
  // NOT eligible for students taking CODE
  // *Not open to students who have taken or are taking CODE/CODE
  const patterns = [
    /NOT eligible for students taking\s+([^.\n]+)/gi,
    /not open to students who have taken or are taking\s+([A-Z0-9/*\s]+)/gi,
  ]
  for (const re of patterns) {
    let m
    while ((m = re.exec(text))) {
      codes.push(...extractCourseCodes(m[1]))
    }
  }
  // Dr. Royce Yuen's PMBA6100 ... or MSMK7013
  return [...new Set(codes)]
}

function buildMeetingsGeneric(entry) {
  const offerDate = entry.offerDateRaw
  const meetingRaw = entry.meetingRaw
  const venue = normSpace(entry.venueRaw) || 'TBC'
  const combined = `${offerDate}\n${meetingRaw}`

  // Block range in meetingRaw first line
  const firstLine = meetingRaw.split(/\n/).map(l => l.trim()).find(Boolean) || ''
  let dates = expandRange(firstLine) || expandRange(normSpace(offerDate).split(/\n/)[0] || '')
  if (!dates || dates.length === 0) {
    // Prefer meetingRaw date lists; if offerDate is only "Module N / range", use meetingRaw
    const fromMeeting = parseDateList(meetingRaw)
    const fromOffer = parseDateList(offerDate)
    dates = fromMeeting.length >= fromOffer.length ? fromMeeting : fromOffer
    if (dates.length === 0) dates = fromMeeting.length ? fromMeeting : fromOffer
  }

  let times = parseAllTimeRanges(meetingRaw)
  if (times.length === 0) times = parseAllTimeRanges(combined)
  if (times.length === 0) times = [{ startTime: '09:30', endTime: '12:30' }]

  // Exceptions: "Except Jan 15, 2027 (Fri): 6:30pm - 9:30pm"
  const exceptMap = new Map()
  const exceptRe =
    /Except\s+([A-Za-z]+\s+\d{1,2},?\s*\d{4}|\d{1,2}-[A-Za-z]+(?:,\s*\d{4})?)\s*\([^)]*\):\s*([0-9:apmapm\s\-–to]+)/gi
  let em
  while ((em = exceptRe.exec(meetingRaw))) {
    const d = parseDateToken(em[1].replace(',', ''), 2027) || parseDateList(em[1])[0]
    const t = parseTimeRange(em[2])
    if (d && t) exceptMap.set(d, t)
  }

  // Occasionally alternate times on specific dates
  const occRe =
    /Occasionally[^\n]*\(([^)]+)\)[^\n]*?(\d{1,2}:\d{2}\s*(?:am|pm)?\s*[-–]\s*\d{1,2}:\d{2}\s*(?:am|pm)?)/gi
  // Also: "Occasionally on Thursday 18:30-21:30 (Apr 22)"
  const occ2 = meetingRaw.match(
    /Occasionally[^\n]*?(\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2})[^\n]*\(([A-Za-z]+\s+\d{1,2})\)/i,
  )
  if (occ2) {
    const t = parseTimeRange(occ2[1])
    const d = parseDateToken(occ2[2] + ', 2027', 2027)
    if (d && t) exceptMap.set(d, t)
  }

  const meetings = []
  for (const date of dates) {
    const t = exceptMap.get(date) || times[0]
    meetings.push({
      date,
      startTime: t.startTime,
      endTime: t.endTime,
      venue,
      sessionType: 'lecture',
    })
    // Block courses with morning+afternoon same day
    if (times.length > 1 && !exceptMap.has(date) && /Block/i.test(entry.offerMode)) {
      for (let i = 1; i < times.length; i++) {
        meetings.push({
          date,
          startTime: times[i].startTime,
          endTime: times[i].endTime,
          venue,
          sessionType: 'lecture',
        })
      }
    }
  }

  // MBA Sat full-day: single slot 9:30-17:00 already one meeting per date — OK
  // Sunday block with two slots same day
  if (/Sunday/i.test(meetingRaw) && times.length >= 2 && !/Block/i.test(entry.offerMode)) {
    // rebuild with both slots per date
    meetings.length = 0
    for (const date of dates) {
      for (const t of times.slice(0, 2)) {
        meetings.push({
          date,
          startTime: t.startTime,
          endTime: t.endTime,
          venue,
          sessionType: 'lecture',
        })
      }
    }
  }

  return meetings
}

function applyMaib7013Special(meetings, venue) {
  // Dec dates = L1-4 WAN; site visit L5-6 both; Jan dates = L7-10 OUYANG
  const sorted = [...meetings].sort((a, b) => a.date.localeCompare(b.date))
  const dec = sorted.filter(m => m.date.startsWith('2026-12'))
  const jan = sorted.filter(m => m.date.startsWith('2027-01'))
  const out = []
  for (const m of dec) {
    out.push({ ...m, instructors: ['Prof. Zhixi WAN'] })
  }
  // L5-L6 site visits (tentative)
  out.push({
    date: '2026-12-22',
    startTime: '09:30',
    endTime: '12:30',
    venue: 'Company site visit (tentative)',
    sessionType: 'lecture',
    instructors: ['Prof. Zhixi WAN', 'Prof. Huiyin OUYANG'],
  })
  out.push({
    date: '2026-12-29',
    startTime: '09:30',
    endTime: '12:30',
    venue: 'Company site visit (tentative)',
    sessionType: 'lecture',
    instructors: ['Prof. Zhixi WAN', 'Prof. Huiyin OUYANG'],
  })
  for (const m of jan) {
    out.push({ ...m, venue: m.venue || venue, instructors: ['Prof. Huiyin OUYANG'] })
  }
  return out
}

function dayPatternFrom(meetingRaw, meetings) {
  const lines = cleanText(meetingRaw).split(/\n/).map(l => l.trim()).filter(Boolean)
  const dayLine = lines.find(l =>
    /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Thur)/i.test(l),
  )
  if (dayLine) {
    const time = meetings[0] ? `${meetings[0].startTime}-${meetings[0].endTime}` : ''
    return normSpace(`${dayLine} ${time}`)
  }
  if (meetings.length) {
    return `${meetings[0].startTime}-${meetings[0].endTime}`
  }
  return normSpace(meetingRaw).slice(0, 80)
}

function crossListFromOutlineHref(href, courseCode) {
  if (!href) return []
  const codes = extractCourseCodes(href.replace(/.*\//, ''))
  return codes.filter(c => c !== courseCode)
}

async function downloadOutlineFile(outlineFile, outlineSourceUrl) {
  const safeName = outlineFile.replace(/\s+/g, '_').replace(/&nbsp;/gi, '_')
  const dest = path.join(OUTLINES_DIR, safeName)
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
    return { ok: true, skipped: true, dest, safeName }
  }
  const candidates = []
  if (outlineSourceUrl) {
    candidates.push(outlineSourceUrl.replace(/ /g, '%20').replace(/&nbsp;/gi, '%20'))
    // Fix missing /doc/ segment from bad relative resolution
    candidates.push(
      outlineSourceUrl
        .replace('/26-27/MSc/', '/26-27/doc/MSc/')
        .replace('/26-27/IMBA/', '/26-27/doc/IMBA/')
        .replace('/26-27/MBA/', '/26-27/doc/MBA/')
        .replace(/ /g, '%20')
        .replace(/&nbsp;/gi, '%20'),
    )
  }
  const folders = ['IMBA', 'MBA', 'MSc']
  const nameVariants = [
    outlineFile,
    outlineFile.replace(/ /g, '%20'),
    outlineFile.replace(/ /g, '_'),
    outlineFile.replace(/&nbsp;/gi, '%20'),
    outlineFile.replace(/&nbsp;/gi, ' ').replace(/ /g, '%20'),
    // Excel sometimes emits a real UTF-8 NBSP in the filename
    outlineFile.replace(/ |&nbsp;/gi, '\u00A0').split('\u00A0').map(encodeURIComponent).join('%C2%A0'),
    outlineFile.replace(/ /g, '%C2%A0'),
  ]
  for (const f of folders) {
    for (const n of nameVariants) {
      candidates.push(`${PDF_BASE}/${f}/${n}`)
    }
  }
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://www.hkubs.hku.hk/',
        },
      })
      if (!res.ok) continue
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 500) continue
      fs.writeFileSync(dest, buf)
      return { ok: true, dest, bytes: buf.length, safeName, url }
    } catch {
      /* try next */
    }
  }
  return { ok: false, outlineFile }
}

function parseSheet() {
  const html = fs.readFileSync(SHEET, 'utf8')
  const rows = HTMLParser.parseRows(html)
  const courses = []
  const prerequisiteIndex = []

  for (const row of rows) {
    if (row.length < 12) continue
    const prog = normSpace(row[0].text)
    const code = normSpace(row[1].text)
    if (!HOST_LABEL_TO_ID[prog] || !/^[A-Z]{2,5}\d{4}$/.test(code)) continue

    const titleRaw = cleanText(row[2].text)
    const offerMode = normSpace(row[3].text)
    const offerDateRaw = cleanText(row[4].text)
    const meetingRaw = cleanText(row[5].text)
    const venueRaw = cleanText(row[6].text)
    const instructorRaw = cleanText(row[7].text)
    const prereqRaw = cleanText(row[8].text)
    const otherRaw = cleanText(row[9].text)
    const remarks = cleanText(row[10].text)
    const outlineHref = row[11].href || null

    const sectionId = extractSectionId(titleRaw)
    const courseTitle = stripClassFromTitle(titleRaw)
    const hostProgramme = HOST_LABEL_TO_ID[prog]
    const moduleHint = parseModuleHint(offerDateRaw)

    const base = {
      courseCode: code,
      courseTitle,
      hostProgramme,
      hostLabel: prog,
      offerMode,
      offerDateRaw,
      meetingRaw,
      venueRaw,
      instructorRaw,
      remarks,
      sectionId,
    }

    let meetings = buildMeetingsGeneric(base)
    if (code === 'MAIB7013') {
      meetings = applyMaib7013Special(meetings, normSpace(venueRaw) || 'Cyberport')
    }

    const module =
      moduleHint ||
      (meetings[0] ? moduleFromDate(meetings[0].date) : 4)

    const instructors = parseInstructors(instructorRaw)
    // MAIB7013 section-level: both professors
    if (code === 'MAIB7013') {
      instructors.length = 0
      instructors.push({ name: 'Prof. Zhixi WAN' }, { name: 'Prof. Huiyin OUYANG' })
    }

    const prerequisites = parsePrerequisites(prereqRaw, code)
    for (const p of prerequisites) {
      if (!prerequisiteIndex.find(x => x.courseCode === p.courseCode)) {
        prerequisiteIndex.push({ ...p, kind: 'prerequisite-index' })
      }
    }

    const otherRequirements = parseOtherRequirements(otherRaw, prereqRaw, code)
    const { notOpenToPacks, notOpenToLabels } = parseNotOpenTo(remarks)
    const remarkAntireq = parseAntirequisiteCodes(remarks)
    const crossList = [
      ...new Set([
        ...crossListFromOutlineHref(outlineHref, code),
        ...CROSS_LIST_PAIRS.filter(([a, b]) => a === code || b === code).flatMap(([a, b]) =>
          a === code ? [b] : [a],
        ),
      ]),
    ].filter(c => c !== code)

    const outlineFile = outlineHref
      ? path.basename(decodeURIComponent(outlineHref.replace(/&nbsp;/gi, ' ')))
      : null
    const outlineSafe = outlineFile
      ? outlineFile.replace(/\s+/g, '_').replace(/&nbsp;/gi, '_')
      : null

    // Resolve outline URL from sheet-relative href (../IMBA/x.pdf → .../doc/IMBA/x.pdf)
    let outlineSourceUrl = null
    if (outlineHref) {
      const cleaned = outlineHref.replace(/&nbsp;/gi, ' ')
      outlineSourceUrl = new URL(cleaned, PDF_BASE + '/outline_files/sheet001.htm').href
    }

    const start = meetings[0]?.startTime || '09:30'
    courses.push({
      courseCode: code,
      courseTitle,
      hostProgramme,
      hostLabel: prog,
      module,
      sectionId,
      offerMode,
      offerDateRaw,
      meetingRaw,
      venueRaw: normSpace(venueRaw),
      instructors,
      prerequisites,
      otherRequirements,
      remarks,
      notOpenTo: notOpenToPacks,
      notOpenToLabels,
      remarkAntirequisites: remarkAntireq,
      crossList,
      outlineSourceUrl,
      outlinePdfPath: outlineSafe ? `common-electives/26-27/outlines/${outlineSafe}` : null,
      outlineFile,
      outlineSafe,
      confirmOnSelect: otherRequirements.length > 0,
      dayPattern: dayPatternFrom(meetingRaw, meetings),
      timeBucket: timeBucket(start),
      meetingDays: meetingDaysFrom(meetings.map(m => m.date)),
      meetings,
    })
  }

  return { courses, prerequisiteIndex, generatedAt: new Date().toISOString(), source: '2026-11-common-elective' }
}

function isDetailedVenue(v) {
  if (!v) return false
  const s = String(v)
  // Generic campus-only labels from the CE table
  if (/^(Cyberport|Admiralty Town Centre|Main Campus|Shanghai Centre|Shenzhen Centre|TBC)\b/i.test(s) && !/[A-Z]?\d{2,}|Classroom|LT|LE|CP-|MC-/.test(s)) {
    return false
  }
  return /CP-|MC-|LT|Classroom|[A-Z]\d{2,}|LE\d|Room/i.test(s) || s.length > 20
}

function copyOutlineIntoPack(packId, entry) {
  const safe = entry.outlineSafe || entry.outlineFile
  if (!safe) return null
  const src = path.join(OUTLINES_DIR, safe)
  if (!fs.existsSync(src)) return null
  const destDir = path.join(root, 'public', packId, 'courseOutline', 'CE')
  fs.mkdirSync(destDir, { recursive: true })
  const dest = path.join(destDir, safe)
  if (!fs.existsSync(dest) || fs.statSync(dest).size !== fs.statSync(src).size) {
    fs.copyFileSync(src, dest)
  }
  return `courseOutline/CE/${safe}`
}

function toPackCourse(entry, { asCommonElective, packId }) {
  const outlinePdfPath =
    (packId && copyOutlineIntoPack(packId, entry)) ||
    (entry.outlinePdfPath
      ? entry.outlinePdfPath.startsWith('/')
        ? entry.outlinePdfPath
        : `/${entry.outlinePdfPath}`
      : null)

  const section = {
    sectionId: entry.sectionId || 'A',
    instructors: entry.instructors.length
      ? entry.instructors
      : [{ name: 'TBC' }],
    timeBucket: entry.timeBucket || 'AM',
    dayPattern: entry.dayPattern || '',
    meetingDays: entry.meetingDays || [],
    outlinePdfPath,
    meetings: entry.meetings.map(m => {
      const row = {
        date: m.date,
        startTime: m.startTime,
        endTime: m.endTime,
        venue: m.venue,
        sessionType: m.sessionType || 'lecture',
      }
      if (m.instructors?.length) row.instructors = m.instructors
      return row
    }),
  }

  const course = {
    courseCode: entry.courseCode,
    courseTitle: entry.courseTitle,
    module: entry.module,
    courseType: asCommonElective ? 'Common Elective' : 'Elective',
    streamTags: [],
    outlinePdfPath,
    examOrFinal: null,
    sections: [section],
  }

  if (asCommonElective) {
    course.commonElective = true
    course.hostProgramme = entry.hostProgramme
  }
  if (entry.otherRequirements?.length) {
    course.otherRequirements = entry.otherRequirements
  }
  if (entry.crossList?.length) {
    course.crossList = entry.crossList
  }
  return course
}

function mergeVenuePreserve(existingCourse, incoming) {
  if (!existingCourse?.sections?.[0]?.meetings?.length) return incoming
  const out = structuredClone(incoming)
  const byDate = new Map()
  for (const s of existingCourse.sections) {
    for (const m of s.meetings) {
      byDate.set(`${m.date}|${m.startTime}|${m.endTime}`, m.venue)
      byDate.set(m.date, m.venue) // fallback by date
    }
  }
  for (const s of out.sections) {
    for (const m of s.meetings) {
      const exact = byDate.get(`${m.date}|${m.startTime}|${m.endTime}`)
      const byD = byDate.get(m.date)
      const prev = exact || byD
      if (prev && isDetailedVenue(prev) && !isDetailedVenue(m.venue)) {
        m.venue = prev
      }
    }
  }
  return out
}

function upsertCourseList(list, course, { replaceMeetings }) {
  const idx = list.findIndex(
    c => c.courseCode === course.courseCode && c.module === course.module,
  )
  if (idx < 0) {
    list.push(course)
    return
  }
  const prev = list[idx]
  if (!replaceMeetings) {
    // Host: preserve type/tags; update meetings/outline/instructors with venue preserve
    const merged = mergeVenuePreserve(prev, {
      ...course,
      courseType: prev.courseType,
      streamTags: prev.streamTags || [],
      courseTypes: prev.courseTypes,
      offeredToStreams: prev.offeredToStreams,
      capstoneForStreams: prev.capstoneForStreams,
      streamCoreForStreams: prev.streamCoreForStreams,
      coreForStreams: prev.coreForStreams,
      commonElective: undefined,
      hostProgramme: undefined,
    })
    delete merged.commonElective
    // Keep existing detailed outline if incoming null
    if (!merged.outlinePdfPath && prev.outlinePdfPath) {
      merged.outlinePdfPath = prev.outlinePdfPath
      for (const s of merged.sections) {
        if (!s.outlinePdfPath) s.outlinePdfPath = prev.outlinePdfPath
      }
    }
    // Prefer existing section set if multiple subclasses and CE only brings one
    if (prev.sections.length > 1 && course.sections.length === 1) {
      const want = course.sections[0].sectionId
      const hit = prev.sections.find(s => s.sectionId === want)
      if (hit) {
        // Update only that subclass meetings from CE, preserve others
        const updatedSections = prev.sections.map(s => {
          if (s.sectionId !== want) return s
          const incoming = mergeVenuePreserve(
            { sections: [s] },
            { sections: course.sections },
          ).sections[0]
          return {
            ...s,
            instructors: course.sections[0].instructors?.length
              ? course.sections[0].instructors
              : s.instructors,
            meetings: incoming.meetings,
            dayPattern: course.sections[0].dayPattern || s.dayPattern,
            timeBucket: course.sections[0].timeBucket || s.timeBucket,
            outlinePdfPath: course.outlinePdfPath || s.outlinePdfPath,
          }
        })
        list[idx] = {
          ...prev,
          outlinePdfPath: course.outlinePdfPath || prev.outlinePdfPath,
          sections: updatedSections,
          otherRequirements: course.otherRequirements || prev.otherRequirements,
          crossList: course.crossList || prev.crossList,
        }
        return
      }
    }
    list[idx] = {
      ...merged,
      otherRequirements: course.otherRequirements || prev.otherRequirements,
      crossList: [...new Set([...(prev.crossList || []), ...(course.crossList || [])])],
    }
    if (!list[idx].crossList.length) delete list[idx].crossList
    if (!list[idx].otherRequirements?.length) delete list[idx].otherRequirements
    return
  }
  // CE guest: replace
  list[idx] = mergeVenuePreserve(prev, course)
}

function ensureAntirequisite(rules, courseCode, whenSelected) {
  const existing = rules.find(
    r =>
      r.type === 'antirequisite' &&
      r.courseCode === courseCode &&
      JSON.stringify([...(r.whenSelected || [])].sort()) ===
        JSON.stringify([...whenSelected].sort()),
  )
  if (existing) return
  const y = whenSelected.join(whenSelected.length > 1 ? ' or ' : '')
  rules.push({
    type: 'antirequisite',
    courseCode,
    whenSelected: [...whenSelected],
    messageZh: `${courseCode}对已选${whenSelected.join('或')}的学生不开放`,
    message: `${courseCode} cannot be selected when ${y} has been chosen`,
  })
}

function addBidirectionalAntireq(rules, a, b) {
  ensureAntirequisite(rules, a, [b])
  ensureAntirequisite(rules, b, [a])
}

function mergeIntoPacks(index) {
  const stubCourses = []

  // Prerequisite + cross-list index stubs
  for (const p of index.prerequisiteIndex || []) {
    stubCourses.push({
      courseCode: p.courseCode,
      courseTitle: p.title || p.courseCode,
      module: 0,
      courseType: 'Elective',
      streamTags: [],
      outlinePdfPath: null,
      examOrFinal: null,
      sections: [],
      indexOnly: true,
    })
  }
  for (const code of ['MACC7024', 'PMAA7015', 'IMBA6114', 'PMBA6110', 'PMBA6100', 'MSMK7013', 'IMBA6034', 'MSAF7026', 'MSAF7017', 'MSAF7019', 'PMAA7008', 'MACC7023', 'PMAA7022', 'MSAF7008']) {
    if (!stubCourses.find(c => c.courseCode === code) && !index.courses.find(c => c.courseCode === code)) {
      stubCourses.push({
        courseCode: code,
        courseTitle: code,
        module: 0,
        courseType: 'Elective',
        streamTags: [],
        outlinePdfPath: null,
        examOrFinal: null,
        sections: [],
        indexOnly: true,
        crossList: CROSS_LIST_PAIRS.filter(([a, b]) => a === code || b === code).flatMap(([a, b]) =>
          a === code ? [b] : [a],
        ),
      })
    }
  }

  for (const packId of LIVE_PACKS) {
    const coursesPath = path.join(root, 'public', packId, 'courses.json')
    const reqPath = path.join(root, 'public', packId, 'requirements.json')
    const list = JSON.parse(fs.readFileSync(coursesPath, 'utf8'))
    const req = JSON.parse(fs.readFileSync(reqPath, 'utf8'))
    if (!Array.isArray(req.enrollmentRules)) req.enrollmentRules = []

    for (const entry of index.courses) {
      const isHost = PACK_HOST_PREFIX[packId].test(entry.courseCode)
      const blocked = entry.notOpenTo?.includes(packId)

      if (isHost) {
        // Update host course; do not mark CE
        const packCourse = toPackCourse(entry, { asCommonElective: false, packId })
        // Restore host courseType from existing if present
        upsertCourseList(list, packCourse, { replaceMeetings: false })
        continue
      }

      if (blocked) continue

      const ce = toPackCourse(entry, { asCommonElective: true, packId })
      upsertCourseList(list, ce, { replaceMeetings: true })

      if (entry.prerequisites?.length) {
        const requires = entry.prerequisites.map(p => p.courseCode)
        const prev = req.enrollmentRules.find(
          r => r.type === 'prerequisite' && r.courseCode === entry.courseCode,
        )
        if (!prev) {
          req.enrollmentRules.push({
            type: 'prerequisite',
            courseCode: entry.courseCode,
            requires,
            messageZh: `${entry.courseCode} 需先满足先修：${requires.join('、')}`,
            message: `${entry.courseCode} requires ${requires.join(', ')} first`,
          })
        }
      }

      for (const other of entry.remarkAntirequisites || []) {
        addBidirectionalAntireq(req.enrollmentRules, entry.courseCode, other)
      }
    }

    // Cross-list / equivalent pairs — both directions in every pack that can see either side
    for (const [a, b] of CROSS_LIST_PAIRS) {
      const hasA = list.some(c => c.courseCode === a && !c.indexOnly)
      const hasB = list.some(c => c.courseCode === b && !c.indexOnly)
      if (hasA || hasB) addBidirectionalAntireq(req.enrollmentRules, a, b)
      // Annotate crossList on existing courses
      for (const c of list) {
        if (c.courseCode === a) {
          c.crossList = [...new Set([...(c.crossList || []), b])]
        }
        if (c.courseCode === b) {
          c.crossList = [...new Set([...(c.crossList || []), a])]
        }
      }
    }

    // Index-only stubs for missing antireq / prereq targets (no meetings — hidden from calendar but known)
    // Skip adding indexOnly into courses.json to avoid empty calendar noise; prerequisites still work as codes in rules.
    // Store stubs in master index only.

    fs.writeFileSync(coursesPath, JSON.stringify(list, null, 2) + '\n')
    fs.writeFileSync(reqPath, JSON.stringify(req, null, 2) + '\n')
    console.log(`[merge] ${packId}: ${list.length} courses, ${req.enrollmentRules.length} rules`)
  }

  return stubCourses
}

async function main() {
  const args = new Set(process.argv.slice(2))
  const parseOnly = args.has('--parse-only')
  const mergeOnly = args.has('--merge-only')

  fs.mkdirSync(OUTLINES_DIR, { recursive: true })

  let index
  if (!mergeOnly) {
    if (!fs.existsSync(SHEET)) {
      console.error('Missing sheet HTML at', SHEET)
      process.exit(1)
    }
    index = parseSheet()
    console.log(`[parse] ${index.courses.length} courses, ${index.prerequisiteIndex.length} prereq stubs`)

    for (const c of index.courses) {
      if (!c.outlineFile) continue
      const result = await downloadOutlineFile(c.outlineFile, c.outlineSourceUrl)
      if (result.ok) {
        if (result.safeName && result.safeName !== c.outlineSafe) {
          c.outlineSafe = result.safeName
          c.outlinePdfPath = `common-electives/26-27/outlines/${result.safeName}`
        }
        console.log(`  PDF ${c.courseCode} ${result.skipped ? 'cached' : `saved ${result.bytes}B`}`)
      } else {
        console.warn(`  PDF FAIL ${c.courseCode} ${c.outlineFile}`)
      }
    }

    fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + '\n')
    console.log('[parse] wrote', INDEX_PATH)
  } else {
    index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'))
  }

  if (!parseOnly) {
    mergeIntoPacks(index)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
