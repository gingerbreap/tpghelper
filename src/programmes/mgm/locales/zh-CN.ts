import type { TranslationTree } from '../../../i18n/types'

const overlay: TranslationTree = {
  meta: {
    title: 'HKU MGM 选课助手',
  },
  nav: {
    brand: 'HKU MGM 选课助手',
  },
  footer: {
    disclaimer1:
      '本工具模块时间表内信息源自 MGM Programme Office 提供的 Teaching Plan 2026-27，毕业及 Stream 培养要求源自项目官网及 MGM Curriculum Requirements。以上信息最后与 Programme Office 所提供的信息同步与核查时间详见“关于”页面，所有内容均“按原样提供” (Provided as-is)。',
  },
  planner: {
    streamEsg: 'ESG 选修：',
    wishlistTitle: '备选列表 ({{count}})',
    wishlistHint: ' · 可按类别拖动排序；「选择」加入正式已选',
    emptyWishlist: '暂无备选。可在「浏览添加」中加入备选。',
    clearWishlist: '清空备选',
    addWishlist: '加入备选',
    inWishlist: '已在备选 ✓',
    duplicateWishlist:
      '「{{code}}」已在正式计划中（{{section}} 班 · Module {{module}}）。请先移除后再从备选加入。',
  },
  timetable: {
    module6: 'Module 6 — 2027年5月5日 ~ 6月18日',
  },
  requirements: {
    overviewBody:
      '共需修读 {{total}} 门课，每门 {{credits}} 学分，包括 4 门 Core + 1 门 Capstone（二选一）+ {{electives}} 门 Elective。',
    esgTitle: '🌱 Environmental, Social and Governance (ESG) 方向',
    esgElectives: 'ESG 选修课（至少 {{min}} 门）',
    enrollmentRulesTitle: '选课限制',
    esgDescription:
      '考生可通过修读至少三门 ESG 选修课集中修读 ESG Stream。ESG 选修课对所有考生开放。',
    planningRules: [
      '建议每 Module 约修读 2 门课（视开课、培养要求与个人计划而定）。',
      'merit-based 奖学金：建议在 Module 1–3 完成至少 4 门课（含豁免情形）。',
      '共计 10 门课（4 Core + 1 Capstone + 5 Elective），每门 6 学分。',
      '标准修读期为 2 年；亦可在一年内完成全部要求，需妥善规划 Year 1 / Year 2。',
      'Global Centres：最多选 1 个中心；CSCSE 限制内地课程最多 3 门。',
      '冬季毕业：须于 Module 6 结束前（2027 年 6 月）完成；夏季毕业：Module 5 结束前（2027 年 5 月）。',
    ],
    notes: [
      '最多可修读 3 门其他 HKUBS TPg 项目的共同选修课。',
      'ESG 选修课对所有考生开放；ESG Stream 需至少修读 3 门 ESG 课程。',
      '经项目批准并缴费后，考生最多可加修 2 门额外选修课。',
      '并非所有列出课程每年都会开设。',
    ],
  },
  teachingPlan: {
    body7001_7024:
      '{{code1}}（Class A–D）新增补课日期；{{code2}} 已由 TBC 更新为完整上课安排（含 Class A/B）。日历与冲突提示可能与旧版本不同。',
  },
}

export default overlay
