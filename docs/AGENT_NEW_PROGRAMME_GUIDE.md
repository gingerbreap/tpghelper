# Agent 指南：在 tpghelper 中开设新项目子站

> **读者**：负责「在本仓新增一个专业 pack → 接 lander → 构建部署」的 Agent / 维护者。  
> **仓库**：[`tpghelper`](https://github.com/gingerbreap/tpghelper)（多专业 shell，Azure 同源部署）。  
> **已有 pack**：`msba`（MSc(BA)）、`mgm`（MGM）、`mecon`（MEcon）；根入口 `lander`。  
> **MEcon 分析备忘**：[`docs/mecon/ANALYSIS.md`](./mecon/ANALYSIS.md)。  
> **历史背景**：早期曾建议「fork 独立仓库」；整合完成后，**默认路径是在本仓加 pack**，不再为每个专业另开 GitHub Pages 仓。

本文件是**新子站搭建总览**。日常 Teaching Plan 同步仍以 [`src/teachingPlan/README.md`](../src/teachingPlan/README.md) 为准；产品行为以 [`REQUIREMENTS.md`](../REQUIREMENTS.md) 为准（部分条文仍带 BA 历史表述，以代码与本指南为准）。

旧版「整仓 fork」思路见旁仓 `HKUBS_BA_Helper/docs/AGENT_MIGRATION_GUIDE.md`；其中数据模型与 TP 踩坑仍有参考价值，但**部署与身份模型已过时**。

---

## 0. 30 秒心智模型

这是一个 **同源多入口** 站点：

| 入口 | URL | 构建开关 | 职责 |
|------|-----|----------|------|
| Lander | `/` | `PROGRAMME=lander` | 登录门（可禁用）→ 专业选择 → 整页跳进子站 |
| 专业 App | `/{id}/` | `PROGRAMME={id}` | 日历 / 选课 / 课表 / 培养要求 / 关于（共享 React 壳） |

| 层 | 内容 |
|----|------|
| **共享壳** | `src/pages/*`、`src/components/*`、`src/hooks/*`、`src/utils/*`、基础 i18n |
| **专业 pack** | `src/programmes/{id}/`（配置、TP notices、stream 标签、可选 locale 覆盖） |
| **专业静态资源** | `public/{id}/`（`courses.json`、`requirements.json`、大纲 PDF、TP PDF、manifest、logo） |
| **用户状态** | 专业前缀 localStorage（如 `msba-*` / `mgm-*` / `mecon-*`）+ 站点级 `tpghelper-*` |
| **备份** | Site config schema **2.1**：顶层 `currentProgramme` + 嵌套 `{ msba?, mgm?, mecon?, … }` 瘦身课表行 |
| **生产部署** | `npm run build:site` → `server/public/{lander,msba,mgm,mecon,…}` → Express → Azure（`push main`） |

迁移时：**壳代码尽量不动**；**成套新增「pack 配置 + public 数据 + 接线清单」**，保证 storage 前缀、备份 `programme` id、Vite `base` 三者一致。

---

## 1. 推荐路径（本仓加 pack）

1. 选定稳定 id（小写短码，如 `msmkt`、`mfin`），与 lander 目录里预留项对齐更佳。
2. 以 **MSBA** 为默认模板复制 pack + `public/`（功能接近 BA）；若需要「备选列表 / 选课互斥规则」，对照 **MGM**。
3. 按第 3 节「接线清单」改类型、catalogue、Vite、构建脚本、lander、siteConfig 硬编码。
4. 填 `courses.json` / `requirements.json` / outlines / 首份 Teaching Plan PDF；配置 `dataSync` 与 notices（可先空）。
5. 本地：`npm run build:site` 必须全绿；`npm run dev:all` 点通 lander → 新子站路径。
6. 提交后 `push main` 走 Azure 部署（见根 `README.md`）。

### 1.1 何时仍应独立 fork？

仅当产品明确要求**不同域名 / 不同仓库权限 / 不进 tpghelper lander**。否则一律本仓 pack。

---

## 2. 目录与职责地图

```
.
├── public/
│   ├── lander/                 # 根入口品牌 / PWA
│   ├── msba/                   # 专业静态根（Vite publicDir）
│   │   ├── courses.json
│   │   ├── requirements.json
│   │   ├── courseOutline/
│   │   ├── teachingPlan/       # TP PDF 归档（YYYYMMDD 后缀）
│   │   └── site*.webmanifest
│   └── mgm/                    # 同上
├── src/
│   ├── lander/                 # 根 App（AuthGate + ProgrammePicker）
│   ├── programmes/
│   │   ├── types.ts            # ProgrammeId + ProgrammeConfig
│   │   ├── catalogue.ts        # 全站 catalogue（备份 / 偏好解析，不依赖 active pack）
│   │   ├── activePack.ts       # select-programme 生成，勿手改
│   │   ├── activeLocaleOverlays.ts
│   │   ├── emptyLocaleOverlays.ts
│   │   ├── msba|mgm/
│   │   │   ├── index.ts        # ProgrammeConfig + re-exports
│   │   │   ├── pack.ts         # active pack 表面（Vite / tsc 入口）
│   │   │   ├── teachingPlanUpdates.ts
│   │   │   ├── streamTags.ts
│   │   │   └── locales/        # 可选（MGM 有；MSBA 用 empty overlays）
│   │   └── index.ts            # getActiveProgramme()
│   ├── session/tpgSession.ts   # 跨入口 preferred programme / 路径表
│   ├── utils/siteConfig.ts     # 导入导出 schema 2.1
│   ├── i18n/locales/           # 共享三语（MSBA 默认文案多在此）
│   ├── data/holidays.ts        # 学年假日（全站共享）
│   └── teachingPlan/README.md  # TP 同步操作手册（无 PDF）
├── scripts/
│   ├── select-programme.mjs    # 切换 activePack / locale overlays
│   ├── build-site.mjs          # lander + 各 pack → server/public
│   └── dev-site.mjs            # 本地同源 gateway
├── server/                     # Express；public/ 为构建产物
└── docs/
    └── AGENT_NEW_PROGRAMME_GUIDE.md  # 本文件
```

### 2.1 专业 App 路由（HashRouter，挂在 `/{id}/`）

| Path | 页面 |
|------|------|
| `/` | 重定向到默认落地页（planner / calendar） |
| `/planner` | 我的选课（TP 通知 + 内嵌改动日历） |
| `/calendar` | 我的日历（最新事实；底部未读条） |
| `/courselist` | 模块时间表 |
| `/course/:courseCode` | 课程详情 |
| `/requirements` | 培养要求 |
| `/about` | 关于 / 换专业 / 导入导出入口 |
| `/archive/teaching-plan` | Teaching Plan 更新存档 |

Lander：`/#/`（Auth）、`/#/programmes`（专业选择）。

---

## 3. 接线清单（新增 pack 必做）

漏改会导致：构建仍指向旧 pack、lander 点不开、备份无法解析、导入水合失败。

将下文 `{id}` 换成新码（例：`msmkt`）。

### 3.1 Pack 与静态资源

| # | 动作 |
|---|------|
| 1 | 新建 `src/programmes/{id}/`：从 `msba/` 或 `mgm/` 复制 `index.ts`、`pack.ts`、`teachingPlanUpdates.ts`、`streamTags.ts`；（需要差异文案时）复制 `locales/` + `localeOverlays.ts` |
| 2 | 改 `index.ts` 中 `ProgrammeConfig`：`id`、`shortName`、`titleStem`、`viteBase: '/{id}/'`、`analyticsId`、`moduleCount` / `moduleNumbers`、`streamIds`、`storage.*` 前缀、`features`、`dataSync`、`studyStatus`、`ics` |
| 3 | `pack.ts` 导出 `programme`（及 notices / streamTagDisplay），与现有 pack 表面一致 |
| 4 | 新建 `public/{id}/`：`courses.json`、`requirements.json`、`courseOutline/`、`teachingPlan/`、logo / favicon、`site.webmanifest` + `site.zh-CN.webmanifest` + `site.zh-HK.webmanifest`（`start_url` / `scope` / name 对齐 `/{id}/`） |

### 3.2 类型与全站 catalogue

| # | 文件 | 改什么 |
|---|------|--------|
| 5 | `src/programmes/types.ts` | `ProgrammeId` 联合类型加入 `'{id}'` |
| 6 | `src/programmes/catalogue.ts` | `PROGRAMME_CATALOGUE` 增加一项（`aliases`、`storage`）；供备份与 `resolveProgrammeId` |
| 7 | `src/vite-env.d.ts` | `__PROGRAMME_ID__` 联合类型加入 `'{id}'` |

### 3.3 构建 / 开发接线（当前多为硬编码）

| # | 文件 | 改什么 |
|---|------|--------|
| 8 | `vite.config.ts` | `ProgrammeId`、`PROGRAMME_META[{id}]`（`base`、`analyticsId`、`htmlTitle`、`publicDir: 'public/{id}'`）；`resolveProgrammeId()` 识别新 id |
| 9 | `scripts/select-programme.mjs` | 识别 `{id}`（勿再 `mgm \| else msba`）；locale overlays：有覆盖则指向 `./{id}/localeOverlays`，否则 `emptyLocaleOverlays` |
| 10 | `scripts/build-site.mjs` | `buildProgramme('{id}', 'server/public/{id}')` |
| 11 | `scripts/dev-site.mjs` | 新端口 + `run` + `targetFor('/{id}')` 代理 |
| 12 | `package.json` | 建议增加 `dev:{id}` / `build:{id}` |

### 3.4 Lander 与跨入口会话

| # | 文件 | 改什么 |
|---|------|--------|
| 13 | `src/session/tpgSession.ts` | `PROGRAMME_APP_PATHS[{id}] = '/{id}/'` |
| 14 | `src/lander/programmes.ts` | 将预留项改为 `available: true`、`appPath: '/{id}/'`；若 id 不在枚举则扩展 `LanderProgrammeId` |
| 15 | `src/lander/i18n/locales/*` | `programmes.items.{id}` 三语文案（若 key 已存在可只改可用性） |

### 3.5 Site config / 导入导出（易漏）

`src/utils/siteConfig.ts` 在整合后仍有 **msba/mgm 二元硬编码**，新 pack 必须改：

| # | 位置 | 改什么 |
|---|------|--------|
| 16 | `SiteConfig` 接口 | 增加可选字段 `{id}?: ProgrammeUserConfig`（或改为可索引类型，避免每加一员改接口） |
| 17 | `noticesFor()` | 按 id 返回对应 pack 的 `teachingPlanNotices`（不要落到默认 msba） |
| 18 | `fetchCoursesCatalog()` | `base` 用 `/{id}/`，勿写死两站 |
| 19 | `parseSiteConfigJson` 的 `looksNested` | 识别新 pack 键（或改为「任意 catalogue id 子对象」） |

导出字段名使用 **catalogue id**（`msba` / `mgm` / `{id}`），不是展示名。跨专业备份靠 `currentProgramme` + 分 pack 嵌套；**禁止**静默合并不同专业的选课进同一 storage 前缀。

### 3.6 文案与关于页

| # | 位置 | 改什么 |
|---|------|--------|
| 20 | 共享 i18n 或 pack overlays | 免责声明、Programme Office、培养要求说明、关于页品牌句 |
| 21 | 培养要求页 | MSBA：规划提示多走 i18n；MGM：可走 `requirements.json` 的 `notes` / `planningRules`。新站选定一种，避免中英错乱 |
| 22 | `APP_VERSION_BASE` | **全站共享**（`vite.config.ts`）；新 pack **不必**单独版本号。数据同步一般 bump patch；纯文案可只靠 commit SHA |

### 3.7 localStorage 键约定

专业前缀：`{id}-`（与 `ProgrammeConfig.storage` / catalogue 一致）。

常见键：

| Key 模式 | 用途 |
|----------|------|
| `{id}-planner-selections` | 已选课 |
| `{id}-planner-wishlist` | 备选清单（MGM 旧键 `{id}-planner-backup` 首次加载会迁移到此） |
| `{id}-locale` | 语言 |
| `{id}-default-landing` | 默认落地页 |
| `{id}-sync-tz-mode` | 关于页同步时间时区 |
| `{id}-dismiss-teaching-plan-notice(:noticeId)` | TP 已读 |
| `{id}-dismiss-tutorial-conflicts` | TUT 冲突提示关闭 |
| `{id}-ics-export-format` | ICS 模板 |
| `{id}-pwa-install-banner-dismissed:v1` | 安装横幅 |

站点级（**不要**改成专业前缀）：

| Key | 用途 |
|-----|------|
| `tpghelper-preferred-programme` | lander / 打开偏好 |
| `tpghelper-site-config` | 最近一次导出快照（可选） |
| `tpghelper-auth-mode` | guest / logged-in |

同一浏览器多专业并存时，前缀必须不同。

---

## 4. 数据模型（填包前必读）

权威类型：[`src/types.ts`](../src/types.ts)。路径均相对该专业的 `public/{id}/`（即 Vite `publicDir`）。

### 4.1 `courses.json`

数组，每项一门课：

- `courseCode` / `courseTitle` / `module` / `courseType`：`Core` \| `Elective` \| `Capstone`
- `streamTags`：培养方向标签（无则 `[]`）
- `outlinePdfPath`：相对 public 根；班别不同 outline 时可写在 `sections[].outlinePdfPath`，课程级 `null`
- `examOrFinal`：课程级考试/展示；班别特例写 `sections[].examOrFinal`
- `sections[]`：
  - `sectionId`：`A`/`B`/…
  - `instructors[]`：`{ name, note? }`
  - `timeBucket`：`AM` \| `PM` \| `NT`
  - `dayPattern`、`meetingDays`
  - `meetings[]`：`sessionType` `lecture` \| `tutorial`；`date` `YYYY-MM-DD`；`startTime`/`endTime` `HH:mm`；`venue`
  - **`tutorialFor?`**：该 TUT 适用讲座班，如 `["A","B"]`  
    - TUT **仍复制到每个适用 section** 的 `meetings`  
    - `tutorialFor` 驱动课程页标签与 TP 班列（`TUT (A+B)` 等）及「与我相关」相交判断

非常规日期、晚间补课、周日课都直接写进 `meetings`，不要假设「每周固定」。

### 4.2 `requirements.json`

- `totalCourses` / `creditsPerCourse` / `electiveCount`
- `coreCourses[]`、`capstoneCourses[]`
- `streams`：concentration + list（`minRequired` + `courses[]`）；无 Stream 可 `{}`，并确认 `Requirements.tsx` 空态可接受
- `enrollmentRules?`：选课限制规则数组（见 **§4.2.1**）；仅当 pack `features.enrollmentRules === true` 时生效
- `notes[]` / `planningRules[]`：见上「文案策略」

课程**标题**展示时用课号回查 `courses.json`，不必在 requirements 里重复维护（Capstone 条目除外，JSON 内自带 title）。

#### 4.2.1 `enrollmentRules[]`（选课限制）

**开关**：`ProgrammeConfig.features.enrollmentRules`。为 `false` 时壳层忽略 JSON 中的规则（MSBA 默认关闭；MGM 为 `true`）。新 pack 可按需只开部分规则类型（例如仅 `prerequisite` / `antirequisite`，不必同时有 MGM 式互斥）。

**类型定义**：[`src/types.ts`](../src/types.ts) 的 `EnrollmentRule` / `EnrollmentRuleType`。

**实现入口**（改行为时优先读这些，勿在 Planner 里重复造逻辑）：

| 模块 | 职责 |
|------|------|
| [`src/hooks/useSelections.ts`](../src/hooks/useSelections.ts) | `mutualExclusion`、`allowMultiModule`；`formatEnrollmentRuleMessage`（培养要求页列表文案） |
| [`src/utils/prerequisites.ts`](../src/utils/prerequisites.ts) | `type: "prerequisite"` |
| [`src/utils/antirequisites.ts`](../src/utils/antirequisites.ts) | `type: "antirequisite"` |
| [`src/pages/Planner.tsx`](../src/pages/Planner.tsx) | 浏览 & 添加 / 备选 promote / 已选行上的拦截与提示 |
| [`src/pages/Requirements.tsx`](../src/pages/Requirements.tsx) | 开启 flag 且数组非空时展示规则摘要 |

**文案字段**：每条规则可选 `message`（英文）、`messageZh`（简中/繁中界面优先）。未填时由 `formatEnrollmentRuleMessage` 或 Planner 专用 helper 生成默认句（见下表）。

| `type` | 主要字段 | 行为摘要 | 默认说明文案（无 message 时） |
|--------|----------|----------|-------------------------------|
| `mutualExclusion` | `courses[]`, `scope`（现用 `"module"`） | 同一 **Module** 内，`courses` 中只能选一门 | 同一 Module 内 A 与 B 只能选其一 |
| `allowMultiModule` | `courseCode`, `modules[]`, `countsAsOneCourse?` | 同一课号可在列出的多个 Module 各选一段；`countsAsOneCourse: true` 时计 **1 门课** | 含 Module 列表的短描述 |
| `prerequisite` | `courseCode`（X）, `requires[]`（须已在规划中的课号） | 选 X 前，已选列表须包含 `requires` 中**每一门**（当前为 AND；无 OR 组） | X 需先选：… |
| `antirequisite` | `courseCode`（X）, `whenSelected[]`（Y…） | 若已选列表中**已有任意一门 Y**，则不能再选 X | 中文：`X对已选Y的学生不开放`；英文：`X cannot be selected when Y has been chosen`（多个已选 Y 时英文用 *any of*） |

**Planner 表现**（`enrollmentRules: true`）：

- **浏览 & 添加**：冲突时「选择」禁用，行内 `duplicate-hint` + 按钮 `title`；点击仍可能被 toast（`duplicateMsg`）拦截。
- **备选清单**：`prerequisite` / `antirequisite` / 互斥等与 promote 路径一致；`antirequisite` 时 promote 禁用并显示同上互斥文案。
- **已选列表**：仅 **`prerequisite`** 会在已选行上标红（前置未满足时隐藏修读状态切换）；`antirequisite` 只阻止**新选入** X，不自动标红「先选 X 后选 Y」的既有组合（若需双向互斥，应写两条规则或产品另定策略）。

**JSON 示例**（可混在同一数组；[`public/mgm/requirements.json`](../public/mgm/requirements.json) 含前两种）：

```json
"enrollmentRules": [
  {
    "type": "mutualExclusion",
    "courses": ["PMGM7001", "PMGM7002"],
    "scope": "module",
    "messageZh": "同一 Module 内 PMGM7001 与 PMGM7002 只能选其一",
    "message": "Within the same module, only one of PMGM7001 / PMGM7002 may be selected"
  },
  {
    "type": "allowMultiModule",
    "courseCode": "PMGM7016",
    "modules": [1, 3],
    "countsAsOneCourse": true,
    "messageZh": "…",
    "message": "…"
  },
  {
    "type": "prerequisite",
    "courseCode": "EXMP7001",
    "requires": ["EXMP7000", "EXMP7002"],
    "messageZh": "选 EXMP7001 前须已在规划中包含 EXMP7000、EXMP7002",
    "message": "EXMP7001 requires EXMP7000 and EXMP7002 in your plan first"
  },
  {
    "type": "antirequisite",
    "courseCode": "EXMP7003",
    "whenSelected": ["EXMP7001"],
    "messageZh": "EXMP7003对已选EXMP7001的学生不开放",
    "message": "EXMP7003 cannot be selected when EXMP7001 has been chosen"
  }
]
```

**注意**：规则只描述**课号级**约束，不区分班别；同一课号在规划中任意 section 出现即视为「已选」。更复杂的先修（仅 Registered、按 Module、OR 组）尚未实现，扩展时改 `prerequisites.ts` / `antirequisites.ts` 并保持 JSON 向后兼容。

### 4.3 Teaching Plan notices

- 文件：`src/programmes/{id}/teachingPlanUpdates.ts`，`teachingPlanNotices` **newest first**
- PDF：`public/{id}/teachingPlan/…_YYYYMMDD.pdf`
- 三语 body：共享 `src/i18n/locales/*` 的 `teachingPlan.body*`，或 pack `locales` 覆盖（MGM）
- 每条通知独立 `bodyKey`；**不要**改写旧通知文案
- TUT 行：`sectionId: 'TUT'` + `tutorialFor`；考试改时：`itemKey: 'examFinal'` + `itemDate`
- `dataSync`（pack `index.ts`）与最新通知时间戳对齐
- 冷启动：可空数组 + 首份 PDF + 完整 `courses.json`

细则：[`src/teachingPlan/README.md`](../src/teachingPlan/README.md)。

### 4.4 Site config 备份（schema 2.1）

见 [`src/utils/siteConfig.ts`](../src/utils/siteConfig.ts)：

- `schemaVersion: 2.1`
- `currentProgramme`：catalogue id
- 各 pack：`locale`、`defaultLanding`、`teachingPlanRead`（**发布时间戳 → true**）、`selections` / `wishlist` 瘦身行 `{ courseCode, sectionId, status }`
- 导入时按 `/{id}/courses.json` 水合标题与教授
- 仍接受旧 BA **1.5** 扁平备份（兼容代码存在即可，不必在新站宣传）

---

## 5. 功能开关（改 pack，少改壳）

`ProgrammeConfig.features`：

| Flag | MSBA | MGM | 含义 |
|------|------|-----|------|
| `wishlist` | true | true | 统一备选列表（原 BA wishlist + MGM backup） |
| `groupSelectedByType` | false | true | 已选列表按 Core/Elective/Capstone 分组（与 wishlist 无关） |
| `teachingPlanImpactCalendar` | true | true | 选课页内嵌 TP 改动层 |
| `enrollmentRules` | false | true | 读取 `requirements.json` → `enrollmentRules[]`（见 **§4.2.1**） |

wishlist 开启时按 `selectionTypeOrder` **大类分组**（组内可拖拽）。已选列表仅当 `groupSelectedByType` 时分组。展示文案用 i18n `planner.groupCore` / `groupCapstone` / `groupElective`（MSBA：Core · Capstone Core · Self Programme - Electives；MGM overlay：Core · Elective · Capstone）。MGM 旧 storage 键 `mgm-planner-backup` 会在首次加载时迁到 `mgm-planner-wishlist`。

**通常原样保留的壳能力**：选课冲突、月历、ICS（假日不上 ICS）、TP 通知 UI、PWA（`navigateFallbackDenylist` 含 `\.pdf$`）、三语、Study Status 粘贴（按 `studyStatus.courseCodePattern` 调正则）。

**按专业替换**：课表 / 培养要求 / TP 叙事 / 品牌与免责 / analytics / ICS prodId 与文件名。

---

## 6. 建议的 Agent 执行清单

```text
[ ] 选定 {id}；确认 lander 枚举与展示名
[ ] 复制 msba 或 mgm → src/programmes/{id}/ + public/{id}/
[ ] 填 ProgrammeConfig（storage 前缀、features、modules、studyStatus、ics、dataSync）
[ ] 扩展 ProgrammeId、catalogue、vite-env、vite PROGRAMME_META、select/build/dev 脚本、package.json
[ ] tpgSession PROGRAMME_APP_PATHS；lander available + i18n
[ ] siteConfig：SiteConfig 字段、noticesFor、fetchCoursesCatalog、looksNested
[ ] 编写 courses.json（含 tutorialFor）+ requirements.json + courseOutline + 首份 TP PDF
[ ] teachingPlanNotices（可空）+ i18n/overlays body；holidays.ts 按学年核对（共享）
[ ] npm run build:{id} 与 npm run build:site
[ ] npm run dev:all：lander 进入 /{id}/；选课冲突、TUT 范围、导入导出、PDF 大纲、PWA
[ ] push main；核对 Azure 与关于页 commit 链接（版本基线按产品约定 bump）
```

### 6.1 给下一个 Agent 的启动提示词模板

```text
请阅读 docs/AGENT_NEW_PROGRAMME_GUIDE.md、REQUIREMENTS.md、src/teachingPlan/README.md。
目标：在 tpghelper 仓库新增专业 pack「{显示名}」，id={id}，URL base=/{id}/。
模板：从 msba（或 mgm，若需要 enrollmentRules / 已选分组）复制。
数据源：附件 Teaching Plan PDF + 培养要求。
要求：扩展 ProgrammeId / catalogue / Vite / select-programme / build-site / dev-site / lander / siteConfig 硬编码；
替换课表与品牌；storage 前缀用 {id}-；不要新建独立 Pages 仓库。
完成后 npm run build:site 通过。提出 commit 信息供确认后再提交。
```

---

## 7. 历史踩坑（整合后仍成立）

1. **PDF iframe + Service Worker**：`navigateFallback` 必须 denylist `\.pdf$`。  
2. **Teaching Plan 红/绿**：绿常为旧改动残留；删除线红字可能是「取消」。邮件漏写的课以 PDF 为准。  
3. **Tutorial 归属**：共用格 ≠ 全课所有班；`tutorialFor` + 与已选讲座班相交。  
4. **CI / `tsc -b`**：`noUnusedLocals` / `noUnusedParameters` 会导致 `build:site` 失败。  
5. **备份**：已阅通知用**时间戳**做 key；选课只存 code+class+status；水合依赖在线 `courses.json`。  
6. **dismiss version**：按通知涉及 `courseCode` join；增删课号会让用户再见该则（有意为之）。  
7. **select-programme 与 dev:all**：gateway 子进程靠各自 `PROGRAMME` + Vite alias，勿在多实例间抢写同一 `activePack.ts` 而不重置。  
8. **siteConfig 二元分支**：只加 `public/` 与 pack 文件但忘了改 `noticesFor` / `fetchCoursesCatalog`，导入会落到错误课表。  
9. **GitHub Pages 已停用**：生产 base 为 `/`（Azure / 自定义域）；专业子路径是 `/{id}/`，不是 `/{repo}/`。

---

## 8. 与 MSBA / MGM 对照时看什么

| 维度 | 优先抄 MSBA | 优先抄 MGM |
|------|-------------|------------|
| 选修清单 / Stream 双列表 | ✓ | |
| locale overlays | 空 overlays 即可 | ✓ 免责与培养文案差异大时 |
| wishlist + groupSelectedByType | wishlist；已选扁平 | wishlist + 已选分组；enrollmentRules |
| enrollmentRules（互斥 / 跨 Module / prerequisite / antirequisite） | 按需开启 | ✓ |
| Module 数量 | 5 | 6 |
| 课号正则 | `MSBA\d{4}` | `(?:PMGM\|MFIN\|PMSC)\d{4}` |

用对照验证「接线清单」是否遗漏，而不是从零发明目录结构。

---

## 9. 明确不要做的事（除非新产品需求）

- 不要默认做后端选课、登录鉴权实装、容量限制、复杂先修求解器（OR 组、仅 Registered 等）、自动生成 study plan。  
- 不要把新专业做成第二个 GitHub Pages fork（除非产品明确要求）。  
- 不要混用 storage 前缀或把 A 专业备份静默写入 B 专业键。  
- 不要把 TP PDF 放进 `src/`；统一 `public/{id}/teachingPlan/`。  
- 不要在「加 pack」任务里顺手大重构共享 UI；先数据正确与 `build:site` 通过。  
- 不要只改 lander `available: true` 却未完成 Vite / build-site 接线（线上 404）。

---

## 10. 关联文档索引

| 文档 | 用途 |
|------|------|
| [`REQUIREMENTS.md`](../REQUIREMENTS.md) | 产品行为与验收（壳能力） |
| [`src/teachingPlan/README.md`](../src/teachingPlan/README.md) | Teaching Plan PDF 同步与通知表规则 |
| [`README.md`](../README.md) | 本地开发、`build:site`、Azure 部署 |
| 本文件 | **Agent 向**：新项目子站 pack 搭建 |

维护约定：若 `ProgrammeId` 接线方式、siteConfig schema、或构建脚本策略变更，**更新本文件**，避免下一个 Agent 仍按「两站硬编码」或「独立 Pages fork」操作。
