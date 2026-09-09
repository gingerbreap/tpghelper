import type { TranslationTree } from '../types'

const zhHK: TranslationTree = {
  lang: {
    label: '語言',
    zh: '简体中文',
    zhHK: '繁體中文',
    en: 'English',
  },
  brand: {
    name: '港大授課式研究生選課助手',
    tagline: '覆蓋港大經管學院授課式研究生課程的選課與學習規劃工具。',
  },
  auth: {
    login: '使用港大帳號登入',
    loginDisabledReason: '港大登入暫未開放，請先以訪客身份繼續。',
    guest: '以訪客身份繼續',
    loginPrivacy:
      '若日後登入：港大帳號憑證不會保存在我們的伺服器上，僅用於識別用戶，並在您同意時同步選課方案。',
    guestPrivacy:
      '若不以帳號登入：所有數據僅保存在本瀏覽器。換裝置時需自行匯出與匯入。',
  },
  programmes: {
    title: 'Which Programme are you in?',
    helper: '目前並非所有課程已接入本選課工具，請稍後回來查看。',
    unavailable: '即將推出',
    selected: '已選擇',
    back: '返回',
    next: '下一步',
    nextDisabledReason: '請先選擇一個可用的課程項目。',
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

export default zhHK
