# Azure 课表库配置（仅 Microsoft Entra）

Azure Data Studio 已停用。用下面任一工具执行 `sql/` 里的脚本即可。

## 推荐：门户查询编辑器

1. 打开 [Azure 门户](https://portal.azure.com) → **SQL databases** → 数据库 **`tpghelper`**。
2. 左侧 **查询编辑器**（Query editor）。若提示登录，选 **继续以 Microsoft Entra ID 登录**，用建库时的 Entra 管理员账号。
3. 若连不上：打开同一资源下的 **SQL 服务器** → **网络** → **添加客户端 IP** → 保存，再重试编辑器。
4. 打开仓库文件 `sql/001_schema.sql`，全部粘贴到编辑器 → **运行**。
5. 再打开 `sql/002_app_identity.sql`，全部粘贴 → **运行**。  
   （其中已写入托管标识 Object ID `7736104c-5f1a-469a-8510-675140b4ada4`。）
6. 可选自检：

```sql
SELECT name, type_desc FROM sys.database_principals WHERE name = N'tpghelper';
SELECT name FROM sys.tables ORDER BY name;
```

应能看到用户 `tpghelper`，以及表 `Course`、`Offering`、`Section`、`Meeting`、`Outline`、`ProgrammeCourse`。

## 备选：VS Code

1. 安装扩展 **SQL Server (mssql)**（Microsoft）。
2. 新建连接：服务器 `你的服务器.database.windows.net`，数据库 `tpghelper`，身份验证 **Microsoft Entra ID - Universal with MFA support**。
3. 依次运行 `sql/001_schema.sql`、`sql/002_app_identity.sql`。

## App Service 环境变量

`tpghelper` 应用 → **环境变量** → 添加后保存并**重启**：

| 名称 | 值 |
|------|-----|
| `SQL_SERVER` | `你的服务器.database.windows.net` |
| `SQL_DATABASE` | `tpghelper` |
| `SQL_AUTH` | `entra` |
| `ACADEMIC_YEAR` | `26-27` |
| `COURSE_OUTLINES_BASE_URL` | （可选）Blob 前缀；暂空则大纲仍走各专业静态路径 |

不要写入数据库密码或存储密钥。

## 存储帐户（大纲 PDF，可稍后）

1. 创建存储帐户 + 容器 `course-outlines`，匿名访问级别 **Blob**。
2. 把 `COURSE_OUTLINES_BASE_URL` 设为  
   `https://<帐户>.blob.core.windows.net/course-outlines`。
3. 上传脚本用本机密钥；密钥不要放进 App Service。

## 本机导入课表

```bash
# 需要已 az login（Entra）且防火墙已放行本机 IP
export SQL_SERVER=你的服务器.database.windows.net
export SQL_DATABASE=tpghelper
export SQL_AUTH=entra
export ACADEMIC_YEAR=26-27
npm run db:import-courses
```

未配置 `SQL_SERVER` 时，网站 API 会回退读取 `public/{msba,mgm,mecon}/courses.json`，本地开发不依赖数据库。

## 你需要告诉维护者的非秘密信息

- SQL 主机名、数据库名（应为 `tpghelper`）
- 托管标识已开（Object ID 已知）
- App Service 环境变量已保存并重启
- （若有）存储帐户名与 `COURSE_OUTLINES_BASE_URL`
