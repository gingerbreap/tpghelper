import type { TranslationTree } from '../../../i18n/types'

/** MGM branding + ESG / Module 6 / enrollment copy overlaid on shared locales. */
const overlay: TranslationTree = {
  meta: {
    title: 'HKU MGM Course Planner',
  },
  nav: {
    brand: 'HKU MGM Course Planner',
  },
  footer: {
    disclaimer1:
      'Timetable data is sourced from the MGM Programme Office Teaching Plan 2026-27. Graduation and stream requirements are sourced from the programme website and MGM Curriculum Requirements. For the last sync/verification time against Programme Office materials, see the About page. All content is provided as-is.',
  },
  planner: {
    streamEsg: 'ESG electives:',
    wishlistTitle: 'Backup list ({{count}})',
    wishlistHint: ' · Drag within category to reorder; use Select to add to your plan',
    emptyWishlist: 'No backup items. Use Add to backup in Browse & Add.',
    clearWishlist: 'Clear backup',
    addWishlist: 'Add to backup',
    inWishlist: 'In backup ✓',
    duplicateWishlist:
      '"{{code}}" is already in your plan (Class {{section}} · Module {{module}}). Remove it before selecting from backup.',
  },
  timetable: {
    module6: 'Module 6 — May 5 ~ Jun 18, 2027',
  },
  requirements: {
    overviewBody:
      '{{total}} courses required, {{credits}} credits each, including 4 Core + 1 Capstone (choose one) + {{electives}} Electives.',
    esgTitle: '🌱 Environmental, Social and Governance (ESG) stream',
    esgElectives: 'ESG electives (min. {{min}})',
    enrollmentRulesTitle: 'Enrolment rules',
    esgDescription:
      'Candidates may concentrate in the ESG Stream by taking a minimum of three ESG elective courses. ESG electives are open to all candidates.',
    planningRules: [
      'About 2 courses per module is recommended (subject to availability, requirements, and your plan).',
      'For merit-based scholarships, complete at least 4 courses in Modules 1–3 (including where exemptions apply).',
      '10 courses total (4 Core + 1 Capstone + 5 Elective), 6 credits each.',
      'Standard study period is 2 years; all requirements may be completed in one year with careful Year 1/Year 2 planning.',
      'Global Centres: choose at most 1 centre; CSCSE limits mainland courses to at most 3.',
      'Winter graduation: complete by end of Module 6 (Jun 2027); Summer graduation: by end of Module 5 (May 2027).',
    ],
    notes: [
      'Up to 3 common electives from other HKUBS TPg programmes may be taken.',
      'ESG electives are open to all candidates; ESG Stream concentration requires minimum 3 ESG courses.',
      'Candidates may take up to 2 additional elective courses with fees and programme approval.',
      'Not all listed courses are offered every academic year.',
    ],
  },
  teachingPlan: {
    body7001_7024:
      '{{code1}} (Class A–D) gained additional make-up sessions; {{code2}} moved from TBC to a full schedule (Class A/B). Conflicts and calendar events may differ from earlier versions.',
  },
}

export default overlay
