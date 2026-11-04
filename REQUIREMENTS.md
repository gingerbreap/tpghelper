# HKUBS MSc(BA) 选课规划网站 — 需求文档

## 一、产品概述
为 HKU Business School MSc(BA) 学生打造一个轻量级选课规划网站，部署于 GitHub Pages。支持简体中文 / 繁體中文（香港）/ 英文界面，数据源自 Programme Office Teaching Plan 与培养要求文件。

## 二、核心约束
- **模块制（Module）**：课程按 Module 1~5 组织，非传统 Semester 制。
- **特殊排课**：课程/教程可能出现非标准日期、晚间补课、周日课等。
- **GitHub Pages 部署**：纯静态前端，无后端/数据库。
- **数据维护**：手工维护结构化 JSON；Teaching Plan 变更时对照新旧 PDF 更新（见第七节与 `src/teachingPlan/README.md`）。
- **学年范围**：当前覆盖 2026-27 学年。
- **版本号**：`主版本.次版本.修订.yyMMdd`（如 `1.4.8.260909`），构建时由 `vite.config.ts` 注入；关于页另附可点击的短 commit SHA。

## 三、导航与落地页
主导航顺序：**我的日历** → **我的选课** → **模块时间表** → **培养要求** → **关于**。

- 默认落地页可在「关于 → 默认页选择」中设为「我的选课」或「我的日历」（`localStorage`）。
- HashRouter 路径示例：`#/planner`、`#/calendar`、`#/courselist`、`#/requirements`、`#/about`、`#/archive/teaching-plan`。

## 四、页面与功能

### 4.1 模块时间表（Module Timetable）— `#/courselist`
- 按 Module 1~5 展示全部课程与可选班别（A/B/C…）。
- 每个班别显示时段标签：`AM` / `PM` / `NT`。
- 特殊上课日期/教程独立时段需明确展示。
- Final Presentation 在时间表缩写为 **FINAL PRE**。
- 分阶段授课教授显示为 `Prof. A & Prof. B`（可在 `&` 处窄屏换行）。
- 点击课程卡片进入 `/course/:courseCode` 详情页。

### 4.2 我的选课（Planner）— `#/planner`
- 可勾选课程班别，勾选单位：**课程 + 班别 + 教授**。
- **同一课号只能选一个班别**（含跨 Module 重复开课）。
- 规划列表须清楚显示教授姓名。
- 实时冲突检查（见第九节）；Tutorial 警告支持「我知道了」持久关闭。
- 统计 Core / Elective / Capstone 与 Stream/List 完成度。
- 备选列表（购物车）、课程详情弹窗、Study Status 导入同既有约定。
- **页面最上方**：Teaching Plan 更新提示区（见 4.6）；其下为**内嵌选课日历**（含改动可视化，见 4.5）；冲突提示位于**日历与课程选择器之间**。

### 4.3 我的日历（My Calendar）— `#/calendar`
- 独立标签页，展示与选课计划相同的月历能力（LEC/TUT/考试/Presentation、假日、ICS 导出、Study Status 导入）。
- **不**叠加 Teaching Plan「改期前/后」幽灵场次与导航条（仅呈现最新课表事实）。
- 若存在未读 Teaching Plan 通知，页底显示浅黄提醒卡片，并可链到选课页。

### 4.4 课程详情 / 培养要求
- 详情：独立页或规划弹窗；多教授 Instructor tab + outline PDF；`LEC`/`TUT` 标签不译；Tutorial 默认折叠；姓全大写。
- 培养要求：Appendix C（Core/Elective、AI/MC、List A–D）与 Appendix E 相关规则。

### 4.5 选课日历、改动可视化、假日与 ICS
**通用**
- 月历覆盖已选 **LEC、TUT、Final Exam、Final Presentation**。
- 日历标题：`MSBAXXXX LEC` / `TUT` / `Final Exam` / `Final Presentation`。
- **假日只出现在屏幕日历**，**不写入 ICS**。
- ICS：无课时禁用；可按 Module / LEC·TUT 筛选；模板参数含 `@code`、`@class`、`@classchn`、`@module`、`@name`、`@type`、`@location`、`@prof` 等；教室写入 **LOCATION**。

**仅「我的选课」内嵌日历（Teaching Plan 影响层）**
- 对**仍显示（未点「已读」）**的通知：在日历上以淡化底纹显示**改期前场次**，以描边标出**改期后场次**。
- 图例单独一行：「改期前场次」「改期后场次」。
- 高亮导航：最早 / 上一个 / 下一个 / 最晚（Font Awesome）；默认无聚焦；点击空白卡片可取消高亮但保留导航序号。
- 高亮时改期后外框/发光为 `#D74E09`；改期前仅在高亮时用 `#4C5357` 外框。
- 「当前改动其他关联日期」：仅当**当前月视图网格**看不到某些关联日时出现，并提供跳转（不改变导航序号）。
- 匹配改期后场次须区分 **lecture / tutorial**，避免同日讲座误标到 TUT 改动上。
- **教室-only 变更目前不在日历上单独呈现**（仍出现在通知明细表）。

