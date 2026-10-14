import type { TranslationTree } from '../../../i18n/types'

const overlay: TranslationTree = {
  meta: {
    title: 'HKU MEcon Course Planner',
  },
  nav: {
    brand: 'HKU MEcon Course Planner',
  },
  footer: {
    disclaimer1:
      'Timetable data is sourced from the MEcon Programme Office Teaching Plan 2026-27. Graduation and stream requirements are sourced from the Regulations & Syllabuses. For the last sync/verification time against Programme Office materials, see the About page. All content is provided as-is.',
  },
  planner: {
    streamProgress: 'Stream progress',
    currentStream: 'Current stream',
    streamSelectHint:
      'Select a stream to unlock the planner calendar and course lists below.',
    switchStream: 'Switch stream',
    streamSwitchTitle: 'Switch stream',
    streamSwitchWarning:
      'Before switching streams, please confirm with the Programme Office whether it is allowed and which courses are required!',
    streamPolicyPrompt:
      'For courses not in the requirement lists of the newly selected stream:',
    streamPolicyChoose: 'Please select',
    streamPolicyDeleteRelated: 'Delete all related selections',
    streamPolicyDeleteCoreScElective:
      'Delete related Core; treat related Stream Core as Elective',
    streamPolicyKeepCoreScElective:
      'Keep all Core; treat Stream Core as Elective',
    streamPolicyAllElective: 'Treat all as Elective',
    streamPreviewTitle: 'Change preview',
    streamPreviewEmpty: 'No selection changes under this policy.',
    streamPreviewCode: 'Code',
    streamPreviewTitleCol: 'Course title',
    streamPreviewCurrent: 'Current',
    streamPreviewNext: 'After switch',
    groupCore: 'Core',
    groupStreamCore: 'Stream Core',
    groupCapstone: 'Capstone',
    groupElective: 'Electives',
    streamArs: 'Advanced Research Stream',
    streamThy: 'Theory Stream',
    streamDa: 'Data Analysis Stream',
    streamPl: 'Policy Analysis Stream',
    econ6067PartWarn:
      'ECON 6067 Part {{part}} is not selected; it does not count toward graduation requirements yet',
    wishlistHint:
      ' · Drag to reorder by category; courses that satisfy multiple categories can be dragged between matching groups',
  },
  timetable: {
    module0: 'Bootcamp',
    module1: 'Module 1 — 5 Sep ~ 21 Oct 2026',
    module2: 'Module 2 — 22 Oct ~ 30 Nov 2026',
    module3: 'Module 3 — 1 Dec 2026 ~ 21 Jan 2027',
    module4: 'Module 4 — 22 Jan ~ 10 Mar 2027',
    module5: 'Module 5 — 18 Mar ~ 4 May 2027',
    module6: 'Module 6 — 5 May ~ 18 Jun 2027',
    module11: 'Semester 1 (M1-2) — 5 Sep ~ 30 Nov 2026',
    module12: 'Semester 2 (M4-5) — 22 Jan ~ 4 May 2027',
  },
  courseDetail: {
    partTab: 'Part {{part}}: {{name}}',
  },
  requirements: {
    overviewBody:
      'Complete ten 6-credit courses (or eight 6-credit courses plus one 12-credit course), including three Fundamental Cores, three Stream Cores, and one Capstone, with electives making up 60 credits.',
    coreTitle: 'Fundamental Core (choose one from each group)',
    capstoneTitle: 'Capstone (by stream)',
    meconCoreHint:
      'Along your stream track, choose one course from each of Microeconomics, Macroeconomics, and Econometrics.',
    meconCapstoneHint:
      'Capstone options differ by stream. The Advanced Research Stream Research Thesis carries 12 credits.',
    meconChooseOne: 'choose one',
    streamCoreMin: 'Stream Core (at least {{min}})',
    creditsUnit: 'credits',
  },
}

export default overlay
