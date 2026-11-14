# Modern Web Guidance 合规审阅

**分支:** `dev/mwgCompliance`  
**日期:** 2026-11-14  
**技能来源:** [GoogleChrome/modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance)  
**安装方式:** `npx skills add GoogleChrome/modern-web-guidance` → `.agents/skills/{modern-web-guidance,chrome-extensions}`  
**工具版本:** `npx modern-web-guidance@latest`（`legacy-scan` / `search` / `retrieve`）

---

## 1. 审阅范围

对照本仓库**当前前端实现实际用到的能力**，用 MWG skills 做合规审阅（不是全站无差别现代化）。

| 本应用能力 | 主要代码 | 对应 MWG guides |
|---|---|---|
| 确认 / 详情 / 导入导出弹层 | `*Modal.tsx`, `ImportExport.tsx`, `ProgrammeMismatchGate` | `dialog`, `light-dismiss-a-dialog`, `platform-controls-dismiss-dialog`, `prevent-page-scroll-under-modal-dialog`, `html` |
| Planner / CourseDetail 分段切换 | `Planner.tsx` `.tabs`, `EventFormatModal` | `tabs` |
| 顶栏 / 底栏导航 | `App.tsx`, `index.css` mobile nav | `navbar`, `form-factor-adaptation` |
| 语言菜单 | `LanguagePicker.tsx` | `menu` |
| 剪贴板导入导出 | `userDataTransfer.ts`, `ImportExport.tsx` | `copy-button` |
| 选课提示 toast / 冲突 banner | `Planner.tsx` `.planner-toast`, `ConflictNotices` | `persistent-toast-notifications`, `accessibility` |
| PWA 安装 | `usePwaInstall`, `PwaInstallBanner`, `PwaSettings` | `install-web-app` |
| 日历滑动 / 列表拖拽 | `PlannerCalendar`, wishlist DnD | `natural-interactions`（检索命中；未强制采用 carousel/scroll-snap） |
| 安全区 / 触控布局 | `index.css` `env(safe-area-inset-*)` | `form-factor-adaptation` |

**明确不适用（已安装但未纳入审阅结论）：**

- `chrome-extensions` skill pack（本仓库不是 Chrome Extension）
- WASM / WebMCP / Passkeys / Built-in AI / WebGL 等（当前产品无对应功能）

---

## 2. `legacy-scan` 结果

```text
npx modern-web-guidance@latest legacy-scan src --json
→ totalFindings: 0
→ activeGuideCount: 33 (~20% of corpus with deterministic rules)
```

说明：确定性规则子集未扫出命中。**不等于**已符合全部 MWG；下文按产品实际用到的 guides 做人工对照。

---

## 3. 合规结论总览

| 优先级 | 主题 | 现状 | 建议 |
|---|---|---|---|
| P0 | 原生 `<dialog>` | ✅ `AppDialog` + 各 modal / ImportExport / PWA confirm / mismatch gate | — |
| P0 | 弹层滚动锁 | ✅ 已移除 body overflow；`dialog:modal` + `::backdrop` overscroll | — |
| P1 | Tabs 语义 | ✅ EventFormatModal；Planner Selected/Browse 仍为视图按钮（非 ARIA tabs） | — |
| P1 | Toast | ✅ region + 关闭钮 + `popover="manual"` + 焦点内暂停超时 | — |
| P1 | Language picker | ✅ Esc + 打开焦点 + 关闭回焦；完整 popover menu 留 P2 | — |
| P2 | Copy UX | ✅ 按钮旁 `role="status"` tip + 图标态；失败也会反馈；toast live region 常驻 | — |
| P2 | PWA install | `beforeinstallprompt` 自定义 UI | 与当前生态兼容；关注未来 Web Install API / `<install>` 作为增强，勿立刻替换 |
| P2 | 焦点 / 可访问名 | ✅ 课程详情用 heading `labelledby`；确认类 Cancel autofocus；详情默认焦关闭钮；关闭后回焦由原生 dialog 承担 | — |
| OK | Safe area | 已用 `env(safe-area-inset-*)` + `constant()` | 符合 form-factor 方向 |
| OK | 冲突 / 先修 banner | 持久可见 +「已读」 | 比 transient toast 更符合「重要信息用 banner」 |
| N/A | Dark mode | 产品未做系统暗色主题 | 无缺口；若要做再跟 `dark-mode` / `color` |

