/**
 * Import public/{msba,mgm,mecon}/courses.json into Azure SQL catalogue tables.
 *
 * Requires Entra auth (az login / VS Code Azure / Managed Identity) and:
 *   SQL_SERVER, SQL_DATABASE=tpghelper, SQL_AUTH=entra, ACADEMIC_YEAR=26-27
 *
 * Usage: npm run db:import-courses
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sql from 'mssql'
import { DefaultAzureCredential } from '@azure/identity'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const PROGRAMMES = ['msba', 'mgm', 'mecon']
const year = process.env.ACADEMIC_YEAR || '26-27'
const server = process.env.SQL_SERVER
const database = process.env.SQL_DATABASE || 'tpghelper'

if (!server) {
  console.error('Set SQL_SERVER (and az login) before importing.')
  process.exit(1)
}

function splitCode(courseCode) {
  const m = String(courseCode).match(/^([A-Za-z]+)(\d+)$/)
  if (!m) return { prefix: courseCode, number: '' }
  return { prefix: m[1], number: m[2] }
}

function j(value) {
  if (value === undefined) return null
  return JSON.stringify(value)
}

async function connect() {
  const credential = new DefaultAzureCredential()
  const { token } = await credential.getToken('https://database.windows.net/.default')
  return sql.connect({
    server,
    database,
    authentication: {
      type: 'azure-active-directory-access-token',
      options: { token },
    },
    options: { encrypt: true },
  })
}

async function ensureCourse(tx, courseCode, courseTitle) {
  const { prefix, number } = splitCode(courseCode)
  await tx
    .request()
    .input('year', sql.NVarChar(10), year)
    .input('code', sql.NVarChar(32), courseCode)
    .input('prefix', sql.NVarChar(16), prefix)
    .input('number', sql.NVarChar(16), number)
    .input('title', sql.NVarChar(500), courseTitle)
    .query(`
      MERGE dbo.Course AS t
      USING (SELECT @year AS AcademicYear, @code AS CourseCode) AS s
        ON t.AcademicYear = s.AcademicYear AND t.CourseCode = s.CourseCode
      WHEN MATCHED THEN UPDATE SET CourseTitle = @title, CoursePrefix = @prefix,
        CourseNumber = @number, UpdatedAt = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN INSERT (AcademicYear, CourseCode, CoursePrefix, CourseNumber, CourseTitle)
        VALUES (@year, @code, @prefix, @number, @title);
    `)
}

async function upsertOffering(tx, hostProgramme, course) {
  const result = await tx
    .request()
    .input('year', sql.NVarChar(10), year)
    .input('code', sql.NVarChar(32), course.courseCode)
    .input('module', sql.Int, course.module)
    .input('host', sql.NVarChar(16), hostProgramme)
    .input('exam', sql.NVarChar(sql.MAX), j(course.examOrFinal ?? null))
    .input('parts', sql.NVarChar(sql.MAX), j(course.parts))
    .query(`
      MERGE dbo.Offering AS t
      USING (SELECT @year AS AcademicYear, @code AS CourseCode, @module AS Module) AS s
        ON t.AcademicYear = s.AcademicYear AND t.CourseCode = s.CourseCode AND t.Module = s.Module
      WHEN MATCHED THEN UPDATE SET HostProgramme = @host, ExamOrFinalJson = @exam, PartsJson = @parts
      WHEN NOT MATCHED THEN INSERT (AcademicYear, CourseCode, Module, HostProgramme, ExamOrFinalJson, PartsJson)
        VALUES (@year, @code, @module, @host, @exam, @parts)
      OUTPUT inserted.OfferingId;
    `)
  return result.recordset[0].OfferingId
}

async function replaceSections(tx, offeringId, hostProgramme, sections) {
  await tx
    .request()
    .input('offeringId', sql.UniqueIdentifier, offeringId)
    .query(`
      DELETE FROM dbo.Meeting WHERE SectionRowId IN (
        SELECT SectionRowId FROM dbo.Section WHERE OfferingId = @offeringId
      );
      DELETE FROM dbo.Section WHERE OfferingId = @offeringId;
    `)

  for (const section of sections || []) {
    const outlinePath = section.outlinePdfPath || null
    const ins = await tx
      .request()
      .input('offeringId', sql.UniqueIdentifier, offeringId)
      .input('sectionId', sql.NVarChar(8), section.sectionId)
      .input('part', sql.NVarChar(16), section.part ?? null)
      .input('instructors', sql.NVarChar(sql.MAX), j(section.instructors || []))
      .input('timeBucket', sql.NVarChar(8), section.timeBucket || 'TBC')
      .input('dayPattern', sql.NVarChar(200), section.dayPattern ?? null)
      .input('meetingDays', sql.NVarChar(100), j(section.meetingDays || []))
      .input('outline', sql.NVarChar(1000), outlinePath)
      .input('exam', sql.NVarChar(sql.MAX), j(section.examOrFinal))
      .query(`
        INSERT INTO dbo.Section (
          OfferingId, SectionId, Part, InstructorsJson, TimeBucket, DayPattern,
          MeetingDaysJson, OutlinePdfPath, ExamOrFinalJson
        )
        OUTPUT inserted.SectionRowId
        VALUES (
          @offeringId, @sectionId, @part, @instructors, @timeBucket, @dayPattern,
          @meetingDays, @outline, @exam
        );
      `)
    const sectionRowId = ins.recordset[0].SectionRowId

    for (const meeting of section.meetings || []) {
      const dateStr = String(meeting.date || '')
      const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
      const y = ymd ? Number(ymd[1]) : 0
      const mo = ymd ? Number(ymd[2]) : 0
      const day = ymd ? Number(ymd[3]) : 0
      const asUtc = ymd ? new Date(Date.UTC(y, mo - 1, day)) : null
      const validDate =
        asUtc &&
        asUtc.getUTCFullYear() === y &&
        asUtc.getUTCMonth() + 1 === mo &&
        asUtc.getUTCDate() === day
      if (!validDate) {
        console.warn(
          `[skip meeting] invalid date "${meeting.date}" section=${section.sectionId}`,
        )
        continue
      }
      await tx
        .request()
        .input('sectionRowId', sql.UniqueIdentifier, sectionRowId)
        .input('date', sql.Date, dateStr)
        .input('start', sql.NVarChar(8), meeting.startTime)
        .input('end', sql.NVarChar(8), meeting.endTime)
        .input('venue', sql.NVarChar(200), meeting.venue ?? null)
        .input('sessionType', sql.NVarChar(20), meeting.sessionType)
        .input('instructors', sql.NVarChar(sql.MAX), j(meeting.instructors))
        .input('tutorialFor', sql.NVarChar(sql.MAX), j(meeting.tutorialFor))
        .query(`
          INSERT INTO dbo.Meeting (
            SectionRowId, MeetingDate, StartTime, EndTime, Venue, SessionType,
            InstructorsJson, TutorialForJson
          ) VALUES (
            @sectionRowId, @date, @start, @end, @venue, @sessionType,
            @instructors, @tutorialFor
          );
        `)
    }
  }
}

async function upsertProgrammeCourse(tx, programmeId, course) {
  await tx
    .request()
    .input('programmeId', sql.NVarChar(16), programmeId)
    .input('year', sql.NVarChar(10), year)
    .input('code', sql.NVarChar(32), course.courseCode)
    .input('module', sql.Int, course.module)
    .input('courseType', sql.NVarChar(32), course.courseType)
    .input('courseTypes', sql.NVarChar(sql.MAX), j(course.courseTypes))
    .input('streamTags', sql.NVarChar(sql.MAX), j(course.streamTags || []))
    .input('offeredTo', sql.NVarChar(sql.MAX), j(course.offeredToStreams))
    .input('capstoneFor', sql.NVarChar(sql.MAX), j(course.capstoneForStreams))
    .input('streamCoreFor', sql.NVarChar(sql.MAX), j(course.streamCoreForStreams))
    .input('coreFor', sql.NVarChar(sql.MAX), j(course.coreForStreams))
    .query(`
      MERGE dbo.ProgrammeCourse AS t
      USING (SELECT @programmeId AS ProgrammeId, @year AS AcademicYear,
                    @code AS CourseCode, @module AS Module) AS s
        ON t.ProgrammeId = s.ProgrammeId AND t.AcademicYear = s.AcademicYear
       AND t.CourseCode = s.CourseCode AND t.Module = s.Module
      WHEN MATCHED THEN UPDATE SET
        CourseType = @courseType,
        CourseTypesJson = @courseTypes,
        StreamTagsJson = @streamTags,
        OfferedToStreamsJson = @offeredTo,
        CapstoneForStreamsJson = @capstoneFor,
        StreamCoreForStreamsJson = @streamCoreFor,
        CoreForStreamsJson = @coreFor
      WHEN NOT MATCHED THEN INSERT (
        ProgrammeId, AcademicYear, CourseCode, Module, CourseType, CourseTypesJson,
        StreamTagsJson, OfferedToStreamsJson, CapstoneForStreamsJson,
        StreamCoreForStreamsJson, CoreForStreamsJson
      ) VALUES (
        @programmeId, @year, @code, @module, @courseType, @courseTypes,
        @streamTags, @offeredTo, @capstoneFor, @streamCoreFor, @coreFor
      );
    `)
}

async function importProgramme(pool, programmeId) {
  const file = path.join(root, 'public', programmeId, 'courses.json')
  if (!fs.existsSync(file)) {
    console.warn(`[skip] missing ${file}`)
    return { programmeId, count: 0 }
  }
  const courses = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (!Array.isArray(courses)) throw new Error(`Invalid JSON array: ${file}`)

  const tx = new sql.Transaction(pool)
  await tx.begin()
  try {
    for (const course of courses) {
      await ensureCourse(tx, course.courseCode, course.courseTitle)
      const offeringId = await upsertOffering(tx, programmeId, course)
      await replaceSections(tx, offeringId, programmeId, course.sections)
      // course-level outline: stamp onto sections missing outline
      if (course.outlinePdfPath) {
        await tx
          .request()
          .input('offeringId', sql.UniqueIdentifier, offeringId)
          .input('outline', sql.NVarChar(1000), course.outlinePdfPath)
          .query(`
            UPDATE dbo.Section
            SET OutlinePdfPath = COALESCE(OutlinePdfPath, @outline)
            WHERE OfferingId = @offeringId AND OutlinePdfPath IS NULL;
          `)
      }
      await upsertProgrammeCourse(tx, programmeId, course)
    }
    await tx.commit()
  } catch (err) {
    await tx.rollback()
    throw err
  }
  return { programmeId, count: courses.length }
}

const pool = await connect()
console.log(`Connected to ${server}/${database}; year=${year}`)
try {
  for (const id of PROGRAMMES) {
    const result = await importProgramme(pool, id)
    console.log(`Imported ${result.count} course objects for ${result.programmeId}`)
  }
} finally {
  await sql.close()
}
console.log('Done.')
