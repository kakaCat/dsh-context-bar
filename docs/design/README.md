# UI 设计稿（历史归档）

这里保留 `dsh-context-bar` 在实现过程中对齐过的界面设计稿，**不是产品截图**，图中数据均为演示值。真机截图见 [docs/screenshots](../screenshots/)（README「界面预览」章节）。

| 文件 | 说明 |
|---|---|
| `context-sidebar-v2.html` / `-v4.html` / `-v5.html` | 右侧 Sidebar「上下文」检查器的三次迭代；`v5` 为最终形态（总览 + 分类详情） |
| `v5-*.jpg` | v5 各视角效果图：总览、系统提示、工具、MCP、技能、附件预览 |
| `v4-*.jpg` | v4 迭代效果图：消息、系统提示、工具、MCP、技能 |
| `preview-collapsed.jpg` / `preview-messages.jpg` / `preview-prompt.jpg` / `preview-tools.jpg` | 早期折叠态与分类面板效果图 |
| `thin-meter.jpg` / `pill-meter*.jpg` | 条形计量条的两种视觉方案对比（最终采用细分段条） |
| `sample-image.webp` | 附件预览用示例图片 |

设计口径（最终实现）：

- 100% = 当前模型路由的完整 `contextWindow`；总占用取 `projectedTokens ?? pressureTokens`。
- 分类固定为：对话消息、文件附件、系统工具、MCP 工具、系统提示（条形图 5 段 + 剩余轨道）。
- 右侧检查器额外提供「技能」行（不计入条形图）。
- 颜色全部走 DSH 设计令牌（`--dsw-*`），主题切换跟随宿主。