---

## 4. 分项审阅

### 4.1 Dialogs / Modals — `dialog` 系列

**涉及文件（抽样）：**  
`CourseDetailModal.tsx`, `OtherRequirementsConfirmModal.tsx`, `StreamSwitchModal.tsx`, `IcsExportModal.tsx`, `CalendarEventDetailModal.tsx`, `EventFormatModal.tsx`, `StudyStatusImportModal.tsx`, `ProgrammeMismatchGate.tsx`, `ImportExport.tsx` 内嵌 dialog, `PwaSettings.tsx`

**现状模式：**

```tsx
createPortal(
  <div className="modal-overlay" onClick={onClose}>
    <div role="dialog" aria-modal="true" …>
```

- 手写 Esc：`window.addEventListener('keydown', …)`
- 手写滚锁：`document.body.style.overflow = 'hidden'`
- 点击遮罩关闭（light dismiss）参差不齐：有的 overlay `onClick={onClose}`，确认框也有；缺少统一 `closedby` 语义

**相对 MWG 的主要偏差：**

1. 未使用原生 `<dialog>` + `showModal()`（平台已提供 top layer、inert、焦点圈、Esc、回焦）。
2. 显式添加了 MWG 对原生 modal **禁止**的 `role="dialog"` / `aria-modal`（在迁到 `<dialog>` 后应删除）。
3. 用 `body { overflow: hidden }` 锁滚动 — guide 明确 **DON'T**（会去掉根滚动条并造成布局跳动）；应改：

```css
dialog:modal { overscroll-behavior: contain; }
dialog::backdrop {
  overflow: hidden;
  overscroll-behavior: contain;
}
```

4. `OtherRequirementsConfirmModal` 等确认流缺少稳定的初始焦点（Cancel 上 `autofocus`）。
5. 关闭后焦点回到触发控件依赖手写；原生 dialog 可省略。

**建议落地顺序：**

1. 抽一个 `AppDialog`（React + `<dialog ref>` + `showModal()` / `close()`）。
2. 先迁确认类（`OtherRequirementsConfirmModal`, `StreamSwitchModal`），再迁详情类（`CourseDetailModal`）。
3. 删除各处 body overflow 与重复 Esc 监听。
4. Light dismiss：需要点外侧关闭的用 `closedby="any"`（Safari 缺支持时保留 click-backdrop 渐进增强，与 guide fallback 一致）。

### 4.2 Tabs — `tabs`

- **Planner** `Selected / Browse`：视觉 tabs，实为视图切换按钮；**不要**强行套 ARIA tabs 若语义是「两个页面模式」。可保持 `<button>`，确保有清晰选中态（非仅颜色）。
- **EventFormatModal** 已有 `role="tab"` + `aria-selected` + `aria-controls`，更接近 tabs；可对照 guide 补：
  - 容器 `tablist` / 未来 `focusgroup="tablist"`
  - 面板 `role="tabpanel"` + `hidden` / `hidden="until-found"`
  - 选中态不用「仅颜色」；用下划线等形状（Forced Colors）

### 4.3 Navbar / 触控布局 — `navbar`, `form-factor-adaptation`

- 桌面顶栏 + 移动底栏已做；safe-area 已处理。
- 建议抽查：底栏触控目标 ≥ 24×24 CSS px；横屏 / 动态工具栏用 `dvh` 处是否还有裁切（日历全屏）。

### 4.4 Menu — `menu` / LanguagePicker

- 现状：`aria-haspopup="listbox"` + `role="listbox"`/`option`，mousedown 外侧关闭。
- 合规方向：语言选择作为菜单更贴 `popover` + menu 模式；至少补 Esc 关闭与打开时焦点落入首选项。

### 4.5 Clipboard — `copy-button`

- **优点：** 导出走 `navigator.clipboard.writeText`；导入在用户手势同步启动 `readText()`（规避 Chromium transient activation）— 与现代 Clipboard 实践一致。
- **回退：** `document.execCommand('copy')` 可接受作窄场景 fallback。
- **缺口：** 成功态 live region / 明确「已复制」气泡未统一；icon-only 复制控件需稳定 `aria-label`。

