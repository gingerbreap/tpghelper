# tpghelper (HKU TPg course planner shell)

Working tree for a **multi-programme** planner shell. Programme packs live under `src/programmes/{msba,mgm}/`; static data under `public/{msba,mgm}/`. The universal lander (`PROGRAMME=lander`) lives at `/tpghelper/` and routes guests into a programme app.

This directory was renamed from `HKUBS_BA_CourseList`. It is a **fork-style working copy**:
- GitHub `origin` → https://github.com/gingerbreap/tpghelper.git
- Do **not** push to the old BA Pages repo / `upstream` unless explicitly intended
- Sibling MGM fork (read-only source): `/Users/gbrrrp/Workspace/HKUBS_MGM_CourseList`

## Programme packs
| Pack | Path | Public assets | URL base |
|------|------|---------------|----------|
| Lander (root) | `src/lander/` | none | `/tpghelper/` |
| MSBA (default) | `src/programmes/msba/` | `public/msba/` | `/tpghelper/msba/` |
| MGM | `src/programmes/mgm/` | `public/mgm/` | `/tpghelper/mgm/` |

Build selects one active pack via `PROGRAMME=lander|msba|mgm` (default `msba`). Vite sets `base`, `publicDir`, analytics id, and `__PROGRAMME_ID__`.

The lander is a small HashRouter app (`#/`, `#/programmes`). Choosing an available programme navigates with a full page load to `/tpghelper/msba/` or `/tpghelper/mgm/` (separate builds).

## 功能概览
- **根入口 lander**：登录（暂禁用）/ 访客 → 课程项目选择（目前 MGM / MSc(BA) 可用）
- **我的日历** / **我的选课**（默认可配置）/ 模块时间表 / 培养要求 / **关于**
- 选课冲突检查；BA 备选清单 / MGM 备份列表；Study Status 导入、ICS 导出
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

# Universal lander at /tpghelper/
npm run dev:lander

# MSBA (default)
npm run dev
# or
npm run dev:msba

# MGM
npm run dev:mgm
```

Dev server opens the selected base path (`/tpghelper/`, `/tpghelper/msba/`, or `/tpghelper/mgm/`).

Lander → programme navigation expects the programme apps at their production paths. For local end-to-end checks, run lander and a programme build on the same host (or open the programme `dev:*` URL after picking).

## 构建
```bash
npm run build:lander    # → dist at base /tpghelper/
npm run build           # PROGRAMME defaults to msba
npm run build:msba
npm run build:mgm
```

Deploy lander to the site root `/tpghelper/` and each programme build under its own subdirectory.

Version 形如 `1.4.8.260909 (commit)`，见关于页。
