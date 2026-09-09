/**
 * Thin multi-programme shell contract.
 * Build selects one active pack via PROGRAMME=msba|mgm.
 */
export type ProgrammeId = 'msba' | 'mgm'

export interface ProgrammeFeatureFlags {
  /** Planner wishlist (BA). MGM uses backup selections instead. */
  wishlist: boolean
  /** Backup / alternate plan slots (MGM). */
  backupSelections: boolean
  /** Teaching Plan impact visualization on calendar/planner. */
  teachingPlanImpactCalendar: boolean
  /** Enrollment rules (mutual exclusion / multi-module). */
  enrollmentRules: boolean
}

export interface ProgrammeStorageKeys {
  selections: string
  wishlist?: string
  backup?: string
  locale: string
  defaultLanding: string
  syncTzMode: string
  icsExportFormat: string
}

export interface ProgrammeStudyStatusConfig {
  /** Example course code shown in the Study Status paste placeholder. */
  sampleCourseCode: string
  /** Regex source for course codes in Study Status paste (without flags). */
  courseCodePattern: string
}

export interface ProgrammeIcsConfig {
  prodId: string
  uidDomain: string
  filename: string
}

export interface ProgrammeConfig {
  id: ProgrammeId
  /** Short display name, e.g. MSc(BA) */
  shortName: string
  /** Document / package title stem */
  titleStem: string
  /** Vite `base` used for GitHub Pages project sites (override on Azure). */
  viteBase: string
  /** Fallback repo URL when build define is missing */
  repoUrl: string
  /** Analytics measurement id (gtag) */
  analyticsId: string
  moduleCount: number
  moduleNumbers: readonly number[]
  /** Stream ids used in requirements.json */
  streamIds: readonly string[]
  /** Public JSON paths relative to BASE_URL (programme publicDir root) */
  coursesDataPath: string
  requirementsDataPath: string
  storage: ProgrammeStorageKeys
  features: ProgrammeFeatureFlags
  /** Programme Office sync stamp (HKT) */
  dataSync: { display: string; iso: string }
  studyStatus: ProgrammeStudyStatusConfig
  ics: ProgrammeIcsConfig
}
