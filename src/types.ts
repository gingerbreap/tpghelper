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
  courseType: 'Core' | 'Elective' | 'Capstone'
  streamTags: string[]
  /** Null when instructors have their own per-class outlines (see Section). */
  outlinePdfPath: string | null
  examOrFinal: ExamOrFinal | null
  sections: Section[]
}

/** CES Study Status / manual enrollment flag on a selection. */
export type EnrollmentStatus = 'registered' | 'waiting'

export interface SelectedSection {
  courseCode: string
  courseTitle: string
  module: number
  courseType: string
  sectionId: string
  instructor: string
  /**
   * Registered (default when omitted) vs Waiting / waitlist.
   * Shared by Planner calendar badges and Calendar-page filtering.
   */
  enrollmentStatus?: EnrollmentStatus
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

export type EnrollmentRuleType = 'mutualExclusion' | 'allowMultiModule'

export interface EnrollmentRule {
  type: EnrollmentRuleType
  /** Courses subject to mutual exclusion (mutualExclusion). */
  courses?: string[]
  /** Single course allowed across multiple modules (allowMultiModule). */
  courseCode?: string
  /** Module numbers that may each hold a selection (allowMultiModule). */
  modules?: number[]
  /** When true, selections across listed modules count as one course (allowMultiModule). */
  countsAsOneCourse?: boolean
  scope?: string
  message?: string
  messageZh?: string
}

export interface Requirements {
  totalCourses: number
  creditsPerCourse: number
  coreCourses: string[]
  capstoneCourses: { courseCode: string; courseTitle: string }[]
  streams: Record<string, Stream>
  electiveCount: number
  enrollmentRules?: EnrollmentRule[]
  notes: string[]
  planningRules: string[]
}