### 4.6 Teaching Plan 更新通知与存档
**选课页置顶区**
- 区块标题：`❗️Teaching Plan 更新提示`（与「我的选课规划」同级）。
- 同行操作：**回顾所有更新**（进存档页）、**一键已读**（等同关闭当前全部未读通知，无需依次动效）。
- 全部已读后，整块提示区消失。
- 单则标题格式：`Timestamp | CourseCode(s)`，例：`2026/09/03 17:23 | 7002, 7003, 7004`。
- 单则关闭按钮文案：**已读**（不再用「我知道了」）；按 notice id + 涉及课程版本持久化。
- **影响优先**：先展示与已选相关的摘要 chip（讲座班底色更深；TUT 较浅；圆圈数字计数）；明细对照表默认折叠，可「仅显示与我相关」。
- 明细表列：**课程 | 班 | 调整项 | 历史值 | 更新后**（规则见 `src/teachingPlan/README.md`）。
- 折叠箭头统一为 `fa-caret-right` / `fa-caret-down`，并与「已读」垂直对齐。

**存档**
- 路径：`#/archive/teaching-plan`、`#/about/teaching-plan-archive`、`#/teaching-plan-archive`（同一页）。
- 展示**全部**历史通知（不论是否已读），时间倒序；卡片样式（非黄色通知底）；标题格式与上一致。

**关于页**
- 工具名、当前版本 `x.y.z.yyMMdd (sha)`（sha 可点进 GitHub commit）、数据最后更新时间（默认 HKT，点击时区标签可切本地，不显性宣传）。
- 菜单：Teaching Plan 更新存档、默认页选择。
- 页脚改为引导至关于页查看同步核查时间，并注明 Provided as-is。

## 五、明确排除项
- **不包含**官方 sample study plan。
- **不做** term capacity / credit cap 限制。
- **不做**先修/依赖关系求解器。
- **不做**学习计划自动生成。
- **不做**难度/作业量评价功能。

## 六、UI 与语言
- 适配桌面与移动端；折叠控件使用 Font Awesome caret。
- 语言：`zh-CN` / `zh-HK` / `en`；课程名保留英文；`LEC`/`TUT` 等三字母标签不译。
- 页脚：数据来源说明 + 指向关于页的同步核查提示 + 免责声明。

## 七、技术方案
- 前端：React + Vite + TypeScript
- 路由：HashRouter（GitHub Pages）
- 状态：localStorage（已选、备选、通知已读、默认落地页、同步时区偏好等）
- 版本注入：`vite.config.ts` → `__APP_VERSION__` / `__APP_COMMIT_SHA__` / `__APP_REPO_URL__`
- 分析：Google Analytics
- 部署：GitHub Actions → GitHub Pages（push `main`）
- Commit message：约定式提交（[Conventional Commits](https://www.conventionalcommits.org/)）

## 八、数据来源（单一事实来源）
| 内容 | 文件 |
|------|------|
| Teaching Plan PDF（按日期后缀归档） | `src/teachingPlan/MSc(BA) Teaching plan 2026-27_YYYYMMDD.pdf` |
| Teaching Plan 改动检查清单 | `src/teachingPlan/README.md` |
| 结构化课表 | `public/courses.json` |
| 培养要求/方向 | `public/requirements.json` |
| 课程大纲 PDF | `public/courseOutline/` |
| 更新通知数据 | `src/data/teachingPlanUpdates.ts` |
| 同步时间（关于页） | `public/{id}/meta.json` → SQL `ProgrammeMeta`（pack `dataSync` / `appMeta` 兜底） |
| 日历改动叠加 | `src/utils/teachingPlanImpact.ts`、`PlannerCalendar` |
| 已读状态 | `src/utils/teachingPlanDismiss.ts` |

同步流程摘要：新 PDF → `src/teachingPlan/` → 对照旧版红字 → 更新 `courses.json` + `teachingPlanUpdates.ts` + i18n body → 更新 `DATA_SYNC_HKT` → 本地核对通知/日历 → commit / push `main`。

## 九、数据模型（courses.json 核心字段）
```
courseCode, courseTitle
module (1~5)
courseType (Core / Elective / Capstone)
streamTags (AI-M, AI-A, MC-AM, MC-DE)
sections[]:
  sectionId (A/B/C…)
  instructors[]: { name, note? }
  timeBucket (AM/PM/NT)
  dayPattern, meetingDays[]
  meetings[]:
    date, startTime, endTime, venue
    sessionType (lecture / tutorial)
    instructors[]?
  examOrFinal?
outlinePdfPath
examOrFinal: kind, date, startTime, endTime, venue, raw
```

## 十、冲突检查逻辑
- 按 `meetings[]` 的「具体日期 + 时间段重叠」判断。
- lecture vs lecture → Error；tutorial 相关重叠 → Warning。
- 星期条与假日不参与冲突计算。
- 冲突提示 UI 位于选课页日历与课程选择器之间。

## 十一、验收标准
1. 可按 Module 浏览并区分 AM/PM/NT；详情 / outline 可用。
2. 规划页可选课、同课号互斥、教授可见；硬冲突 Error、TUT Warning。
3. 「我的日历」与「我的选课」日历均可展示日程；仅选课页日历叠加未读 TP 改动可视化。
4. Teaching Plan 置顶区、已读 / 一键已读、存档页、关于页版本与默认可正常工作。
5. 三语界面可用；GitHub Pages 可访问；移动端基本可用。
