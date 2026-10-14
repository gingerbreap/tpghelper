import type { TranslationTree } from '../../../i18n/types'

const overlay: TranslationTree = {
  meta: {
    title: 'HKU MEcon 選課助手',
  },
  nav: {
    brand: 'HKU MEcon 選課助手',
  },
  footer: {
    disclaimer1:
      '本工具模組時間表內資訊源自 MEcon Programme Office 提供的 Teaching Plan 2026-27，畢業及 Stream 培養要求源自 Regulations & Syllabuses。以上資訊最後與 Programme Office 所提供的資訊同步與核查時間詳見「關於」頁面，所有內容均「按原樣提供」(Provided as-is)。',
  },
  planner: {
    streamProgress: '方向完成度',
    currentStream: '目前所選 Stream',
    streamSelectHint: '請選擇對應 Stream 後，再使用下方選課日曆與列表。',
    switchStream: '切換 Stream',
    streamSwitchTitle: 'Stream 切換',
    streamSwitchWarning:
      '如需切換 Stream，請務必與 Programme Office 確認是否允許及所需課程！',
    streamPolicyPrompt: '對於不在新選擇的 Stream 的選課要求列表內的課：',
    streamPolicyChoose: '請選擇',
    streamPolicyDeleteRelated: '刪除所有相關選課記錄',
    streamPolicyDeleteCoreScElective: '刪除相關 Core，將相關 Stream Core 視為 Elective',
    streamPolicyKeepCoreScElective: '保留全部 Core, 將 Stream Core 視為 Elective',
    streamPolicyAllElective: '全部視為 Elective',
    streamPreviewTitle: '改動預覽',
    streamPreviewEmpty: '按目前策略，無需改動選課記錄。',
    streamPreviewCode: '課號',
    streamPreviewTitleCol: '課程名稱',
    streamPreviewCurrent: '目前狀態',
    streamPreviewNext: '切換後狀態',
    groupCore: 'Core',
    groupStreamCore: 'Stream Core',
    groupCapstone: 'Capstone',
    groupElective: 'Electives',
    streamArs: 'Advanced Research Stream',
    streamThy: 'Theory Stream',
    streamDa: 'Data Analysis Stream',
    streamPl: 'Policy Analysis Stream',
    econ6067PartWarn:
      'ECON 6067 未選擇 Part {{part}}，暫不計入畢業要求計數',
    wishlistHint: ' · 可按類別拖動排序，可滿足多類課程要求的課程可在符合的類別間拖曳',
  },
  timetable: {
    module0: 'Bootcamp',
    module1: 'Module 1 — 2026年9月5日 ~ 10月21日',
    module2: 'Module 2 — 2026年10月22日 ~ 11月30日',
    module3: 'Module 3 — 2026年12月1日 ~ 2027年1月21日',
    module4: 'Module 4 — 2027年1月22日 ~ 3月10日',
    module5: 'Module 5 — 2027年3月18日 ~ 5月4日',
    module6: 'Module 6 — 2027年5月5日 ~ 6月18日',
    module11: 'Semester 1 (M1-2) — 2026年9月5日 ~ 11月30日',
    module12: 'Semester 2 (M4-5) — 2027年1月22日 ~ 5月4日',
  },
  courseDetail: {
    partTab: 'Part {{part}}: {{name}}',
  },
  requirements: {
    overviewBody:
      '共需修讀十門 6 學分課程（或八門 6 學分 + 一門 12 學分），含三門 Fundamental Core、三門 Stream Core、一門 Capstone，並以選修補足 60 學分。',
    coreTitle: 'Fundamental Core（三組各選一門）',
    capstoneTitle: 'Capstone（按 Stream 選擇）',
    meconCoreHint: '須按所選 Stream 所屬軌道，在 Micro / Macro / Econometrics 三組中各選一門。',
    meconCapstoneHint: '各 Stream 可選 Capstone 不同；Advanced Research Stream 的 Research Thesis 為 12 學分。',
    meconChooseOne: '任選其一',
    streamCoreMin: 'Stream Core（至少 {{min}} 門）',
    creditsUnit: '學分',
  },
}

export default overlay