### 4.6 Toast / 通知 — `persistent-toast-notifications`

- `planner-toast`：短时 `role="status"`，无关闭钮、无通知 landmark。
- MWG：重要信息应用 banner/dialog；toast 应用 `popover="manual"`、固定通知 region、可关闭；勿在 modal 打开时在背后弹 toast。
- **已较好的部分：** 冲突与先修缺失用红色/黄色 banner +「已读」，符合「重要状态用持久 UI」。

### 4.7 PWA — `install-web-app`

- 当前：`beforeinstallprompt` + 自定义 banner/设置页 — 仍是主流兼容路径。
- Guide 主推较新的 Web Install API / `<install>`（支持面仍在演进）。**建议：** 保留现有实现；在 Baseline 更稳后再作 progressive enhancement，不必为合规立刻改写。

### 4.8 Accessibility — `accessibility`（横切）

| 检查点 | 观察 |
|---|---|
| 语义标题 / 地标 | 页面有 `h1`；弹层标题不统一 |
| 键盘 | 多数按钮可聚焦；wishlist 拖拽依赖指针 |
| 焦点管理 | 自定义 modal 弱；迁 dialog 可大幅改善 |
| `prefers-reduced-motion` | 未系统覆盖动画 |
| 强制颜色 / 对比 | 选中态大量依赖色差；tabs/badge 需形状双重提示 |

### 4.9 HTML 架构 — `html`

- 资源：PWA / 课程 JSON / 大纲 PDF 为主；可在关键路径继续关注 `fetchpriority` / 字体与图片优先级（非本次阻断项）。
- 交互覆盖层应优先原生 Dialog/Popover，而不是继续扩张 `div` + ARIA 重建平台行为。

---

## 5. 改造路线

1. **P0 Dialog 统一组件** — ✅ `AppDialog` + 全站 modal 已迁 `<dialog>.showModal()`；去掉 body overflow / 手写 Esc；`closedby` + Safari light-dismiss fallback。
2. **P1** EventFormatModal tabs — ✅ `tablist`/`tab`/`tabpanel`、方向键、以 `aria-selected` 驱动下划线。
3. **P1** LanguagePicker — ✅ Esc 关闭并回焦触发器；打开时焦点落入首选项。
4. **P1** Toast — ✅ 固定 `role="region"`、可关闭、`popover="manual"`、焦点内暂停自动消失。
5. **路由过渡 / Loading** — ✅ `viewTransition` + `app-main` View Transition；课程/培养要求模块缓存；`PageLoading` spinner 替代整页「Loading...」文案。
6. **P2 Copy / 焦点** — ✅ ImportExport copy tip live region；课程详情 labelledby；AppDialog 默认焦关闭钮 / 表单 autofocus。
7. **P2（未做）** 全局更多 `prefers-reduced-motion`；LanguagePicker 完整 `popover`+menu；方向性 slide 过渡。
8. **文档（未做）：** 在 `AGENTS.md` 写明 Baseline / fallback 策略。

---

## 6. 复现命令

```bash
# 安装（已完成）
npx skills add GoogleChrome/modern-web-guidance

# 确定性遗留扫描（子集）
DISABLE_TELEMETRY=1 npx -y modern-web-guidance@latest legacy-scan src --json

# 按主题检索 / 拉取指南
DISABLE_TELEMETRY=1 npx -y modern-web-guidance@latest search "confirmation modal dialog"
DISABLE_TELEMETRY=1 npx -y modern-web-guidance@latest retrieve "dialog,tabs,copy-button,…"
```

Agent 侧：项目 skill 位于 `.agents/skills/modern-web-guidance/SKILL.md`，后续 UI 改动应先 `search`/`retrieve` 再写代码。

---

## 7. 本分支交付物

| 路径 | 说明 |
|---|---|
| `.agents/skills/modern-web-guidance/` | MWG 主 skill + guides |
| `.agents/skills/chrome-extensions/` | 随官方安装一并拷贝；本产品不适用 |
| `docs/MWG_COMPLIANCE_REVIEW.md` | 本审阅报告 |
