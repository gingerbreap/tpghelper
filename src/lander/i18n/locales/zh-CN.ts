import type { TranslationTree } from '../types'

const zhCN: TranslationTree = {
  lang: {
    label: '语言',
    zh: '简体中文',
    zhHK: '繁體中文',
    en: 'English',
  },
  brand: {
    name: '港大授课式研究生选课助手',
    tagline: '覆盖港大经管学院授课式研究生课程的选课与学习规划工具。',
  },
  auth: {
    login: '使用港大账号登录',
    loginDisabledReason: '港大登录暂未开放，请先以访客身份继续。',
    guest: '以访客身份继续',
    loginPrivacy:
      '如选择登录：港大账号凭证不会保存在我们的服务器上，仅用于识别用户，并在您同意时同步选课方案。',
    guestPrivacy:
      '如以访客继续：所有数据仅保存在本浏览器。换设备时需自行导出与导入。',
  },
  programmes: {
    title: 'Which Programme are you in?',
    helper: '目前并非所有课程已接入本选课工具，请稍后回来查看。',
    unavailable: '即将推出',
    selected: '已选择',
    back: '返回',
    next: '下一步',
    nextDisabledReason: '请先选择一个可用的课程项目。',
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

export default zhCN
