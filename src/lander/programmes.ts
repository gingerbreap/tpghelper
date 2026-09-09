/** Catalogue shown on the universal lander programme picker. */
export type LanderProgrammeId =
  | 'macct'
  | 'maa'
  | 'maib'
  | 'mecon'
  | 'mfwm'
  | 'mfin'
  | 'mffintech'
  | 'mgm'
  | 'msba'
  | 'msmkt'
  | 'msaf'
  | 'mwm'

export interface LanderProgramme {
  id: LanderProgrammeId
  /** i18n key under `programmes.items.<id>` */
  nameKey: string
  /** Absolute path to the programme app (GitHub Pages / Azure). */
  appPath: string | null
  available: boolean
}

export const LANDER_PROGRAMMES: readonly LanderProgramme[] = [
  {
    id: 'macct',
    nameKey: 'programmes.items.macct',
    appPath: null,
    available: false,
  },
  {
    id: 'maa',
    nameKey: 'programmes.items.maa',
    appPath: null,
    available: false,
  },
  {
    id: 'maib',
    nameKey: 'programmes.items.maib',
    appPath: null,
    available: false,
  },
  {
    id: 'mecon',
    nameKey: 'programmes.items.mecon',
    appPath: null,
    available: false,
  },
  {
    id: 'mfwm',
    nameKey: 'programmes.items.mfwm',
    appPath: null,
    available: false,
  },
  {
    id: 'mfin',
    nameKey: 'programmes.items.mfin',
    appPath: null,
    available: false,
  },
  {
    id: 'mffintech',
    nameKey: 'programmes.items.mffintech',
    appPath: null,
    available: false,
  },
  {
    id: 'mgm',
    nameKey: 'programmes.items.mgm',
    appPath: '/tpghelper/mgm/',
    available: true,
  },
  {
    id: 'msba',
    nameKey: 'programmes.items.msba',
    appPath: '/tpghelper/msba/',
    available: true,
  },
  {
    id: 'msmkt',
    nameKey: 'programmes.items.msmkt',
    appPath: null,
    available: false,
  },
  {
    id: 'msaf',
    nameKey: 'programmes.items.msaf',
    appPath: null,
    available: false,
  },
  {
    id: 'mwm',
    nameKey: 'programmes.items.mwm',
    appPath: null,
    available: false,
  },
] as const

export function getLanderProgramme(id: LanderProgrammeId): LanderProgramme | undefined {
  return LANDER_PROGRAMMES.find(p => p.id === id)
}
