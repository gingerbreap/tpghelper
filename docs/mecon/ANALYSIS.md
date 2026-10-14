# MEcon pack — 初步分析（2026-08-12 Teaching Plan）

分支：`dev/mecon`  
数据源：

- Teaching Plan：`public/mecon/teachingPlan/MEcon_teaching_plan_2026-27_20260812.pdf`
- Regulations & Syllabuses：`src/MEcon_Regulations___Syllabuses_2026-27.pdf`（Curriculum Structure ≈ 第 4–6 页 / 文内页码 1–3 of Syllabuses）

`courses.json` 已由 `scripts/generate-mecon-courses.mjs` 生成（53 门课对象）。产品规则按 2026-10-14 确认落地。

---

## 1. Teaching Plan 结构

| 列 | 用途 |
|----|------|
| Module & Period | Summer / Semester 1 (M1&2) / Module 1–6 / Semester 2 (M4&5) |
| Course Code & Title | 课号 + 英文名；可含 equivalent / not open 注释 |
| Course Type* | Core / Stream Core / Capstone / Elective + 适用 Stream |
| Instructor | 可多位；部分行 OCR/排版错位 |
| Class | 常留空 → **统一 Class A**；亦有 A–D、Part I/II |
| Class day and time | 周几 + 时段；含 Block Mode、例外时段 |
| Class date | 具体日期清单 |
| Teaching venues | 教室；**部分含 `Final Exam: DD-Mon`（无独立考试栏）** |

### Module 编码（已写入 pack 约定）

| 显示 | `module` |
|------|----------|
| Bootcamp（Summer / ECON6067 Part I） | `0` |
| Module 1–6 | `1`–`6` |
| Semester 1 (M1-2) | `11` |
| Semester 2 (M4-5) | `12` |

### Course Type 用语（TP）→ 数据映射草案

| TP 原文 | `courseType` | `offeredToStreams` |
|---------|--------------|--------------------|
| Core course for all | Core | （省略=全员） |
| Core course for Theory / ARS | Core | THY, ARS |
| Core course for Data or Policy | Core | DA, PL |
| Stream Core for Data | Stream Core | DA |
| Stream Core for Policy | Stream Core | PL |
| Stream Core for Theory / ARS | Stream Core | THY, ARS |
| Stream Core for Theory, ARS and Policy | Stream Core | THY, ARS, PL |
| Capstone for Data and Policy | Capstone | DA, PL |
| Stream Core for Theory or ARS / Capstone for Theory | Stream Core（主）+ Capstone badge | THY, ARS（Capstone 仅 THY） |
| Elective | Elective | （全员，除非另注） |

不确定时以 Regulations 为准。

---

## 2. Curriculum Structure（Regulations / Syllabuses）

总要求：十门 6 学分，或八门 6 学分 + 一门 12 学分；三门 Fundamental Core + 一门 Capstone；强制一个 Stream。

### Fundamental Core（三选组，非「三门固定课号」）

**ARS / Theory**

1. Micro：ECON6011 **或** ECON6092  
2. Macro：ECON6012 **或** ECON6093  
3. Econometrics：ECON6001 **或** ECON6005 **或** ECON6113  

**Data / Policy**

1. Micro：ECON6021 **或** ECON6011（强背景）  
2. Macro：ECON6022 **或** ECON6012（强背景）  
3. Econometrics：同上三选一  

大量 antirequisite（已写入 `requirements.json` 草案）。

### Stream Core（各方向选 3）

见 `public/mecon/requirements.json` → `streams.*.courses`（来自 Syllabuses 列表；**当年未必全部开课**）。

### Capstone

| Stream | 选项 |
|--------|------|
| ARS | ECON6080 Research Thesis（12 credits） |
| DA / PL | ECON6116 / PMSC7901 / PMSC7902 |
| Theory | ECON6077 / ECON6078 / PMSC7901 / PMSC7902 |

ECON6077 / ECON6078：Syllabuses 注明亦可满足 Theory Capstone；TP 将 ECON6078 标为 Stream Core for Theory/ARS **及** Capstone for Theory。

### 本版 TP 未出现、但 Regulations 列出的课（导入时默认不建会议，除非你要求占位）

- ECON6080 Research Thesis  
- ECON6077 Topics in Economic Research I  
- 若干 Stream Core 列表课（如 ECON6010、ECON6056、ECON6082…）  

---

## 3. 与 MSBA / MGM 的差异（产品）

1. **强制 Stream**：未选 ARS/THY/DA/PL 时隐藏日历与选课列表；「方向完成度」引导选择；「切换 Stream」弹窗。  
2. **类型徽章**：Core / Stream Core / Capstone / Electives；6077/6078 双徽章，备选默认可拖 Stream Core↔Capstone。  
3. **Semester 课**存 11/12，显示 Semester X (MY-Z)。  
4. **ECON6067** Bootcamp + Part II，成对才计入毕业；班别可混搭；同页 Part tab。  
5. **空 Class → A**；**Final Exam 嵌在 venues 列**。

### 已确认产品规则（2026-10-14）

- Analytics：`G-H1NZELQQ9L`
- ECON6067：同课号跨 module 0/1，`sections[].part`；Part 成对才计入；班别可混搭
- 他 Stream 的 Core/STM CORE → 显示为 Elective + 前缀 badge（如 `THY/CORE`）；**Capstone 非本 Stream 列表则隐藏**
- Badge：本 Stream 状态无前缀（`STM CORE` 缩写）；他 Stream 状态加缩写前缀
- Stream 切换弹窗：政策下拉 + 改动预览表
- Semester 文案短号：`Semester 1 (M1-2)` / `Semester 2 (M4-5)`

---

## 4. 接线与验证

- Pack 接线完成；`npm run build:mecon` 通过
- 本地：`npm run dev:mecon` 或 `npm run dev:all` → `/mecon/`
