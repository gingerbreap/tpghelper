import type { TranslationTree } from '../../../i18n/types'

const overlay: TranslationTree = {
  meta: {
    title: 'HKU MGM 選課助手',
  },
  nav: {
    brand: 'HKU MGM 選課助手',
  },
  footer: {
    disclaimer1:
      '本工具模組時間表內資訊源自 MGM Programme Office 提供的 Teaching Plan 2026-27，畢業及 Stream 培養要求源自項目官網及 MGM Curriculum Requirements。以上資訊最後與 Programme Office 所提供的資訊同步與核查時間詳見「關於」頁面，所有內容均「按原樣提供」(Provided as-is)。',
  },
  planner: {
    streamEsg: 'ESG 選修：',
    wishlistTitle: '備選列表 ({{count}})',
    wishlistHint: ' · 可按類別拖動排序；「選擇」加入正式已選',
    emptyWishlist: '暫無備選。可在「瀏覽添加」中加入備選。',
    clearWishlist: '清空備選',
    addWishlist: '加入備選',
    inWishlist: '已在備選 ✓',
    duplicateWishlist:
      '「{{code}}」已在正式計劃中（{{section}} 班 · Module {{module}}）。請先移除後再從備選加入。',
  },
  timetable: {
    module6: 'Module 6 — 2027年5月5日 ~ 6月18日',
  },
  requirements: {
    overviewBody:
      '共需修讀 {{total}} 門課，每門 {{credits}} 學分，包括 4 門 Core + 1 門 Capstone（二選一）+ {{electives}} 門 Elective。',
    esgTitle: '🌱 Environmental, Social and Governance (ESG) 方向',
    esgElectives: 'ESG 選修課（至少 {{min}} 門）',
    enrollmentRulesTitle: '選課限制',
    esgDescription:
      '考生可透過修讀至少三門 ESG 選修課集中修讀 ESG Stream。ESG 選修課對所有考生開放。',
    planningRules: [
      '建議每 Module 約修讀 2 門課（視開課、培養要求與個人計劃而定）。',
      'merit-based 獎學金：建議在 Module 1–3 完成至少 4 門課（含豁免情形）。',
      '共計 10 門課（4 Core + 1 Capstone + 5 Elective），每門 6 學分。',
      '標準修讀期為 2 年；亦可在一年內完成全部要求，需妥善規劃 Year 1 / Year 2。',
      'Global Centres：最多選 1 個中心；CSCSE 限制內地課程最多 3 門。',
      '冬季畢業：須於 Module 6 結束前（2027 年 6 月）完成；夏季畢業：Module 5 結束前（2027 年 5 月）。',
    ],
    notes: [
      '最多可修讀 3 門其他 HKUBS TPg 項目的共同選修課。',
      'ESG 選修課對所有考生開放；ESG Stream 需至少修讀 3 門 ESG 課程。',
      '經項目批准並繳費後，考生最多可加修 2 門額外選修課。',
      '並非所有列出課程每年都會開設。',
    ],
  },
  teachingPlan: {
    body7001_7024:
      '{{code1}}（Class A–D）新增補課日期；{{code2}} 已由 TBC 更新為完整上課安排（含 Class A/B）。日曆與衝突提示可能與舊版本不同。',
  },
}

export default overlay
