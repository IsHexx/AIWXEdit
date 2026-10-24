# 1.0.6 发布准备与验收记录

记录日期：2026-10-24（Asia/Shanghai）。本文件记录发布候选的本地证据，**不代表官方商城已收录**。

## 已完成

- 阅读用户提供的 qiaomu-obsidian-dev 发布与故障经验，并核对当日官方提交文档；使用 Community 后台提交流程。
- 版本统一为 1.0.6；最低版本调整为 1.7.2，与现有 Workspace.revealLeaf 调用的官方 API 版本相符。历史版本映射保留。
- 删除用途不符的 fundingUrl，纠正尚未上架和未实现公式渲染的说明。
- 补齐网络服务、账号、可选 AI 费用、复制时上传图片、未加密凭据存储和第三方许可披露。
- 修复 HTML 安全过滤、预览异步结果覆盖、视图监听清理、卸载状态/凭据缓存清理和重载时注册视图的时机。
- 依赖更新后 npm audit 为 0 个漏洞。
- Node.js 22.23.4 下干净 npm ci 和 npm run check 通过；两次生产构建的 main.js 字节一致。
- 使用官方最新 API 定义额外检查最低版本，没有发现超出声明版本的 API 错误；随后恢复锁文件指定的开发类型包。
- 官方 ESLint recommended：0 错误，49 条建议。43 条针对独立 Document 中原生 DOM 元素创建，保留以维持导出文档的所有者；5 条是数字加 px 的大小写误报；1 条建议采用 1.13+ 声明式设置搜索，当前保留兼容旧版的 display API。没有关闭这些规则。
- 打包三个安装文件，并记录 [字节数与 SHA-256](release-assets-1.0.6.json)。

## 真实 Obsidian 验收

环境：Obsidian 1.14.5，安装程序 1.12.7，macOS。使用独立应用配置和仅包含人工测试笔记的 AIWXEdit-QA 库，安装目录 `/tmp/aiwxedit-release-qa/AIWXEdit-QA/.obsidian/plugins/aiwxedit/`。

仅复制 main.js、manifest.json、styles.css，不依赖资产目录或原有个人配置。完成 12 项检查：三文件安装、六个离线主题、中文预览、内联样式、表格、代码高亮、复制用 HTML、安全过滤、乱序异步预览、视图关闭重开、缺少账号的错误提示、插件卸载重载。检查期间捕获的宿主错误为 0，最终预览订阅数量为 1。详见 [原始结果](host-smoke-1.0.6.json) 和 [真实截图](screenshots/desktop-preview.png)。

验收后的三个安装文件与最终 Node.js 22 构建逐字节一致。

## 许可处理

用户确认没有 MWeb 授权后，从本次候选分支的两份资源目录移除 62 个 CSS 文件，从资源索引和内置下载目录移除对应入口。备份保存在：

`/Users/Hex/.codex/backups/AIWXEdit/20261024-marketplace-mweb/`

未修改日常库中已安装的主题。历史 Git 提交仍可能包含这些内容，不能作为已取得授权的素材重新分发。Markdown Nice 的独立 CSS 保留原许可，并补齐 GPL-3.0 许可文本与适用范围；插件自身维持 MIT。

## 仍须完成或核实

- GitHub 候选分支的远端 CI、Release 和匿名资产下载结果应分别记录，不能以本地构建替代。
- Obsidian Community 登录、关联 GitHub、正式提交及官方审核结果尚未验证。
- 官方目录展示、客户端搜索和从商城安装尚未验证。
- 本次没有使用真实公众号凭据或付费 AI 调用；微信 API 发布/更新、AI 生成和手机真机尚未验证。

提交文案见 [MARKETPLACE.md](MARKETPLACE.md)，发布步骤见 [RELEASING.md](RELEASING.md)。未满足的项目不得在对外交付中写成已通过。
