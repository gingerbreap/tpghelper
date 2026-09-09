# tpghelper (HKU TPg course planner shell)

Working tree for a **multi-programme** planner shell. Currently defaults to **HKU MSc(BA)** via `src/programmes/msba/`.

This directory was renamed from `HKUBS_BA_CourseList`. It is a **fork-style working copy**:
- Git remote `upstream` → `https://github.com/gingerbreap/HKUBS_BA_CourseList` (fetch only; push disabled)
- No `origin` until a new Azure/GitHub repo is created — do **not** `git push` to the old Pages repo unless explicitly intended

**Live BA site (unchanged until redeploy):** https://gingerbreap.github.io/HKUBS_BA_CourseList/

**Full backup of pre-rename state:** `/Users/gbrrrp/Workspace/HKUBS_BA_Helper` (includes `.git`; excludes `node_modules` / `dist` / `.venv`)

## Programme packs
| Pack | Path | Status |
|------|------|--------|
| MSBA | `src/programmes/msba/` | Active default |
| MGM | (from `HKUBS_MGM_CourseList`) | Not integrated yet |

## 功能概览
- **我的日历** / **我的选课**（默认可配置）/ 模块时间表 / 培养要求 / **关于**
- 选课冲突检查、备选清单、Study Status 导入、ICS 导出
- Teaching Plan 更新：影响摘要、明细表、选课日历改动可视化、更新存档
- 界面：简体 / 繁中（香港）/ English

## 文档
| 文档 | 说明 |
|------|------|
| [`REQUIREMENTS.md`](REQUIREMENTS.md) | 产品需求与验收标准 |
| [`src/teachingPlan/README.md`](src/teachingPlan/README.md) | Teaching Plan PDF 同步检查清单 |

## 本地开发
```bash
npm install
npm run dev
```

构建使用 Vite `base: '/tpghelper/msba/'`（见 `src/programmes/msba`）。本地 `npm run dev` 后打开该路径。Version 形如 `1.4.8.260909 (commit)`，见关于页。
