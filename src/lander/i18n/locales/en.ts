import type { TranslationTree } from '../types'

const en: TranslationTree = {
  lang: {
    label: 'Language',
    zh: '简体中文',
    zhHK: '繁體中文',
    en: 'English',
  },
  brand: {
    name: 'HKU TPg Course Planner',
    tagline: 'Plan modules across HKU Business School taught postgraduate programmes.',
  },
  auth: {
    login: 'Log in with HKU',
    loginDisabledReason: 'HKU login is not available yet. Please continue as a guest for now.',
    guest: 'Continue as guest',
    loginPrivacy:
      'If you choose to log in: your HKU credentials are not saved on our server. They are only used to identify you and optionally sync course selections.',
    guestPrivacy:
      'If you continue as a guest: all data stays in this browser. Moving to another device requires manual export and import.',
  },
  programmes: {
    title: 'Which Programme are you in?',
    helper:
      'Not all programmes are available on this Planner Tool now. Please come back and check later.',
    unavailable: 'Coming soon',
    selected: 'Selected',
    back: 'Back',
    next: 'Next',
    nextDisabledReason: 'Select an available programme to continue.',
    items: {
      macct: 'Master of Accounting (MAcct)',
      maa: 'Master of Accounting Analytics (MAA)',
      maib: 'Master of Artificial Intelligence in Business (MAIB)',
      mecon: 'Master of Economics (MEcon)',
      mfwm: 'Master of Family Wealth Management (MFWM)',
      mfin: 'Master of Finance (MFin)',
      mffintech: 'Master of Finance in Financial Technology (MFFinTech)',
      mgm: 'Master of Global Management (MGM)',
      msba: 'Master of Science in Business Analytics [MSc(BA)]',
      msmkt: 'Master of Science in Marketing [MSc(Mktg)]',
      msaf: 'Master of Sustainable Accounting and Finance (MSAF)',
      mwm: 'Master of Wealth Management (MWM)',
    },
  },
}

export default en
