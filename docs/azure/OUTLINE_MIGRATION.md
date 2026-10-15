# Outline 表迁移计划（下一步）

当前大纲 PDF 路径在 **`Section.OutlinePdfPath`**（相对路径，如 `courseOutline/M2/….pdf`）。  
`dbo.Outline` 表为空是第一轮导入的刻意省略，站点仍可打开大纲。

## 目标

1. 一门课多份大纲（如 MSBA7003 的 A+B / C+D）在 `Outline` 里各一行，班通过 `Section.OutlineId` 引用。  
2. PDF 落到 Blob（`COURSE_OUTLINES_BASE_URL`），`Outline.PdfUrl` 存绝对 HTTPS。  
3. 跨专业点同一课号时，详情页只读公共 Outline，不依赖宿主专业的 `public/{id}/`。

## 建议步骤

1. **归并脚本**：扫各专业 `courses.json` / 库内 `Section.OutlinePdfPath`，按「学年 + 课号 + 规范化 PDF 内容哈希或路径」生成 `OutlineKey`（`shared` / `AB` / `CD` / `M1`…）。  
2. **INSERT Outline**，回填 `Section.OutlineId`，保留 `OutlinePdfPath` 一版作为回滚。  
3. **上传 Blob**：`26-27/{prefix}/{number}/{outlineKey}.pdf`，更新 `PdfUrl`。  
4. **API**：`catalogue.js` 已优先 `Outline.PdfUrl`；确认跨专业详情用站点根路径或 Blob URL。  
5. **清理**：稳定后可清空 `Section.OutlinePdfPath`，并从各 pack 的 `courseOutline/` 去掉已上云的重复文件（或保留作离线回退）。

## 不做的事

- 不必与 TP 通知迁移绑在同一发版。  
- 不必先改前端详情页结构；现有 `CourseOutlineViewer` 已支持绝对 `/…` 与 `https://…`。
