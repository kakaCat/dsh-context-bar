/* Context bar + right-Sidebar context inspector.
 *
 * Dock: a thin Claude Code v2-style segmented bar above the composer. Clicking
 * it opens the inline breakdown panel; clicking a category there opens the
 * right Sidebar on the "上下文" tab.
 *
 * Sidebar tab: the actual context sent to the model — message log, attachments,
 * tool definitions grouped by namespace/server, skills, and the raw system
 * prompt. Attachment rows open a preview tab inside the right Sidebar.
 *
 * Data: token-meter projections (contextPressure/contextBreakdown) plus this
 * bundle's Host projection contextBreakdownDetailed and the Host routes
 * /api/context-bar.ui and /api/context-bar.file.
 */

window.__ModuleLoader__.load({
  id: 'dsh-context-bar',
  factory(require) {
    const React = require('react')
    const h = React.createElement

const NS = 'context-bar'

const LOCALES = {
  zh: {
    title: '上下文',
    used: '已用 {percent}%',
    ariaSummary: '模型上下文已用 {percent}%，约 {used} / {total} tokens',
    segmentTitle: '{label}：约 {tokens} tokens，占上下文窗口 {percent}%',
    messages: '对话消息',
    attachments: '文件附件',
    systemTools: '系统工具',
    mcpTools: 'MCP 工具',
    skills: '技能',
    system: '系统提示',
    builtinTools: '内置工具（默认）',
    pluginGroup: '{name} 工具',
    serverGroup: '{name}（server）',
    loading: '正在读取…',
    loadError: '读取失败',
    retry: '重试',
    empty: '暂无内容',
    parameters: 'parameters',
    argumentsLabel: '入参',
    outputLabel: '输出',
    errorLabel: '错误',
    viewContent: '查看内容',
    copy: '复制全文',
    copied: '已复制',
    copyFailed: '复制失败',
    attachmentTab: '附件',
    openAttachment: '在右侧栏打开',
    back: '返回上下文',
    sessionMissing: '无会话',
    tokensLabel: 'tokens',
    windowLabel: '上下文窗口 {tokens}',
    remaining: '剩余 {tokens}',
    characters: '约 {count} 字符',
    roles: { user: 'user', assistant: 'assistant', tool: 'tool', system: 'system' },
  },
  en: {
    title: 'Context',
    used: '{percent}% used',
    ariaSummary: 'Model context {percent}% used, about {used} of {total} tokens',
    segmentTitle: '{label}: ~{tokens} tokens, {percent}% of the context window',
    messages: 'Messages',
    attachments: 'File attachments',
    systemTools: 'System tools',
    mcpTools: 'MCP tools',
    skills: 'Skills',
    system: 'System prompt',
    builtinTools: 'Built-in tools (default)',
    pluginGroup: '{name} tools',
    serverGroup: '{name} (server)',
    loading: 'Loading…',
    loadError: 'Failed to load',
    retry: 'Retry',
    empty: 'No content',
    parameters: 'parameters',
    argumentsLabel: 'arguments',
    outputLabel: 'output',
    errorLabel: 'error',
    viewContent: 'View content',
    copy: 'Copy all',
    copied: 'Copied',
    copyFailed: 'Copy failed',
    attachmentTab: 'Attachment',
    openAttachment: 'Open in right sidebar',
    back: 'Back to context',
    sessionMissing: 'No session',
    tokensLabel: 'tokens',
    windowLabel: 'Context window {tokens}',
    remaining: '{tokens} left',
    characters: '~{count} chars',
    roles: { user: 'user', assistant: 'assistant', tool: 'tool', system: 'system' },
  },
}

function translate(t, key, params) {
  if (typeof t === 'function') return t(key, params)
  const template = LOCALES.zh[key] || key
  return String(template).replace(/\{(\w+)\}/g, (_, name) => String(params?.[name] ?? ''))
}

function formatTokens(value) {
  const scaled = (n) => (n >= 100 ? String(Math.round(n)) : String(Math.round(n * 10) / 10))
  if (value < 1000) return String(Math.round(value))
  if (value < 1000000) return `${scaled(value / 1000)}k`
  return `${scaled(value / 1000000)}M`
}

function formatPercent(value, decimals = 1) {
  return `${value.toFixed(decimals)}%`
}

const CATEGORIES = [
  { key: 'messages', color: 'var(--dsw-static-blue-450, #4c8dff)' },
  { key: 'attachments', color: 'var(--dsw-static-orange-400, #e0914b)' },
  { key: 'systemTools', color: 'var(--dsw-static-green-450, #46b28a)' },
  { key: 'mcpTools', color: 'var(--dsw-static-yellow-450, #e3b341)' },
  { key: 'system', color: 'var(--dsw-static-violet-400, #a78bfa)' },
]
const SKILLS_COLOR = 'var(--dsw-static-cyan-450, #56b6c2)'

const DETAILED_FIELDS = {
  messages: 'messageTokens',
  attachments: 'attachmentTokens',
  systemTools: 'systemToolsTokens',
  mcpTools: 'mcpToolsTokens',
  system: 'systemTokens',
}
const BASIC_FIELDS = { messages: 'messageTokens', system: 'systemTokens', systemTools: 'toolsTokens' }

function contextView(pressure, detailed, basic) {
  const used = pressure?.projectedTokens ?? pressure?.pressureTokens
  const window_ = pressure?.contextWindow
  if (used === undefined || window_ === undefined || window_ <= 0) return null
  const fields = detailed === undefined ? BASIC_FIELDS : DETAILED_FIELDS
  const source = detailed === undefined ? basic : detailed
  const rows = CATEGORIES
    .filter((category) => category.key in fields)
    .map((category) => {
      const tokens = Math.max(0, source?.[fields[category.key]] ?? 0)
      return { ...category, tokens, percent: Math.min(100, (tokens / window_) * 100) }
    })
    .filter((row) => row.tokens > 0)
  return { used, window: window_, usedPercent: Math.min(100, (used / window_) * 100), rows }
}

const CSS = `
.dcb-root {
  box-sizing: border-box;
  flex: none;
  margin: 0 auto;
  width: calc(100% - var(--dsh-composer-side-clearance, 0px) * 2 - var(--dsh-composer-dock-inset, 0px) * 4);
  max-width: calc(var(--dsh-composer-card-max-width, 100%) - var(--dsh-composer-dock-inset, 0px) * 4);
  font: inherit;
  font-size: 12px;
  line-height: 20px;
  color: var(--dsw-alias-label-secondary, #9aa0a8);
  font-variant-numeric: tabular-nums;
  -webkit-font-smoothing: antialiased;
}
.dcb-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 24px;
  padding: 0 2px;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  border-radius: var(--dsw-radius-sm, 6px);
}
.dcb-row:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.12)); }
.dcb-track {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  height: 4px;
  border-radius: 999px;
  background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.22));
  box-shadow: inset 0 1px 1px rgba(0,0,0,.3);
  overflow: hidden;
}
.dcb-track span {
  position: absolute;
  top: 0;
  bottom: 0;
  min-width: 2px;
  border-radius: 999px;
}
.dcb-used { color: var(--dsw-alias-label-secondary, #9aa0a8); white-space: nowrap; }
.dcb-total { color: var(--dsw-alias-label-tertiary, #7d8590); white-space: nowrap; }
.dcb-chevron { display: inline-flex; transition: transform .15s ease; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-chevron.open { transform: rotate(180deg); }

.dcb-panel {
  margin: 2px 0 6px;
  padding: 12px 14px 8px;
  border-radius: var(--dsw-radius-lg, 12px);
  background: var(--dsw-specific-menu, var(--dsw-alias-bg-layer-2, #202329));
  border: .5px solid var(--dsw-alias-border-l1, rgba(128,128,128,.25));
  box-shadow: var(--dsw-elevation-prominent, 0 8px 24px rgba(0,0,0,.18));
}
.dcb-panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 0 6px;
  color: var(--dsw-alias-label-primary, #e8eaed);
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
}
.dcb-panel-title { flex: 1 1 auto; }
.dcb-panel-close {
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-tertiary, #7d8590);
  font: inherit;
  font-size: 16px;
  line-height: 20px;
  cursor: pointer;
  padding: 0 4px;
}
.dcb-panel-summary {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 2px 0 8px;
  font-size: 13px;
}
.dcb-panel-summary .dcb-used { color: var(--dsw-alias-label-primary, #e8eaed); font-size: 15px; }
.dcb-panel .dcb-track { flex: none; width: 100%; margin-bottom: 10px; height: 4px; }
.dcb-panel-cats { display: flex; flex-direction: column; }
.dcb-panel-cat {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 30px;
  padding: 0 2px;
  border: none;
  border-radius: var(--dsw-radius-sm, 6px);
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}
.dcb-panel-cat:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.12)); }
.dcb-panel-cat .dcb-cat-name { flex: 1 1 auto; color: var(--dsw-alias-label-primary, #e8eaed); }

/* Right-Sidebar tab body */
.dcb-side {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  box-sizing: border-box;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 14px 14px 22px;
  color: var(--dsw-alias-label-secondary, #9aa0a8);
  font-size: 12px;
  line-height: 20px;
  font-variant-numeric: tabular-nums;
}
.dcb-side::-webkit-scrollbar { width: 9px; }
.dcb-side::-webkit-scrollbar-thumb {
  background: rgba(128,128,128,.28);
  border-radius: 5px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

.dcb-usage { padding: 0 2px; }
.dcb-usage-row { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px; }
.dcb-usage-row .dcb-used { font-size: 22px; font-weight: 600; color: var(--dsw-alias-label-primary, #e8eaed); }
.dcb-usage-row .dcb-total { font-size: 12.5px; }
.dcb-usage-note { display: flex; justify-content: space-between; margin-top: 8px; font-size: 11px; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-usage .dcb-track { width: 100%; flex: none; height: 4px; }

.dcb-cats { margin-top: 12px; }
.dcb-cat { border-top: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.16)); }
.dcb-cat-head {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  height: 36px;
  padding: 0 2px;
  border: none;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.dcb-cat-head:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.08)); }
.dcb-swatch { flex: none; width: 8px; height: 8px; border-radius: 2px; background: var(--dcb-color); }
.dcb-cat-name { flex: 1 1 auto; font-size: 13px; font-weight: 500; color: var(--dsw-alias-label-primary, #e8eaed); }
.dcb-cat-tokens, .dcb-cat-pct {
  flex: none;
  text-align: right;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary, #9aa0a8);
  font-variant-numeric: tabular-nums;
}
.dcb-cat-tokens { width: 54px; }
.dcb-cat-pct { width: 46px; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-cat-chev { flex: none; display: grid; place-items: center; width: 14px; color: var(--dsw-alias-label-tertiary, #7d8590); transition: transform .15s ease; }
.dcb-cat.open > .dcb-cat-head .dcb-cat-chev,
.dcb-group.open > .dcb-group-head .dcb-cat-chev { transform: rotate(90deg); }
.dcb-cat-body { display: none; padding: 0 0 10px 17px; }
.dcb-cat.open > .dcb-cat-body { display: block; }

.dcb-loading { padding: 10px 0; font-size: 11px; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-error { padding: 6px 0; font-size: 11px; color: var(--dsw-alias-state-error-primary, #dc2626); }
.dcb-retry {
  margin-left: 8px;
  padding: 0 6px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.25));
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 10.5px;
  cursor: pointer;
}

/* message log */
.dcb-log { border-left: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.18)); }
.dcb-entry { padding: 7px 0 9px 11px; }
.dcb-entry + .dcb-entry { border-top: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.12)); }
.dcb-entry-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 3px; }
.dcb-role {
  font: 10.5px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: .04em;
  color: var(--dcb-role, var(--dsw-alias-label-secondary, #9aa0a8));
}
.dcb-entry-tk { font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-entry-body {
  margin: 0;
  font-size: 12.5px;
  line-height: 19px;
  color: var(--dsw-alias-label-primary, #d5d9e0);
  white-space: pre-wrap;
  word-break: break-word;
}

/* attachments */
.dcb-att {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  padding: 8px 0;
  border: none;
  border-top: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.12));
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.dcb-att:first-child { border-top: none; }
.dcb-att:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.08)); }
.dcb-att-kind {
  flex: none;
  width: 34px;
  margin-top: 1px;
  font: 10px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: .04em;
  color: var(--dsw-alias-label-tertiary, #7d8590);
  text-align: right;
}
.dcb-att-main { flex: 1 1 auto; min-width: 0; }
.dcb-att-name { font-size: 12.5px; color: var(--dsw-alias-label-primary, #d5d9e0); }
.dcb-att-meta { margin-top: 1px; font-size: 11px; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-att-path {
  margin-top: 2px;
  font: 10.5px/16px ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--dsw-alias-label-tertiary, #7d8590);
  word-break: break-all;
}
.dcb-att-tk { flex: none; font-size: 11px; color: var(--dsw-alias-label-tertiary, #7d8590); }

/* tool/skill definitions */
.dcb-group { position: relative; }
.dcb-group + .dcb-group { border-top: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.12)); }
.dcb-group-head {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  height: 30px;
  padding: 0 2px;
  border: none;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.dcb-group-name { flex: 1 1 auto; font-size: 12px; font-weight: 500; color: var(--dsw-alias-label-primary, #c3c8d1); }
.dcb-group-tokens { flex: none; font-size: 11.5px; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-group-body { display: none; padding: 0 0 8px 13px; border-left: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.16)); margin-left: 6px; }
.dcb-group.open > .dcb-group-body { display: block; }

.dcb-def { padding: 7px 0 8px; }
.dcb-def + .dcb-def { border-top: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.1)); }
.dcb-def-head { display: flex; align-items: baseline; gap: 8px; }
.dcb-def-name { font: 11.5px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--dsw-alias-label-primary, #d8dce3); word-break: break-word; }
.dcb-def-tk { margin-left: auto; flex: none; font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-def-desc {
  margin: 2px 0 0;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-secondary, #9aa0a8);
  white-space: pre-wrap;
  word-break: break-word;
}
.dcb-def details { margin-top: 4px; }
.dcb-def summary {
  width: fit-content;
  list-style: none;
  cursor: pointer;
  font: 10.5px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--dsw-static-blue-450, #5b9dff);
}
.dcb-def summary::-webkit-details-marker { display: none; }
.dcb-def summary::before { content: "+ "; }
.dcb-def details[open] summary::before { content: "− "; }
.dcb-def pre {
  margin: 6px 0 2px;
  padding: 9px 10px;
  border-radius: 6px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.18));
  background: var(--dsw-alias-bg-layer-1, rgba(0,0,0,.18));
  color: var(--dsw-alias-label-secondary, #c3c8d1);
  font: 10.5px/16px ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: pre-wrap;
  word-break: break-word;
}

/* tool calls inside the message log */
.dcb-tool-calls { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
.dcb-tool-call {
  border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.16));
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-1, rgba(0,0,0,.12));
  overflow: hidden;
}
.dcb-tool-call summary {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 5px 8px;
  list-style: none;
  cursor: pointer;
  font: 10.5px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--dsw-alias-label-secondary, #9aa0a8);
}
.dcb-tool-call summary::-webkit-details-marker { display: none; }
.dcb-tool-call summary::before { content: "▸"; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-tool-call[open] summary::before { content: "▾"; }
.dcb-tool-name { color: var(--dsw-static-blue-450, #5b9dff); }
.dcb-tool-args-label { color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-tool-call pre {
  margin: 0;
  padding: 8px 9px;
  max-height: 320px;
  overflow: auto;
  border-top: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.14));
  color: var(--dsw-alias-label-primary, #c3c8d1);
  font: 10.5px/16px ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: pre-wrap;
  word-break: break-word;
}

/* system prompt */
.dcb-prompt-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 0 8px;
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary, #7d8590);
}
.dcb-prompt-meta button {
  margin-left: auto;
  height: 22px;
  padding: 0 8px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.25));
  border-radius: 5px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #9aa0a8);
  font: inherit;
  font-size: 10.5px;
  cursor: pointer;
}
.dcb-raw {
  margin: 0;
  padding: 10px 11px;
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-1, rgba(0,0,0,.18));
  border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.18));
  color: var(--dsw-alias-label-primary, #c3c8d1);
  font: 11px/17px ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: pre-wrap;
  word-break: break-word;
}

/* attachment preview tab */
.dcb-file {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  overflow-y: auto;
  padding: 14px;
  box-sizing: border-box;
  color: var(--dsw-alias-label-secondary, #9aa0a8);
  font-size: 12px;
}
.dcb-back {
  align-self: flex-start;
  margin: 0 0 10px;
  padding: 2px 8px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.25));
  border-radius: 5px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #9aa0a8);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
.dcb-back:hover { color: var(--dsw-alias-label-primary, #e8eaed); }
.dcb-file-head { padding-bottom: 10px; border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.18)); }
.dcb-file-title { font-size: 13px; color: var(--dsw-alias-label-primary, #e8eaed); }
.dcb-file-meta { margin-top: 2px; font-size: 11px; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-file-body { margin-top: 12px; }
.dcb-file-img { display: block; max-width: 100%; height: auto; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.18)); }
.dcb-file pre {
  margin: 0;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-1, rgba(0,0,0,.18));
  border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.18));
  color: var(--dsw-alias-label-primary, #c3c8d1);
  font: 11px/17px ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (prefers-reduced-motion: reduce) {
  .dcb-chevron, .dcb-cat-chev { transition: none; }
}
`

    let openSidebarTab = () => {}

    const pendingCategory = { value: null, seq: 0, listeners: new Set() }
    function requestCategory(category) {
      pendingCategory.value = category
      pendingCategory.seq += 1
      for (const listener of [...pendingCategory.listeners]) listener()
    }

    function Track({ rows, t }) {
      let offset = 0
      const segments = []
      for (const row of rows) {
        if (row.percent <= 0) continue
        segments.push(h('span', {
          key: row.key,
          title: translate(t, 'segmentTitle', {
            label: translate(t, row.key),
            tokens: formatTokens(row.tokens),
            percent: formatPercent(row.percent),
          }),
          style: { left: `${offset}%`, width: `max(2px, calc(${row.percent}% - 1px))`, backgroundColor: row.color },
        }))
        offset += row.percent
      }
      return h('div', { className: 'dcb-track', 'aria-hidden': true }, ...segments)
    }

    function Chevron({ open }) {
      return h('span', { className: open ? 'dcb-chevron open' : 'dcb-chevron', 'aria-hidden': true },
        h('svg', { width: 10, height: 10, viewBox: '0 0 10 10', fill: 'none' },
          h('path', { d: 'M2.5 3.5 5 6l2.5-2.5', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' })))
    }

    function ChevronRight() {
      return h('svg', { width: 10, height: 10, viewBox: '0 0 10 10', fill: 'none' },
        h('path', { d: 'M3 2l3 3-3 3', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' }))
    }

    async function fetchJson(url) {
      const response = await fetch(url, { method: 'GET', cache: 'no-store', headers: { accept: 'application/json' } })
      const body = await response.json()
      if (!response.ok || body?.ok !== true) throw new Error(String(body?.error ?? `HTTP ${response.status}`))
      return body
    }

    function categoryUrl(sessionId, category) {
      return `/api/context-bar.ui?sessionId=${encodeURIComponent(String(sessionId))}&category=${encodeURIComponent(category)}`
    }

    /** Message log: roles, content, token estimates; no chat-card chrome. */
    function MessageLog({ data, t }) {
      const messages = data.messages ?? []
      if (messages.length === 0) return h('div', { className: 'dcb-loading' }, translate(t, 'empty'))
      return h('div', { className: 'dcb-log' }, messages.map((message, index) => {
        const role = String(message.role ?? 'user')
        const color = role === 'user' ? 'var(--dsw-static-blue-450, #5b9dff)'
          : role === 'assistant' ? 'var(--dsw-static-green-450, #46b28a)'
            : role === 'tool' ? 'var(--dsw-alias-label-secondary, #9aa0a8)'
              : 'var(--dsw-static-violet-400, #a78bfa)'
        const roleLabel = translate(t, 'roles')[role] ?? role
        return h('article', { key: index, className: 'dcb-entry' },
          h('div', { className: 'dcb-entry-head' },
            h('span', { className: 'dcb-role', style: { '--dcb-role': color } },
              message.toolName ? `${roleLabel} · ${message.toolName}` : roleLabel),
            h('span', { className: 'dcb-entry-tk' }, formatTokens(Number(message.tokens ?? 0)))),
          message.text === ''
            ? null
            : role === 'tool'
              ? h('details', { className: 'dcb-tool-call dcb-tool-output' },
                h('summary', null,
                  h('span', { className: 'dcb-tool-name' }, translate(t, 'outputLabel')),
                  message.isError === true ? h('span', { className: 'dcb-tool-args-label' }, translate(t, 'errorLabel')) : null),
                h('pre', null, message.text))
              : h('p', { className: 'dcb-entry-body' }, message.text),
          message.toolCalls?.length
            ? h('div', { className: 'dcb-tool-calls' }, message.toolCalls.map((call) => h('details', { key: call.id, className: 'dcb-tool-call' },
              h('summary', null,
                h('span', { className: 'dcb-tool-name' }, call.name),
                h('span', { className: 'dcb-tool-args-label' }, translate(t, 'argumentsLabel'))),
              h('pre', null, call.arguments === '' ? '{}' : call.arguments))))
            : null)
      }))
    }

    /** Attachment rows; clicking opens a preview tab in the right Sidebar. */
    function AttachmentList({ data, t, onOpen }) {
      const attachments = data.attachments ?? []
      if (attachments.length === 0) return h('div', { className: 'dcb-loading' }, translate(t, 'empty'))
      return h('div', null, attachments.map((item) => h('button', {
        key: item.index,
        type: 'button',
        className: 'dcb-att',
        title: translate(t, 'openAttachment'),
        onClick: () => onOpen(item.index),
      },
        h('span', { className: 'dcb-att-kind' }, item.kind === 'image' ? 'image' : 'file'),
        h('div', { className: 'dcb-att-main' },
          h('div', { className: 'dcb-att-name' }, item.name),
          h('div', { className: 'dcb-att-meta' },
            [item.mimeType, item.width ? `${item.width} × ${item.height}` : '', item.bytes ? `${formatTokens(item.bytes)}B` : ''].filter(Boolean).join(' · ')),
          h('div', { className: 'dcb-att-path' }, item.path ?? `attachment:${item.attachmentId ?? ''}`)),
        h('span', { className: 'dcb-att-tk' }, formatTokens(Number(item.tokens ?? 0))))))
    }

    function ToolDefinition({ tool, t }) {
      return h('article', { className: 'dcb-def' },
        h('div', { className: 'dcb-def-head' },
          h('span', { className: 'dcb-def-name' }, tool.name),
          h('span', { className: 'dcb-def-tk' }, formatTokens(Number(tool.tokens ?? 0)))),
        tool.description === '' ? null : h('p', { className: 'dcb-def-desc' }, tool.description),
        tool.parameters === undefined ? null : h('details', null,
          h('summary', null, translate(t, 'parameters')),
          h('pre', null, JSON.stringify(tool.parameters, null, 2))))
    }

    function ToolGroup({ group, tools, open, onToggle, t }) {
      return h('div', { className: open ? 'dcb-group open' : 'dcb-group' },
        h('button', { type: 'button', className: 'dcb-group-head', onClick: onToggle, 'aria-expanded': open },
          h('span', { className: 'dcb-cat-chev', 'aria-hidden': true }, h(ChevronRight)),
          h('span', { className: 'dcb-group-name' },
            group === 'builtin' ? translate(t, 'builtinTools')
              : group.startsWith('server:') ? translate(t, 'serverGroup', { name: group.slice(7) })
                : translate(t, 'pluginGroup', { name: group })),
          h('span', { className: 'dcb-group-tokens' }, formatTokens(tools.reduce((sum, tool) => sum + Number(tool.tokens ?? 0), 0)))),
        h('div', { className: 'dcb-group-body' },
          tools.map((tool) => h(ToolDefinition, { key: tool.name, tool, t }))))
    }

    /** Tools grouped by namespace / MCP server. */
    function ToolGroups({ data, t }) {
      const tools = data.tools ?? []
      if (tools.length === 0) return h('div', { className: 'dcb-loading' }, translate(t, 'empty'))
      const isMcp = data.category === 'mcpTools'
      const groups = new Map()
      for (const tool of tools) {
        const id = isMcp ? `server:${tool.group}` : tool.group
        if (!groups.has(id)) groups.set(id, [])
        groups.get(id).push(tool)
      }
      const entries = [...groups.entries()].sort((a, b) => {
        if (a[0] === 'builtin') return -1
        if (b[0] === 'builtin') return 1
        const at = a[1].reduce((sum, tool) => sum + Number(tool.tokens ?? 0), 0)
        const bt = b[1].reduce((sum, tool) => sum + Number(tool.tokens ?? 0), 0)
        return bt - at
      })
      return h(ToolGroupList, { entries, t })
    }

    function ToolGroupList({ entries, t }) {
      const [openGroups, setOpenGroups] = React.useState(() => new Set(entries.slice(0, 1).map(([id]) => id)))
      return h('div', null, entries.map(([id, tools]) => h(ToolGroup, {
        key: id,
        group: id,
        tools,
        t,
        open: openGroups.has(id),
        onToggle: () => setOpenGroups((current) => {
          const next = new Set(current)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return next
        }),
      })))
    }

    function SkillList({ data, t }) {
      const skills = data.skills ?? []
      if (skills.length === 0) return h('div', { className: 'dcb-loading' }, translate(t, 'empty'))
      return h('div', null, skills.map((skill) => h('article', { key: skill.name, className: 'dcb-def' },
        h('div', { className: 'dcb-def-head' },
          h('span', { className: 'dcb-def-name' }, skill.name),
          h('span', { className: 'dcb-def-tk' }, formatTokens(Number(skill.tokens ?? 0)))),
        skill.description === '' ? null : h('p', { className: 'dcb-def-desc' }, skill.description),
        skill.content === undefined || skill.content === '' ? null : h('details', null,
          h('summary', null, translate(t, 'viewContent')),
          h('pre', null, skill.content)))))
    }

    function SystemPrompt({ data, t }) {
      const [label, setLabel] = React.useState(translate(t, 'copy'))
      const text = data.text ?? ''
      const copy = async () => {
        try {
          await navigator.clipboard.writeText(text)
          setLabel(translate(t, 'copied'))
        } catch {
          setLabel(translate(t, 'copyFailed'))
        }
        setTimeout(() => setLabel(translate(t, 'copy')), 1200)
      }
      return h('div', null,
        h('div', { className: 'dcb-prompt-meta' },
          h('span', null, `${formatTokens(Math.ceil(text.length / 4))} tokens · ${translate(t, 'characters', { count: text.length })}`),
          h('button', { type: 'button', onClick: copy }, label)),
        h('pre', { className: 'dcb-raw' }, text))
    }

    function CategoryContent({ category, detail, t, onRetry, onOpenAttachment }) {
      if (detail === undefined) return null
      if (detail.status === 'loading') return h('div', { className: 'dcb-loading' }, translate(t, 'loading'))
      if (detail.status === 'error') {
        return h('div', { className: 'dcb-error' },
          `${translate(t, 'loadError')}: ${detail.error}`,
          h('button', { type: 'button', className: 'dcb-retry', onClick: onRetry }, translate(t, 'retry')))
      }
      const data = detail.data ?? {}
      if (category === 'messages') return h(MessageLog, { data, t })
      if (category === 'attachments') return h(AttachmentList, { data, t, onOpen: onOpenAttachment })
      if (category === 'systemTools' || category === 'mcpTools') return h(ToolGroups, { data, t })
      if (category === 'skills') return h(SkillList, { data, t })
      if (category === 'system') return h(SystemPrompt, { data, t })
      return null
    }

    function categoryRows(view, details) {
      if (view === null) return []
      const rows = view.rows.filter((row) => row.key !== 'system')
      const skills = details.skills?.data?.skills
      const skillsTokens = Array.isArray(skills)
        ? skills.reduce((sum, skill) => sum + Number(skill.tokens ?? 0), 0)
        : undefined
      rows.push({ key: 'skills', color: SKILLS_COLOR, tokens: skillsTokens, percent: undefined })
      const system = view.rows.find((row) => row.key === 'system')
      if (system !== undefined) rows.push(system)
      return rows
    }

    /** Right-Sidebar "上下文" tab. */
    function ContextSidebarBody({ useProjection, t, sessionId }) {
      const pressure = useProjection('contextPressure')
      const detailed = useProjection('contextBreakdownDetailed')
      const basic = useProjection('contextBreakdown')
      const [expanded, setExpanded] = React.useState(null)
      const [details, setDetails] = React.useState({})
      const requestRef = React.useRef({})
      const [pending, setPending] = React.useState({ seq: pendingCategory.seq, category: pendingCategory.value })
      const [fileIndex, setFileIndex] = React.useState(null)
      const view = contextView(pressure, detailed, basic)

      const load = async (category) => {
        if (sessionId === undefined || sessionId === null) {
          setDetails((current) => ({ ...current, [category]: { status: 'error', error: 'no-session' } }))
          return
        }
        const next = (requestRef.current[category] ?? 0) + 1
        requestRef.current[category] = next
        setDetails((current) => ({ ...current, [category]: { status: 'loading' } }))
        try {
          const body = await fetchJson(categoryUrl(sessionId, category))
          if (requestRef.current[category] !== next) return
          setDetails((current) => ({ ...current, [category]: { status: 'ready', data: body } }))
        } catch (error) {
          if (requestRef.current[category] !== next) return
          setDetails((current) => ({ ...current, [category]: { status: 'error', error: String(error?.message ?? error) } }))
        }
      }

      React.useEffect(() => {
        const listener = () => setPending({ seq: pendingCategory.seq, category: pendingCategory.value })
        pendingCategory.listeners.add(listener)
        return () => pendingCategory.listeners.delete(listener)
      }, [])

      React.useEffect(() => {
        if (typeof pending.category !== 'string') return
        setExpanded(pending.category)
        load(pending.category)
      }, [pending.seq])

      if (fileIndex !== null) {
        return h(FilePreview, { index: fileIndex, sessionId, t, onBack: () => setFileIndex(null) })
      }

      if (view === null) return null

      const rows = categoryRows(view, details)
      const usedText = translate(t, 'used', { percent: Math.round(view.usedPercent) })

      const toggle = (category) => {
        if (expanded === category) {
          setExpanded(null)
          return
        }
        setExpanded(category)
        if (details[category]?.status !== 'ready') load(category)
      }

      return h('div', { className: 'dcb-side' },
        h('style', null, CSS),
        h('div', { className: 'dcb-usage' },
          h('div', { className: 'dcb-usage-row' },
            h('span', { className: 'dcb-used' }, usedText),
            h('span', { className: 'dcb-total' }, `${formatTokens(view.used)} / ${formatTokens(view.window)}`)),
          h(Track, { rows: view.rows, t }),
          h('div', { className: 'dcb-usage-note' },
            h('span', null, translate(t, 'windowLabel', { tokens: formatTokens(view.window) })),
            h('span', null, translate(t, 'remaining', { tokens: formatTokens(Math.max(0, view.window - view.used)) })))),
        h('div', { className: 'dcb-cats' }, rows.map((row) => h('section', {
          key: row.key,
          className: expanded === row.key ? 'dcb-cat open' : 'dcb-cat',
        },
          h('button', {
            type: 'button',
            className: 'dcb-cat-head',
            'aria-expanded': expanded === row.key,
            onClick: () => toggle(row.key),
          },
            h('i', { className: 'dcb-swatch', style: { '--dcb-color': row.color }, 'aria-hidden': true }),
            h('span', { className: 'dcb-cat-name' }, translate(t, row.key)),
            h('span', { className: 'dcb-cat-tokens' }, row.tokens === undefined ? '—' : formatTokens(row.tokens)),
            h('span', { className: 'dcb-cat-pct' }, row.percent === undefined ? '—' : formatPercent(row.percent)),
            h('span', { className: 'dcb-cat-chev', 'aria-hidden': true }, h(ChevronRight))),
          h('div', { className: 'dcb-cat-body' },
            expanded === row.key
              ? h(CategoryContent, {
                category: row.key,
                detail: details[row.key],
                t,
                onRetry: () => { delete requestRef.current[row.key]; load(row.key) },
                onOpenAttachment: (index) => setFileIndex(index),
              })
              : null)))))
    }

    class SidebarBoundary extends React.Component {
      constructor(props) {
        super(props)
        this.state = { error: null }
      }

      static getDerivedStateFromError(error) {
        return { error }
      }

      render() {
        if (this.state.error !== null) {
          return h('div', { className: 'dcb-side' },
            h('div', { className: 'dcb-error' }, `${this.props.errorLabel}: ${String(this.state.error?.message ?? this.state.error)}`))
        }
        return this.props.children
      }
    }

    function ContextSidebar(props) {
      return h(SidebarBoundary, { errorLabel: translate(props.t, 'loadError') }, h(ContextSidebarBody, props))
    }

    /** In-tab attachment preview (still inside the right Sidebar). */
    function FilePreview({ index, sessionId, t, onBack }) {
      const [state, setState] = React.useState({ status: 'loading' })

      React.useEffect(() => {
        let live = true
        setState({ status: 'loading' })
        fetchJson(`/api/context-bar.file?sessionId=${encodeURIComponent(String(sessionId))}&index=${index}`)
          .then((data) => { if (live) setState({ status: 'ready', data }) })
          .catch((error) => { if (live) setState({ status: 'error', error: String(error?.message ?? error) }) })
        return () => { live = false }
      }, [sessionId, index])

      const body = state.status === 'loading'
        ? h('div', { className: 'dcb-loading' }, translate(t, 'loading'))
        : state.status === 'error'
          ? h('div', { className: 'dcb-error' }, `${translate(t, 'loadError')}: ${state.error}`)
          : (() => {
            const data = state.data ?? {}
            return h('div', null,
              h('div', { className: 'dcb-file-head' },
                h('div', { className: 'dcb-file-title' }, data.name ?? ''),
                h('div', { className: 'dcb-file-meta' },
                  [data.mimeType, data.width ? `${data.width} × ${data.height}` : '', data.bytes ? `${formatTokens(data.bytes)}B` : ''].filter(Boolean).join(' · '))),
              h('div', { className: 'dcb-file-body' },
                data.kind === 'image'
                  ? h('img', { className: 'dcb-file-img', src: data.dataUrl, alt: data.name ?? '' })
                  : data.kind === 'text'
                    ? h('pre', null, data.text ?? '')
                    : h('div', { className: 'dcb-loading' }, translate(t, 'empty'))))
          })()

      return h('div', { className: 'dcb-side' },
        h('style', null, CSS),
        h('button', { type: 'button', className: 'dcb-back', onClick: onBack }, `← ${translate(t, 'back')}`),
        body)
    }

    /** Composer dock entry. */
    function ContextBar({ useProjection, t }) {
      const pressure = useProjection('contextPressure')
      const detailed = useProjection('contextBreakdownDetailed')
      const basic = useProjection('contextBreakdown')
      const [open, setOpen] = React.useState(false)
      const rootRef = React.useRef(null)
      const rowRef = React.useRef(null)
      // Collapse back into the bar as soon as the pointer lands outside the
      // panel — the composer, the transcript, another dock row — so the panel
      // never lingers over the conversation. Escape does the same and returns
      // focus to the bar.
      React.useEffect(() => {
        if (!open) return undefined
        const dismiss = (event) => {
          const root = rootRef.current
          if (root !== null && event.target instanceof Node && root.contains(event.target)) return
          setOpen(false)
        }
        const escape = (event) => {
          if (event.key !== 'Escape') return
          setOpen(false)
          rowRef.current?.focus?.()
        }
        document.addEventListener('pointerdown', dismiss, true)
        document.addEventListener('keydown', escape)
        return () => {
          document.removeEventListener('pointerdown', dismiss, true)
          document.removeEventListener('keydown', escape)
        }
      }, [open])
      const view = contextView(pressure, detailed, basic)
      if (view === null) return null

      const usedText = translate(t, 'used', { percent: Math.round(view.usedPercent) })
      const totalText = `${formatTokens(view.used)} / ${formatTokens(view.window)}`
      const ariaSummary = translate(t, 'ariaSummary', {
        percent: Math.round(view.usedPercent),
        used: formatTokens(view.used),
        total: formatTokens(view.window),
      })
      const openCategory = (category) => {
        setOpen(false)
        requestCategory(category)
        openSidebarTab()
      }

      return h('div', { className: 'dcb-root', ref: rootRef },
        h('style', null, CSS),
        open && h('div', { className: 'dcb-panel', role: 'dialog', 'aria-label': translate(t, 'title') },
          h('div', { className: 'dcb-panel-head' },
            h('span', { className: 'dcb-panel-title' }, translate(t, 'title')),
            h('button', { type: 'button', className: 'dcb-panel-close', onClick: () => setOpen(false), 'aria-label': translate(t, 'title') }, '×')),
          h('div', { className: 'dcb-panel-summary' },
            h('span', { className: 'dcb-used' }, usedText),
            h('span', null, totalText)),
          h(Track, { rows: view.rows, t }),
          h('div', { className: 'dcb-panel-cats' }, view.rows.map((row) => h('button', {
            key: row.key,
            type: 'button',
            className: 'dcb-panel-cat',
            onClick: () => openCategory(row.key),
          },
            h('span', { className: 'dcb-swatch', style: { '--dcb-color': row.color }, 'aria-hidden': true }),
            h('span', { className: 'dcb-cat-name' }, translate(t, row.key)),
            h('span', { className: 'dcb-cat-tokens' }, formatTokens(row.tokens)),
            h('span', { className: 'dcb-cat-pct' }, formatPercent(row.percent)),
            h('span', { className: 'dcb-cat-chev' }, h(ChevronRight))))),
          ),
        h('button', {
          ref: rowRef,
          type: 'button',
          className: 'dcb-row',
          onClick: () => setOpen(!open),
          'aria-expanded': open,
          'aria-label': `${translate(t, 'title')}。${ariaSummary}`,
        },
          h(Track, { rows: view.rows, t }),
          h('span', { className: 'dcb-used' }, usedText),
          h('span', { className: 'dcb-total' }, totalText),
          h(Chevron, { open })))
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const t = ctx.locale.bind(NS)
        ctx.effect(() => ctx.locale.register(NS, LOCALES), 'context-bar/locale')
        ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
          name: 'conversation.input.dock',
          id: 'context-bar',
          order: 15,
          locale: NS,
        }, ContextBar))

        ctx.inject(['sidebarRight', 'sidebarRightTabs'], (injected) => {
          const tabs = injected.get('sidebarRightTabs')
          const rightbar = injected.get('sidebarRight')
          if (!tabs || !rightbar) return

          const disposers = []
          disposers.push(tabs.register({
            id: 'dsh-context-bar',
            kind: 'contextBar',
            title: () => t('title'),
            guide: [{ id: 'context', order: 60, title: () => t('title') }],
          }))
          disposers.push(ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
            name: 'sidebar.right.pane.tab',
            key: 'dsh-context-bar',
            locale: NS,
          }, ContextSidebar)))

          openSidebarTab = () => rightbar.openTab('contextBar')

          return () => {
            openSidebarTab = () => {}
            for (const dispose of disposers.reverse()) dispose?.()
          }
        })
      },
      ContextBar,
      ContextSidebar,
      contextView,
      formatTokens,
    }
  },
})
