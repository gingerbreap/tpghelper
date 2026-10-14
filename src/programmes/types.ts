/**
 * Thin multi-programme shell contract.
 * Build selects one active pack via PROGRAMME=msba|mgm|mecon.
 */
export type ProgrammeId = 'msba' | 'mgm' | 'mecon'

export interface ProgrammeFeatureFlags {
  /** Alternate / wishlist list on Planner (unified BA + MGM). */
  wishlist: boolean
  /**
   * Group the *selected* list by Core / Elective / Capstone.
   * Wishlist grouping is always on when `wishlist` is enabled.
   */
  groupSelectedByType: boolean
  /** Teaching Plan impact visualization on calendar/planner. */
  teachingPlanImpactCalendar: boolean
  /**
   * Enrollment rules from requirements.json: mutual exclusion,
   * allowMultiModule, prerequisite, antirequisite, etc.
   */
  enrollmentRules: boolean
  /**
   * MEcon: student must pick a stream before planner calendar / lists unlock.
   * Omit or false for programmes without forced stream selection.
   */
  requireStreamSelection?: boolean
}

export interface ProgrammeStorageKeys {
  selections: string
  wishlist?: string
  /** @deprecated Legacy MGM key; useWishlist migrates into `wishlist`. */
  backup?: string
  locale: string
  defaultLanding: string
  syncTzMode: string
  icsExportFormat: string
  /** Forced stream id (e.g. mecon ARS/THY/DA/PL). */
  selectedStream?: string
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

/** Planner grouping / badge types. MEcon also uses Stream Core. */
export type ProgrammeCourseType = 'Core' | 'Stream Core' | 'Elective' | 'Capstone'

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
  /**
   * Display / grouping order for Core · Elective · Capstone on Planner
   * (selected list when grouped + wishlist). Labels come from i18n.
   */
  selectionTypeOrder: readonly ProgrammeCourseType[]
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
