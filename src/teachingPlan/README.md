# Teaching Plan 日程改动检查清单

以后每次 Programme Office 下发新 Teaching Plan 时，按本文操作。新旧 PDF **统一放在对应 programme 的 public 目录**，文件名带日期后缀，便于对照。本目录仅保留操作说明。

## 1. 文件位置与命名

| Programme | PDF 目录 |
|-----------|----------|
| MSBA | `public/msba/teachingPlan/` |
| MGM | `public/mgm/teachingPlan/` |

| 角色 | 命名示例 |
|------|----------|
| 旧版（上次已同步进站） | `MSc(BA) Teaching plan 2026-27_20260814.pdf` |
| 新版（本次 PO 邮件附件） | `MSc(BA) Teaching plan 2026-27_20260903.pdf` |

约定：

- 后缀用 **PO 邮件 / 文件时间戳** 的 `YYYYMMDD`（与通知标题时间一致即可）。
- **不要**再把 PDF 散落在 `src/` 根目录或其他临时路径。
- 同步完成后，新版即成为下一次的「旧版」。

## 2. 必查：标红与对照旧版

PO 的 Teaching Plan 用 **红色** 标出相对上一版的改动。检查时：

1. **打开新旧两份 PDF**（同目录、日期后缀相邻的两份）。
2. **不要只信邮件正文**。邮件可能只点名部分课（如只写 7002 & 7003），PDF 里仍可能有其它红字（如 7004 Tutorial 列）。
3. **逐课、逐班、逐列**扫红字，尤其注意：
   - **Lecture 日期/时间列**（含括号里的非常规时段）
   - **Classroom / Venue 列**
   - **Tutorial / Session 列**（常在行右侧；A/B 或 C/D 常 **共用一格**）
   - **Exam / Final** 列
4. **标红位置 ≠ 课程代码视觉中心**：Tutorial 红字可能落在两课交界；用「最近的课程代码 + Class」归属。
5. **红字记法常见形态**：
   - `Nov 19 (Thurs) **16 (Mon)** …` → 原周四改到周一（红的是新日期）
   - 日期后红括号时段 → 该日改为非常规时间
   - Venue 列红字 → 教室变更
6. **与旧版 PDF 逐项 diff**：红字应能在旧版找到对应旧值；新版黑字但与旧版不一致也要同步。
7. 工具辅助：接近纯红文本 + 按 Y 映射到课程行，再人工确认。

## 3. 站点数据改哪里

| 内容 | 文件 |
|------|------|
| 课表事实（日期/时间/教室/TUT） | `public/{msba\|mgm}/courses.json` |
| 选课页更新通知（表格数据） | `src/programmes/{msba\|mgm}/teachingPlanUpdates.ts` |
| 通知 / 日历 / 关于文案 | `src/i18n/locales/*` + `src/programmes/mgm/locales/*`（MGM 覆盖） |
| 通知 UI（影响摘要 + 明细） | `src/components/TeachingPlanUpdateNotice.tsx` |
| 存档页卡片正文 | `src/components/TeachingPlanNoticeBody.tsx`、`src/pages/TeachingPlanArchive.tsx` |
| 日历改动叠加 | `src/utils/teachingPlanImpact.ts`、`src/components/PlannerCalendar.tsx` |
| 已读持久化 | `src/utils/teachingPlanDismiss.ts` |
| 数据最后同步时间（关于页） | `src/programmes/{msba\|mgm}/index.ts` → `dataSync` |

通知约定：

- 标题格式：`Timestamp | CourseCode(s)`，例：`2026/09/03 17:23 | 7002, 7003, 7004`（无方括号）。
- **新通知**默认展开；更早的通知默认折叠。
- 关闭按钮文案为 **「已读」**；`updates` 增删课号会改变 dismiss version，用户会再次看到该则。
- 选课页置顶区提供 **一键已读**、**回顾所有更新**（进存档）；全部已读后整区消失。
- 「我的选课」内嵌日历会对未读通知叠加改期前/后可视化；「我的日历」页不叠加，仅底部未读提醒。

## 4. 通知表如何写（展示规则）

表头：**课程 | 班 | 调整项 | 历史值 | 更新后**

### 班（Class）

- 讲座改动：写班别字母 `A`/`B`/`C`/`D`。
- **Tutorial 改动**：Tutorials **不绑定**某一讲座班；班列写 **`TUT`**，不要拆成 A+B 两行重复。
- 同一课程内：**所有 TUT 行排在该课讲座改动之后（沉底）**。

### 调整项（只写变了什么；**不要**再写 LEC/TUT 字样）

| 情形 | 调整项文案（中 / 英） |
|------|----------------------|
| 只改钟点（同日） | 时间 / Time |
| 改动跨日 | **日期** / Date |
| 时间（或日期）+ 教室 | 时间与教室；跨日则 **日期与教室** |
| 只改教室 | 教室 / Venue |
| 锚定某日的场次 | `Sep 23 时间`、`Nov 9 教室` 等 |
| 同日同类型多节才加钟点区分 | `Sep 23 18:30-20:00 时间` |
| 同日仅 LEC+TUT 各一节 | **不要**在调整项写钟点 |

跨日判断：见 `involvesDateChange`。

### 历史值 / 更新后

- **只显示有变化的字段**。
- **日期 + 教室同时改**：历史值不写原教室。
- 历史值列：**不显示 ⏰**；更新后：日期/时间 ⏰，教室 📌。

### 影响摘要与明细高亮

- 摘要 chip：与已选相关优先；讲座班底色更深，TUT 更浅；计数为圆圈数字。
- 明细表勾选「仅显示与我相关」时**不**再做行底色区分；取消勾选时已选讲座班行浅黄高亮。
- `TUT` 行不按讲座班高亮。

### 日历叠加注意

- 改期后场次按 **sessionType（lecture/tutorial）** 匹配，避免同日讲座误绑 TUT。
- 教室-only 变更目前**不必**做日历幽灵场次（表内仍要写清）。

## 5. 推荐操作顺序（给 Agent / 维护者）

1. 将新 PDF 拷入 `public/{programme}/teachingPlan/`，确认旧版仍在同目录。
2. 对照旧版 + 扫新版红字，列出「课程 / 班或 TUT / 旧值 / 新值」（含邮件未点名的课）。
3. 改 `public/{programme}/courses.json`（TUT 共用则相关 meeting 一并改）。
4. 更新 `src/programmes/{programme}/teachingPlanUpdates.ts`：新 notice 或扩展现有 notice；TUT 行 `sectionId: 'TUT'` 并沉底。
5. 更新三语 i18n body（MSBA：`src/i18n/locales`；MGM：另更新 `src/programmes/mgm/locales`）；更新 programme `dataSync`。
6. 用对应 `PROGRAMME=` 本地核对：置顶通知标题/摘要/明细、选课日历改动层、「我的日历」未读条、存档页。
7. Commit（约定式提交）+ 按部署流程发布。

## 6. 历史同步参考（MSBA）

| 后缀日期 | 通知焦点（不完全等于 PDF 全部红字） |
|----------|--------------------------------------|
| `20260811` | 初始建站数据源 |
| `20260814` / 通知 `2026/08/18` | 7015 & 7037 |
| `20260903` | 7002、7003；补漏 7004 TUT Nov 19→16 |

维护代码入口：`src/programmes/*/teachingPlanUpdates.ts`、`TeachingPlanUpdateNotice.tsx`、`teachingPlanImpact.ts`、programme `dataSync`。
