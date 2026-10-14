import type { TranslationTree } from '../../../i18n/types'

const overlay: TranslationTree = {
  meta: {
    title: 'HKU MEcon 选课助手',
  },
  nav: {
    brand: 'HKU MEcon 选课助手',
  },
  footer: {
    disclaimer1:
      '本工具模块时间表内信息源自 MEcon Programme Office 提供的 Teaching Plan 2026-27，毕业及 Stream 培养要求源自 Regulations & Syllabuses。以上信息最后与 Programme Office 所提供的信息同步与核查时间详见“关于”页面，所有内容均“按原样提供” (Provided as-is)。',
  },
  planner: {
    streamProgress: '方向完成度',
    currentStream: '当前所选 Stream',
    streamSelectHint: '请选择对应 Stream 后，再使用下方选课日历与列表。',
    switchStream: '切换 Stream',
    streamSwitchTitle: 'Stream 切换',
    streamSwitchWarning:
      '如需切换 Stream，请务必与 Programme Office 确认是否允许及所需课程！',
    streamPolicyPrompt: '对于不在新选择的 Stream 的选课要求列表内的课：',
    streamPolicyChoose: '请选择',
    streamPolicyDeleteRelated: '删除所有相关选课记录',
    streamPolicyDeleteCoreScElective: '删除相关 Core，将相关 Stream Core 视为 Elective',
    streamPolicyKeepCoreScElective: '保留全部 Core, 将 Stream Core 视为 Elective',
    streamPolicyAllElective: '全部视为 Elective',
    streamPreviewTitle: '改动预览',
    streamPreviewEmpty: '按当前策略，无需改动选课记录。',
    streamPreviewCode: '课号',
    streamPreviewTitleCol: '课程名称',
    streamPreviewCurrent: '当前状态',
    streamPreviewNext: '切换后状态',
    groupCore: 'Core',
    groupStreamCore: 'Stream Core',
    groupCapstone: 'Capstone',
    groupElective: 'Electives',
    streamArs: 'Advanced Research Stream',
    streamThy: 'Theory Stream',
    streamDa: 'Data Analysis Stream',
    streamPl: 'Policy Analysis Stream',
    econ6067PartWarn:
      'ECON 6067 未选择 Part {{part}}，暂不计入毕业要求计数',
    wishlistHint: ' · 可按类别拖动排序，可满足多类课程要求的课程可在符合的类别间拖拽',
    retypeAsOther: '作为其他类别计入…',
    retypeAutoReset: '因 STM Core 不足，已自动重置该课程属性',
    streamCoreMoveBanner: '请将{{codes}}中{{n}}门移动至Stream Core类别',
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
      '共需修读十门 6 学分课程（或八门 6 学分 + 一门 12 学分），含三门 Fundamental Core、三门 Stream Core、一门 Capstone，并以选修补足 60 学分。',
    coreTitle: 'Fundamental Core（三组各选一门）',
    capstoneTitle: 'Capstone（按 Stream 选择）',
    meconCoreHint: '须按所选 Stream 所属轨道，在 Micro / Macro / Econometrics 三组中各选一门。',
    meconCapstoneHint: '各 Stream 可选 Capstone 不同；Advanced Research Stream 的 Research Thesis 为 12 学分。',
    meconChooseOne: '任选其一',
    streamCoreMin: 'Stream Core（至少 {{min}} 门）',
    creditsUnit: '学分',
  },
}

export default overlay
