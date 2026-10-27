# 当前开发基准

核对日期：2026-10-24（Asia/Shanghai）。

按用户要求，以当前 Obsidian 已安装的 AIWXEdit 为开发基准。

- 安装目录：`D:\Obsidian Vault\.obsidian\plugins\aiwxedit`
- 基准版本：`1.0.1`，沿用安装版标记。
- GitHub：`https://github.com/IsHexx/AIWXEdit`
- 核对时本地 HEAD 与 GitHub `main` 均为 `70b69cd6138ba19f732037b239501d4911fb8a5e`。
- 首次核对未创建提交或推送；随后按用户要求，将本地基准源码、版本元数据和完整主题资源纳入 GitHub `main`。Obsidian 安装目录保持不变，不创建发布标签。

## 核对结果与同步内容

同步前，本地 `main.js` 与安装版逐字节相同；现有源码的生产构建也与安装版相同，仅构建注释的 CRLF/LF 换行不同。

安装版 manifest 为 `1.0.1`，项目 manifest/package 原为 `1.0.5`。已将 `manifest.json`、`package.json` 和锁文件的根包版本统一为 `1.0.1`。`versions.json` 保留历史发布版本映射，不代表当前版本。

已从安装目录同步 `main.js`、`manifest.json`、`styles.css` 及完整 `assets/`。其中 `styles.css` 原本仅有换行符差异。`assets/` 包含安装版实际使用的主题和代码高亮资源，共 114 个文件；`assets_backup/` 保留原有历史资源。

核对时原有的四处未提交源码修改已保留，并纳入本次基准提交；重建结果证明它们属于当前安装程序的源码状态：

- `src/infrastructure/css/baseWechatCss.ts`
- `src/infrastructure/css/postcssInline.ts`
- `src/infrastructure/markdown/plugins/CodeBlockPlugin.ts`
- `src/infrastructure/wechat/WechatClient.ts`

没有复制安装目录中的 `data.json`。它包含个人运行配置，不属于项目代码基准。

`assets/themes/` 的 40 个主题、`assets/highlights/` 的 72 个高亮样式，以及两份 JSON 配置均纳入版本控制，确保新检出的项目保留当前安装版的样式基准。主题来源与许可说明见 `THIRD_PARTY_NOTICES.md`。现有发布工作流仍只发布三个 Obsidian 插件文件。

## 验证

- `npm run build` 通过，包含 TypeScript 检查和生产构建。
- 生产构建与安装版 `main.js` 在统一换行符后完全相同。构建检查后恢复安装版原文件，确保项目内基准程序逐字节一致。
- 项目与安装目录的 117 个发布及资源文件逐字节一致，资源文件清单也一致。
- 源码、配置和文档的 `git diff --cached --check` 通过。安装版主题和高亮 CSS 保留原文件内容，包括原有行尾空白。

基准 `main.js` SHA-256：

```text
91d9335a04d69133e1bb1a1775da51c2d6699e9df014fdcec31d49c57f5c48e0
```

`main.js` 继续遵循现有 Git 忽略规则，由源码构建生成。正常构建可能改变注释换行符，不影响程序内容。

## 恢复点

同步前的源码、发布文件、资源、包版本和未提交差异已备份到：

```text
C:\Users\Hex\.codex\backups\AIWXEdit\20261024-114928
```

## 2026-10-24 版本链对齐(发布准备)

上架诊断结论:插件从未进入官方审核队列(无 obsidian-releases 提交记录,目录未收录),且"默认分支 manifest 必须有同版本公开 Release"的硬性校验不满足(manifest 为 1.0.1,而 Release 只有 1.0.4/1.0.5)。

按发布门禁修复:源码在 1.0.5 后有变更,不复用旧版本号、不覆盖已发布资产,统一升版为 **1.0.6**(manifest.json、package.json、package-lock.json、versions.json),tag `1.0.6` 指向本次提交,由现有 release workflow 构建并发布三个官方资产。

## 2026-10-27 排版与原文链接（1.0.9）

在远端 `1.0.8` 的基础上保留外层零边距修复，并将默认链接改为原文名称上的直接链接。旧的脚注设置在加载时自动迁移，不再自动追加论文式编号和参考链接列表。兼容参考资料中的 `[名称]：网址` 写法，不修改笔记原文。

主题仍沿用 `1.0.8` 的独立下载与本地存储方式，不重新纳入发布包。当前已安装的主题、高亮样式和账号配置保留。

## 2026-10-27 阅读留白与草稿弹窗（1.0.10）

按用户补充要求，阅读预览恢复独立留白（窄窗口两侧 16px），复制与发布仍保持文章外层零边距。草稿弹窗新增笔记属性和账号默认值预填、正文摘要提取、阅读原文链接、留言权限、账号偏好记忆、分享信息预览、显式草稿文章选择、提交错误重试与成功后的微信后台入口。切换账号重置封面素材与草稿选择，不再自动选取最近上传的任意封面，也不再隐式覆盖同名草稿。

研究依据为微信当前官方 draft/add 文档（2026-10-27 查询）：支持作者、摘要、原文链接与留言字段，未列出原创声明写入参数；原创和转载权限保留为微信后台确认事项。新增 `test:publish` 验证字段预填、校验、真实序列化与新建/更新分支；独立 Obsidian 测试库验证桌面深浅色、390px 窄窗口、提取摘要、切换账号、留言联动、校验、第二篇草稿更新、保存失败重试、成功状态与账号偏好保存，无真实微信请求。
