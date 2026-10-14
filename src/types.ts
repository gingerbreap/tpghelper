export interface Instructor {
  name: string
  /** Role note from the teaching plan, e.g. "First 5 lectures". */
  note?: string
}

export interface Meeting {
  date: string
  startTime: string
  endTime: string
  venue: string
  sessionType: 'lecture' | 'tutorial'
  /**
   * Instructors for this specific meeting. Only set when the teaching plan
   * splits a class between instructors; otherwise the section's apply.
   */
  instructors?: string[]
  /**
   * Lecture subclass ids this tutorial belongs to (e.g. ["A","B"] or ["C"]).
   * Tutorials are still duplicated onto each applicable section for calendar /
   * conflicts; this field records the Teaching Plan grouping (shared cell vs
   * per-class). Omit on lectures.
   */
  tutorialFor?: string[]
}

export type ExamKind = 'exam' | 'presentation' | 'midterm' | 'other'

export interface ExamOrFinal {
  kind: ExamKind
  date: string | null
  startTime: string | null
  endTime: string | null
  venue: string | null
  /** Human-readable label from the teaching plan (for timetable / detail). */
  raw: string
}

export interface Section {
  sectionId: string
  /** A class may be taught by one or several instructors. */
  instructors: Instructor[]
  /**
   * Part id for multi-part courses (e.g. "I" / "II" for ECON6067).
   * Detail tabs may show "Part I: Dr. …".
   */
  part?: string
  timeBucket: 'AM' | 'PM' | 'NT' | 'TBC'
  /** "Class Day & Time" as printed in the teaching plan. */
  dayPattern: string
  /** Weekdays (0 = Sunday) the class normally meets. Display only. */
  meetingDays: number[]
  outlinePdfPath: string | null
  meetings: Meeting[]
  /** Section-specific exam/presentation when it differs by class. */
  examOrFinal?: ExamOrFinal | null
}

export interface Course {
  courseCode: string
  courseTitle: string
  module: number
  courseType: 'Core' | 'Stream Core' | 'Elective' | 'Capstone'
  /**
   * Extra type badges when a course can satisfy more than one category
   * (e.g. Theory Stream ECON6077/6078 → Stream Core + Capstone).
   * Primary grouping uses `courseType`.
   */
  courseTypes?: Array<'Core' | 'Stream Core' | 'Elective' | 'Capstone'>
  streamTags: string[]
  /**
   * Streams for which this course is Core / Stream Core / Capstone in the TP.
   * Empty or omitted = not stream-gated (typical Elective / "for all" Core).
   * Values: ARS | THY | DA | PL (MEcon).
   */
  offeredToStreams?: string[]
  /**
   * Streams for which this course counts as Capstone.
   * When omitted and courseType/courseTypes include Capstone, falls back to
   * `offeredToStreams` (or all streams if that is empty).
   */
  capstoneForStreams?: string[]
  /**
   * Streams for which this course counts as Stream Core (dual-role courses).
   * When omitted and type includes Stream Core, falls back to `offeredToStreams`.
   */
  streamCoreForStreams?: string[]
  /**
   * Streams for which this course counts as Fundamental Core.
   * When omitted and courseType is Core, falls back to `offeredToStreams`
   * (empty offeredToStreams = Core for all).
   */
  coreForStreams?: string[]
  /**
   * Multi-part courses (e.g. ECON6067 Part I / II). Sections may also carry
   * `part` for tab labels.
   */
  parts?: Array<{ id: string; label: string }>
  /** Null when instructors have their own per-class outlines (see Section). */
  outlinePdfPath: string | null
  examOrFinal: ExamOrFinal | null
  sections: Section[]
}

/** CES Study Status / manual enrollment flag on a selection. */
export type CourseStatus = 'registered' | 'waitlist' | 'failed'

/** @deprecated Use CourseStatus */
export type EnrollmentStatus = CourseStatus

export interface SelectedSection {
  courseCode: string
  courseTitle: string
  module: number
  courseType: string
  sectionId: string
  instructor: string
  /**
   * Required enrollment status. `failed` is reserved (not used in UI yet).
   * Legacy `enrollmentStatus` / `waiting` are migrated on load.
   */
  status: CourseStatus
}

export interface StreamList {
  name: string
  minRequired: number
  courses: string[]
}

/** ESG-style flat list, or legacy AI/MC nested lists (listA–listD). */
export interface Stream {
  name: string
  description: string
  minRequired?: number
  courses?: string[]
  [key: string]: string | number | string[] | StreamList | undefined
}

export type EnrollmentRuleType =
  | 'mutualExclusion'
  | 'allowMultiModule'
  | 'prerequisite'
  | 'antirequisite'

export interface EnrollmentRule {
  type: EnrollmentRuleType
  /** Courses subject to mutual exclusion (mutualExclusion). */
  courses?: string[]
  /** Target course (allowMultiModule, prerequisite, antirequisite). */
  courseCode?: string
  /** Prerequisite codes that must be in the plan before selecting courseCode (prerequisite). */
  requires?: string[]
  /** If any of these codes are already selected, courseCode cannot be chosen (antirequisite). */
  whenSelected?: string[]
  /** Module numbers that may each hold a selection (allowMultiModule). */
  modules?: number[]
  /** When true, selections across listed modules count as one course (allowMultiModule). */
  countsAsOneCourse?: boolean
  scope?: string
  message?: string
  messageZh?: string
}

export interface CoreOptionGroup {
  name: string
  options: string[]
}

export interface CoreTrack {
  label: string
  streams: string[]
  groups: CoreOptionGroup[]
}

export interface CapstoneOption {
  courseCode: string
  courseTitle: string
  credits?: number
}

export interface Requirements {
  totalCourses: number
  creditsPerCourse: number
  /** Programme total credits (e.g. MEcon 60). */
  totalCredits?: number
  coreRequired?: number
  streamCoreRequired?: number
  capstoneRequired?: number
  coreCourses: string[]
  /** MEcon: Fundamental Core choices grouped by stream track. */
  coreTracks?: CoreTrack[]
  capstoneCourses: CapstoneOption[]
  /** MEcon: Capstone options per stream id. */
  capstoneByStream?: Record<string, CapstoneOption[]>
  streams: Record<string, Stream>
  electiveCount: number
  enrollmentRules?: EnrollmentRule[]
  notes: string[]
  planningRules: string[]
}
