# 更新日志

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.1.0] - 2026-10-31

首个开源版本。

### 新增

- `conversation.input.dock` 上下文用量条：折叠态为细分段条 + `已用 N%` + `已用 / 窗口`；点开为分类面板（对话消息 / 文件附件 / 系统工具 / MCP 工具 / 系统提示），点面板外或按 `Escape` 收起。
- 右侧 Sidebar「上下文」标签页：系统提示词全文、工具 schema（按命名空间 / MCP server 分组，可展开完整 `parameters`）、对话消息（工具入参 / 输出折叠）、技能、文件附件预览。
- Host 投影 `contextBreakdownDetailed`，折叠与 token-meter 相同的 durable surface 事件，并处理 compaction 阴影价；Host 半不可用时回退到内置三段 `contextBreakdown`。
- Host 路由 `/api/context-bar.ui`（按分类懒加载内容）与 `/api/context-bar.file`（附件预览）。
- 中英文界面文案、插件展示元数据（`locale/en.json`、`locale/zh.json`）与图标。
- 纯 JS、无第三方依赖、无需构建；43 个 `node:test` 用例；GitHub Actions CI。

### 安全

- 附件预览只经 `ctx.attachments` 服务读取 content-addressed 对象，不跟随会话事件里的文件路径，也不遍历工作区文件。
- 预览先按引用字节数预检，流式读取时累计封顶 12MB（超限 413）；路由返回稳定错误码，不回传内部错误文本。
- skills 读取透传请求取消信号并带 4 秒截止；投影 checkpoint 的 `claim` 结构纳入校验。
