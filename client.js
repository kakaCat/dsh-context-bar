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
    toolCount: '{count} 个',
    messageCount: '{count} 条',
    attachmentCount: '{count} 个',
    skillCount: '{count} 个',
    skillPackage: '{name} 技能包',
    skillGroupBundled: '内置技能',
    skillGroupProject: '项目技能',
    skillGroupUser: '用户技能',
    skillGroupRuntime: '运行时技能',
    skillGroupCustom: '自定义技能',
    skillGroupOther: '其他技能',
    historyLabel: '历史版本',
    historyLive: '实时（当前）',
    historyTurn: '第 {turn} 轮',
    historyOption: '第 {turn} 轮 · 第 {step} 步 · {tokens}',
    historyBadge: '历史',
    historyStep: '第 {turn} 轮 · 第 {step} 步',
    historyStepUnknown: '历史步骤',
    historyCompacted: '已压缩',
    historyLoading: '读取中…',
    historyLoadFailed: '读取失败',
    historyLatest: '回到最新',
    historyActual: '实际 {tokens}',
    historyUsed: '实际 {percent}%',
    historyTotal: '共 {total} 步，显示最近 {shown} 步',
    historyTotalShort: '共 {total} 步',
    followingLabel: '跟随中',
    searchHistory: '搜索步骤 / 轮次…',
    compactedShort: '压缩',
    historyUnavailable: '历史不可用：{error}',
    historyUnavailableHint: '如果刚更新插件，请重启 Host 后重试。',
    currentTag: '当前',
    pinStep: '标记此步',
    unpinStep: '取消标记',
    comparePrev: '对比上一步',
    comparePinned: '对比标记步',
    diffNoPrevious: '没有更早的步骤',
    diffNoChanges: '没有可见变化',
    diffExportTitle: '上下文 diff · T{fromTurn}·S{fromStep} → T{toTurn}·S{toStep}',
    copyDiff: '复制 diff',
    exportDiff: '导出 diff',
    exportDiffJson: '导出 diff JSON',
    diffTotal: '总占用 {from} → {to}',
    diffTools: '工具变化',
    diffMessages: '消息变化',
    diffMessageMore: '还有 {count} 条',
    diffPrevious: '上一步',
    diffCurrent: '当前',
    diffText: '正文',
    diffReasoning: '推理',
    diffArguments: '入参',
    diffOutput: '输出',
    diffNoContent: '（无内容）',
    jsonMore: '还有 {count} 个字段',
    diffSystemChanged: '系统提示词已变化',
    diffAttachments: '附件变化',
    diffCompaction: '此步之前发生了压缩',
    jumpBeforeCompaction: '跳到压缩前',
    diffCount: '{from} → {to}',
    exportJson: '导出 JSON',
    exportMarkdown: '导出 Markdown',
    exporting: '导出中…',
    mdTitle: '上下文快照',
    mdStep: '步骤',
    mdExported: '导出时间',
    mdActual: '实际 prompt',
    mdBreakdown: '分类',
    mdCategory: '分类',
    mdTokens: 'tokens',
    mdCount: '数量',
    mdSystem: '系统提示',
    mdTools: '工具',
    mdMessages: '对话消息',
    mdAttachments: '文件附件',
    mdSkillsNote: '技能目录为导出时的当前状态，不在历史快照内。',
    skills: '技能',
    system: '系统提示',
    builtinTools: '内置工具（默认）',
    pluginGroup: '{name} 工具',
    serverGroup: '{name}（server）',
    loading: '正在读取…',
    loadError: '读取失败',
    tooLarge: '附件超过预览上限（12MB）',
    unavailable: '附件服务不可用',
    notFound: '附件不存在',
    readFailed: '附件读取失败',
    aborted: '读取已取消',
    retry: '重试',
    refresh: '刷新',
    empty: '暂无内容',
    parameters: 'parameters',
    argumentsLabel: '入参',
    reasoningLabel: '推理',
    toolStatus_ok: '成功',
    toolStatus_error: '失败',
    toolStatus_pending: '进行中',
    searchMessages: '搜索已加载消息 / 工具…',
    globalSearch: '全局搜索',
    globalSearchTitle: '全局搜索 · “{query}”',
    searchKindMessage: '消息',
    searchKindSystem: '系统',
    searchKindTool: '工具',
    searchKindSkill: '技能',
    globalSearchScopeHint: '消息搜索全部历史并按角色筛选；系统提示、工具 schema、技能为当前状态。',
    globalSearchCount: '共 {total} 条，显示 {shown} 条',
    backToLoaded: '返回当前页',
    noGlobalResults: '没有匹配的消息',
    globalSearchFailed: '搜索失败',
    jumpToStep: '跳到该步',
    loadMoreResults: '加载更多结果',
    onlyErrors: '只看错误',
    showReasoning: '显示推理',
    expandAllLabel: '展开全部',
    collapseAll: '收起全部',
    loadedCount: '已加载 {loaded} / {total}',
    matchCount: '匹配 {count} 条',
    loadMore: '加载更早',
    copyEntry: '复制',
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
    basisActual: '实际',
    basisProjected: '预估',
    basisToggleHint: '点击切换：LLM 实际用量 / 下一次请求预估',
    estimateApportioned: '分类估算 · 已按 {total} 总量分摊',
    panelApportioned: '分类为本地估算 · 已按 {total} 总量比例分摊',
    basisHintProjected: '口径：预估（projectedTokens，下一次请求）；分类为本地估算，已按总量比例分摊。',
    basisHintActual: '口径：LLM 实际 usage（最近一次请求 / 历史步骤）；分类为本地估算，已按总量比例分摊。',
    estimateHint: '分类 tokens 为本地启发式估算，已按总量比例分摊',
    apportionedHint: '原始估算 {raw} · 已按总量分摊为 {tokens}',
    characters: '约 {count} 字符',
    filterByRole: '按角色筛选',
    noFilteredMessages: '当前筛选下没有消息',
    allRolesHidden: '已隐藏全部角色',
    showAllRoles: '恢复全部角色',
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
    toolCount: '{count} tools',
    messageCount: '{count} messages',
    attachmentCount: '{count} files',
    skillCount: '{count} skills',
    skillPackage: '{name} package',
    skillGroupBundled: 'Built-in skills',
    skillGroupProject: 'Project skills',
    skillGroupUser: 'User skills',
    skillGroupRuntime: 'Runtime skills',
    skillGroupCustom: 'Custom skills',
    skillGroupOther: 'Other skills',
    historyLabel: 'Versions',
    historyLive: 'Live (current)',
    historyTurn: 'Turn {turn}',
    historyOption: 'T{turn} · S{step} · {tokens}',
    historyBadge: 'History',
    historyStep: 'Turn {turn} · step {step}',
    historyStepUnknown: 'History step',
    historyCompacted: 'compacted',
    historyLoading: 'Loading…',
    historyLoadFailed: 'Load failed',
    historyLatest: 'Latest',
    historyActual: 'actual {tokens}',
    historyUsed: 'actual {percent}%',
    historyTotal: '{total} steps, showing the latest {shown}',
    historyTotalShort: '{total} steps',
    followingLabel: 'following',
    searchHistory: 'Search step / turn…',
    compactedShort: 'compacted',
    historyUnavailable: 'History unavailable: {error}',
    historyUnavailableHint: 'If the plugin was just updated, restart the Host and retry.',
    currentTag: 'current',
    pinStep: 'Pin step',
    unpinStep: 'Unpin',
    comparePrev: 'Compare previous',
    comparePinned: 'Compare pinned',
    diffNoPrevious: 'No earlier step',
    diffNoChanges: 'No visible change',
    diffExportTitle: 'Context diff · T{fromTurn}·S{fromStep} → T{toTurn}·S{toStep}',
    copyDiff: 'Copy diff',
    exportDiff: 'Export diff',
    exportDiffJson: 'Export diff JSON',
    diffTotal: 'Total {from} → {to}',
    diffTools: 'Tools',
    diffMessages: 'Messages',
    diffMessageMore: '{count} more',
    diffPrevious: 'Previous',
    diffCurrent: 'Current',
    diffText: 'Text',
    diffReasoning: 'Reasoning',
    diffArguments: 'Arguments',
    diffOutput: 'Output',
    diffNoContent: '(no content)',
    jsonMore: '{count} more fields',
    diffSystemChanged: 'System prompt changed',
    diffAttachments: 'Attachments',
    diffCompaction: 'Compaction happened before this step',
    jumpBeforeCompaction: 'Jump before compaction',
    diffCount: '{from} → {to}',
    exportJson: 'Export JSON',
    exportMarkdown: 'Export Markdown',
    exporting: 'Exporting…',
    mdTitle: 'Context snapshot',
    mdStep: 'Step',
    mdExported: 'Exported',
    mdActual: 'Actual prompt',
    mdBreakdown: 'Categories',
    mdCategory: 'Category',
    mdTokens: 'tokens',
    mdCount: 'Count',
    mdSystem: 'System prompt',
    mdTools: 'Tools',
    mdMessages: 'Messages',
    mdAttachments: 'Attachments',
    mdSkillsNote: 'The skills catalog is the current one and is not part of the historical snapshot.',
    skills: 'Skills',
    system: 'System prompt',
    builtinTools: 'Built-in tools (default)',
    pluginGroup: '{name} tools',
    serverGroup: '{name} (server)',
    loading: 'Loading…',
    loadError: 'Failed to load',
    tooLarge: 'Attachment exceeds the 12MB preview limit',
    unavailable: 'Attachment service unavailable',
    notFound: 'Attachment not found',
    readFailed: 'Failed to read the attachment',
    aborted: 'Read cancelled',
    retry: 'Retry',
    refresh: 'Refresh',
    empty: 'No content',
    parameters: 'parameters',
    argumentsLabel: 'arguments',
    reasoningLabel: 'reasoning',
    toolStatus_ok: 'ok',
    toolStatus_error: 'error',
    toolStatus_pending: 'running',
    searchMessages: 'Search loaded messages / tools…',
    globalSearch: 'Global search',
    globalSearchTitle: 'Global search · “{query}”',
    searchKindMessage: 'message',
    searchKindSystem: 'system',
    searchKindTool: 'tool',
    searchKindSkill: 'skill',
    globalSearchScopeHint: 'Messages search all history and respect the role filter; system prompt, tool schemas, and skills use the current state.',
    globalSearchCount: '{total} matches, showing {shown}',
    backToLoaded: 'Back to current page',
    noGlobalResults: 'No matching messages',
    globalSearchFailed: 'Search failed',
    jumpToStep: 'Jump to step',
    loadMoreResults: 'Load more results',
    onlyErrors: 'Errors only',
    showReasoning: 'Reasoning',
    expandAllLabel: 'Expand all',
    collapseAll: 'Collapse all',
    loadedCount: '{loaded} / {total} loaded',
    matchCount: '{count} matches',
    loadMore: 'Load older',
    copyEntry: 'Copy',
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
    basisActual: 'actual',
    basisProjected: 'projected',
    basisToggleHint: 'Click to switch between LLM actual usage and the next-request projection',
    estimateApportioned: 'Categories · apportioned to {total}',
    panelApportioned: 'Local estimates · apportioned to {total}',
    basisHintProjected: 'Basis: projectedTokens (next request); local category estimates are apportioned to the total.',
    basisHintActual: 'Basis: LLM actual usage (latest request / history step); local category estimates are apportioned to the total.',
    estimateHint: 'Local heuristic category tokens, apportioned to the total',
    apportionedHint: 'Raw estimate {raw} · apportioned to {tokens}',
    characters: '~{count} chars',
    filterByRole: 'Filter by role',
    noFilteredMessages: 'No messages match this filter',
    allRolesHidden: 'All roles are hidden',
    showAllRoles: 'Show all roles',
    roles: { user: 'user', assistant: 'assistant', tool: 'tool', system: 'system' },
  },
}

function translate(t, key, params) {
  if (typeof t === 'function') return t(key, params)
  const template = LOCALES.zh[key] || key
  return String(template).replace(/\{(\w+)\}/g, (_, name) => String(params?.[name] ?? ''))
}

/** Map stable Host error codes to localized text; unknown codes pass through. */
const ERROR_KEYS = {
  'attachment-too-large': 'tooLarge',
  'attachments-unavailable': 'unavailable',
  'attachment-not-found': 'notFound',
  'attachment-read-failed': 'readFailed',
  aborted: 'aborted',
}

function errorText(t, error) {
  const key = ERROR_KEYS[String(error)]
  return key === undefined ? String(error) : translate(t, key)
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
const DETAILED_COUNT_FIELDS = { systemTools: 'systemToolsCount', mcpTools: 'mcpToolsCount' }

/** Apportion raw category estimates to the authoritative token-meter total. */
function allocateRows(rows, used, window_) {
  const withRaw = rows.map((row) => ({ ...row, rawTokens: Number(row.rawTokens ?? row.tokens ?? 0) }))
  const total = withRaw.reduce((sum, row) => sum + Number(row.tokens ?? 0), 0)
  if (!(total > 0) || !(used > 0)) return withRaw
  const factor = Number(used) / total
  const allocated = withRaw.map((row) => {
    const tokens = Math.max(0, Math.round(Number(row.tokens) * factor))
    return { ...row, tokens, percent: Math.min(100, (tokens / window_) * 100) }
  })
  const delta = Number(used) - allocated.reduce((sum, row) => sum + row.tokens, 0)
  if (delta !== 0 && allocated.length > 0) {
    const target = allocated.reduce((best, row) => (row.tokens > best.tokens ? row : best), allocated[0])
    target.tokens = Math.max(0, target.tokens + delta)
    target.percent = Math.min(100, (target.tokens / window_) * 100)
  }
  return allocated
}

function contextView(pressure, detailed, basic, basisPreference) {
  const actual = Number(pressure?.pressureTokens)
  const projected = pressure?.projectedTokens
  const hasActual = Number.isFinite(actual) && actual > 0
  const hasProjected = projected !== undefined && Number(projected) > 0
  const useProjected = basisPreference === 'projected' ? hasProjected : !hasActual && hasProjected
  const used = useProjected ? projected : (hasActual ? actual : undefined)
  const window_ = pressure?.contextWindow
  if (used === undefined || window_ === undefined || window_ <= 0) return null
  const basis = useProjected ? 'projected' : 'actual'
  const fields = detailed === undefined ? BASIC_FIELDS : DETAILED_FIELDS
  const source = detailed === undefined ? basic : detailed
  const rawRows = CATEGORIES
    .filter((category) => category.key in fields)
    .map((category) => {
      const tokens = Math.max(0, source?.[fields[category.key]] ?? 0)
      const countField = DETAILED_COUNT_FIELDS[category.key]
      const rawCount = countField === undefined ? undefined : detailed?.[countField]
      const count = rawCount === undefined ? undefined : Math.max(0, rawCount)
      return { ...category, tokens, rawTokens: tokens, count, percent: Math.min(100, (tokens / window_) * 100) }
    })
    .filter((row) => row.tokens > 0)
  const rows = allocateRows(rawRows, used, window_)
  return {
    used,
    window: window_,
    usedPercent: Math.min(100, (used / window_) * 100),
    rows,
    ...accounting(rows, used, window_, basis),
  }
}

/** The allocated rows now partition the authoritative total; no separate gap is displayed. */
function accounting(rows, used, window_, basis) {
  const categorized = rows.reduce((sum, row) => sum + Number(row.tokens ?? 0), 0)
  return {
    categorized,
    unaccounted: 0,
    over: 0,
    basis,
    trackRows: rows,
  }
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
  container-type: inline-size;
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

/* history selector */
.dcb-hist { position: relative; display: flex; align-items: center; gap: 8px; padding: 0 2px 10px; }
.dcb-hist-label { flex: none; font-size: 11px; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-hist-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
  height: 26px;
  padding: 0 8px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.25));
  border-radius: 6px;
  background: var(--dsw-specific-menu, var(--dsw-alias-bg-layer-2, #202329));
  color: var(--dsw-alias-label-secondary, #9aa0a8);
  font: inherit;
  font-size: 11px;
  text-align: left;
  cursor: pointer;
}
.dcb-hist-trigger:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.08)); }
.dcb-hist-caret { margin-left: auto; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-hist-follow { flex: none; padding: 0 4px; border-radius: 999px; background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.10)); color: var(--dsw-alias-state-success-primary, #46b28a); font-size: 9px; }
.dcb-hist-pop {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 30;
  padding: 8px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.25));
  border-radius: 8px;
  background: var(--dsw-specific-menu, var(--dsw-alias-bg-layer-2, #202329));
  box-shadow: var(--dsw-elevation-prominent, 0 8px 24px rgba(0,0,0,.22));
}
.dcb-hist-list {
  display: block;
  max-height: 280px;
  margin-top: 6px;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.dcb-hist-virtual { position: relative; width: 100%; }
.dcb-hist-row { position: absolute; left: 0; right: 0; display: flex; align-items: center; }
.dcb-hist-row .dcb-hist-option { height: 100%; min-height: 0; }
.dcb-hist-row-group .dcb-hist-group-label { display: flex; align-items: center; height: 100%; padding: 0 6px; }
.dcb-hist-row.dcb-hist-empty { padding: 0 6px; }
.dcb-hist-group { display: flex; flex-direction: column; gap: 1px; }
.dcb-hist-group-label { padding: 5px 6px 2px; font-size: 10px; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-hist-option {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-height: 26px;
  padding: 0 6px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #9aa0a8);
  font: inherit;
  font-size: 11px;
  text-align: left;
  cursor: pointer;
}
.dcb-hist-option:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.08)); }
.dcb-hist-option.on { background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.14)); color: var(--dsw-alias-label-primary, #e8eaed); }
.dcb-hist-option.active { box-shadow: inset 0 0 0 1px var(--dsw-static-blue-450, #5b9dff); }
.dcb-hist-option-mark {
  margin-left: auto;
  padding: 0 4px;
  border-radius: 999px;
  color: var(--dsw-static-orange-400, #e0914b);
  font-size: 9.5px;
}
.dcb-hist-empty { padding: 8px 6px; font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-hist-footer { padding: 6px 6px 0; border-top: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.14)); font-size: 10px; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-hist-error-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  margin: 0 2px 10px;
  border: 1px solid var(--dsw-alias-state-error-primary, #dc2626);
  border-radius: 6px;
  font-size: 11px;
  color: var(--dsw-alias-label-secondary, #9aa0a8);
}
.dcb-hist-error-main { color: var(--dsw-alias-state-error-primary, #dc2626); word-break: break-word; }
.dcb-hist-error-hint { font-size: 10px; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-hist-loading { padding: 2px 2px 8px; font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-hist-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding: 6px 8px;
  margin: 0 0 10px;
  border-radius: 6px;
  background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.10));
  font-size: 11px;
  color: var(--dsw-alias-label-secondary, #9aa0a8);
}
.dcb-hist-badge {
  flex: none;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--dsw-static-yellow-450, #e3b341);
  color: #1b1b1b;
  font-size: 10px;
  font-weight: 600;
}
.dcb-hist-compacted { color: var(--dsw-static-orange-400, #e0914b); }
.dcb-hist-actual { color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-hist-error { color: var(--dsw-alias-state-error-primary, #dc2626); }
.dcb-hist-latest {
  margin-left: auto;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--dsw-static-blue-450, #5b9dff);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
.dcb-cat-current { margin-left: 4px; font-size: 10px; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-cat-refresh { display: flex; justify-content: flex-end; padding: 0 0 4px; }
.dcb-cat-refresh-btn { padding: 0; border: none; background: transparent; color: var(--dsw-static-blue-450, #5b9dff); font: inherit; font-size: 10px; cursor: pointer; }

.dcb-hist-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 0 2px 8px; }
.dcb-hist-action {
  height: 22px;
  padding: 0 7px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.25));
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #9aa0a8);
  font: inherit;
  font-size: 10.5px;
  cursor: pointer;
}
.dcb-hist-action:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.08)); }
.dcb-hist-action:disabled { opacity: .5; cursor: default; }
.dcb-hist-pin { font-size: 10px; color: var(--dsw-alias-label-tertiary, #7d8590); }

.dcb-diff {
  margin: 0 0 10px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.20));
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-1, rgba(0,0,0,.08));
}
.dcb-diff-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  list-style: none;
  cursor: pointer;
  font-size: 11px;
  color: var(--dsw-alias-label-secondary, #9aa0a8);
}
.dcb-diff-summary::-webkit-details-marker { display: none; }
.dcb-diff-summary::before { content: "▸"; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-diff[open] > .dcb-diff-summary::before { content: "▾"; }
.dcb-diff-delta { margin-left: auto; font-size: 10.5px; font-variant-numeric: tabular-nums; }
.dcb-diff-delta.up { color: var(--dsw-alias-state-success-primary, #46b28a); }
.dcb-diff-delta.down { color: var(--dsw-alias-state-error-primary, #dc2626); }
.dcb-diff-delta.flat { color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-diff-body { padding: 0 8px 8px; border-top: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.14)); }
.dcb-diff-row { display: flex; align-items: baseline; gap: 8px; padding: 3px 0; font-size: 11px; }
.dcb-diff-name { flex: 1 1 auto; min-width: 0; color: var(--dsw-alias-label-secondary, #9aa0a8); }
.dcb-diff-count { flex: none; font-size: 10px; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-diff-group { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; padding: 3px 0; font-size: 10.5px; }
.dcb-diff-label { color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-diff-tag { padding: 0 5px; border-radius: 999px; font-size: 10px; background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.10)); }
.dcb-diff-tag.add { color: var(--dsw-alias-state-success-primary, #46b28a); }
.dcb-diff-tag.remove { color: var(--dsw-alias-state-error-primary, #dc2626); }
.dcb-diff-tag.change { color: var(--dsw-static-yellow-450, #e3b341); }
.dcb-diff-msg {
  display: flex;
  align-items: baseline;
  gap: 6px;
  width: 100%;
  padding: 2px 0 2px 8px;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #9aa0a8);
  font: inherit;
  font-size: 10.5px;
  text-align: left;
  cursor: pointer;
}
.dcb-diff-msg:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.08)); }
.dcb-diff-msg-open { flex: none; margin-left: auto; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-diff-detail { margin: 2px 0 6px 14px; padding: 6px 8px; border-left: 2px solid var(--dsw-alias-border-l1, rgba(128,128,128,.25)); background: var(--dsw-alias-bg-layer-1, rgba(0,0,0,.08)); border-radius: 0 4px 4px 0; }
.dcb-diff-loading { font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-diff-variant + .dcb-diff-variant { margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--dsw-alias-border-l1, rgba(128,128,128,.18)); }
.dcb-diff-variant-head { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; margin-bottom: 3px; font-size: 10px; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-diff-variant-head > span:first-child { color: var(--dsw-alias-label-secondary, #9aa0a8); font-weight: 600; }
.dcb-diff-field { margin-top: 4px; }
.dcb-diff-field-label { margin-bottom: 2px; font-size: 9.5px; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-diff-pre { max-height: 180px; margin: 0; padding: 6px; overflow: auto; border-radius: 4px; background: var(--dsw-alias-bg-layer-2, rgba(0,0,0,.14)); color: var(--dsw-alias-label-secondary, #9aa0a8); font-family: var(--dsw-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); font-size: 10px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
.dcb-diff-pre-inline { max-height: 220px; padding: 2px 0; }
.dcb-diff-inline { display: block; padding: 0 5px; white-space: pre-wrap; }
.dcb-diff-inline.same { color: var(--dsw-alias-label-secondary, #9aa0a8); }
.dcb-diff-inline.add { background: rgba(70, 178, 138, .14); color: var(--dsw-alias-state-success-primary, #46b28a); }
.dcb-diff-inline.remove { background: rgba(220, 38, 38, .12); color: var(--dsw-alias-state-error-primary, #dc2626); }
.dcb-char.add { border-radius: 2px; background: rgba(70, 178, 138, .32); }
.dcb-char.remove { border-radius: 2px; background: rgba(220, 38, 38, .30); }
.dcb-diff-empty { font-size: 10px; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-json-diff { padding: 2px 0; border-radius: 4px; background: var(--dsw-alias-bg-layer-2, rgba(0,0,0,.14)); }
.dcb-json-row { display: flex; gap: 6px; padding: 1px 6px; font-family: var(--dsw-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); font-size: 10px; line-height: 1.5; color: var(--dsw-alias-label-secondary, #9aa0a8); }
.dcb-json-row.added { background: rgba(70, 178, 138, .10); color: var(--dsw-alias-state-success-primary, #46b28a); }
.dcb-json-row.removed { background: rgba(220, 38, 38, .10); color: var(--dsw-alias-state-error-primary, #dc2626); }
.dcb-json-row.changed { background: rgba(227, 179, 65, .10); color: var(--dsw-static-yellow-450, #e3b341); }
.dcb-json-mark { flex: none; width: 8px; }
.dcb-json-path { flex: none; max-width: 45%; overflow: hidden; color: var(--dsw-alias-label-tertiary, #7d8590); text-overflow: ellipsis; white-space: nowrap; }
.dcb-json-value { min-width: 0; word-break: break-word; }
.dcb-diff-msg-sign { flex: none; width: 8px; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-diff-msg.added .dcb-diff-msg-sign { color: var(--dsw-alias-state-success-primary, #46b28a); }
.dcb-diff-msg.removed .dcb-diff-msg-sign { color: var(--dsw-alias-state-error-primary, #dc2626); }
.dcb-diff-msg.changed .dcb-diff-msg-sign { color: var(--dsw-static-yellow-450, #e3b341); }
.dcb-diff-msg-role { flex: none; color: var(--dsw-alias-label-secondary, #9aa0a8); }
.dcb-diff-msg-preview { min-width: 0; overflow: hidden; color: var(--dsw-alias-label-tertiary, #7d8590); text-overflow: ellipsis; white-space: nowrap; }
.dcb-diff-more { padding: 2px 0 2px 14px; font-size: 10px; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-diff-line { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 3px 0; font-size: 10.5px; color: var(--dsw-alias-label-secondary, #9aa0a8); }
.dcb-diff-system { margin-top: 4px; }
.dcb-diff-system > summary { padding: 3px 0; cursor: pointer; font-size: 10.5px; color: var(--dsw-alias-label-secondary, #9aa0a8); }
.dcb-diff-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 6px; margin-top: 4px; border-top: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.14)); }
.dcb-diff-action { padding: 0; border: none; background: transparent; color: var(--dsw-static-blue-450, #5b9dff); font: inherit; font-size: 10px; cursor: pointer; }
.dcb-diff-jump {
  margin-left: auto;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--dsw-static-blue-450, #5b9dff);
  font: inherit;
  font-size: 10.5px;
  cursor: pointer;
}

.dcb-usage { padding: 0 2px; }
.dcb-usage-row { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px; }
.dcb-usage-row .dcb-used { font-size: 22px; font-weight: 600; color: var(--dsw-alias-label-primary, #e8eaed); }
.dcb-usage-row .dcb-total { font-size: 12.5px; }
.dcb-usage-note { display: flex; justify-content: space-between; margin-top: 8px; font-size: 11px; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-usage-basis { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; margin-top: 6px; font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-basis-toggle { border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.25)); background: transparent; font: inherit; font-size: 9.5px; line-height: 14px; color: var(--dsw-alias-label-secondary, #9aa0a8); cursor: pointer; }
.dcb-basis-toggle:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.08)); }
.dcb-basis-tag {
  flex: none;
  padding: 0 5px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.25));
  border-radius: 999px;
  font-size: 9.5px;
  line-height: 14px;
  color: var(--dsw-alias-label-secondary, #9aa0a8);
}
.dcb-basis-note { min-width: 0; }
.dcb-panel-note { padding: 6px 2px 0; font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-panel-title .dcb-basis-tag { margin-left: 6px; vertical-align: 2px; font-weight: 400; }
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
.dcb-cat-count {
  margin-left: 6px;
  font-size: 11.5px;
  font-weight: 400;
  color: var(--dsw-alias-label-tertiary, #7d8590);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
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
.dcb-msg-hidden { display: flex; align-items: center; justify-content: center; gap: 8px; }
.dcb-msg-hidden .dcb-msg-more { margin-left: 0; }
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
.dcb-filter { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 1px 0 9px; }
.dcb-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 24px;
  padding: 0 9px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.25));
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-tertiary, #7d8590);
  font: inherit;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
}
.dcb-filter-chip:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.08)); }
.dcb-filter-chip[aria-pressed="true"] {
  color: var(--dsw-alias-label-primary, #d5d9e0);
  border-color: var(--dsw-alias-label-tertiary, #7d8590);
  background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.10));
}
.dcb-filter-dot { flex: none; width: 6px; height: 6px; border-radius: 50%; background: var(--dcb-role-dot); }
.dcb-filter-chip[aria-pressed="false"] .dcb-filter-dot { opacity: .35; }
.dcb-filter-count { font-size: 10px; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-msg-tools {
  position: sticky;
  top: 0;
  z-index: 3;
  margin: 0 -14px 2px -17px;
  padding: 6px 14px 8px 17px;
  background: var(--dsw-specific-sidebar-fill, var(--dsw-alias-bg-layer-2, #202329));
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.12));
}
.dcb-msg-search { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding-top: 6px; }
.dcb-msg-input {
  flex: 1 1 110px;
  min-width: 80px;
  height: 24px;
  padding: 0 8px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.25));
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-1, transparent);
  color: var(--dsw-alias-label-primary, #e8eaed);
  font: inherit;
  font-size: 11px;
}
.dcb-msg-input::placeholder { color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-msg-toggle {
  height: 22px;
  padding: 0 7px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-tertiary, #7d8590);
  font: inherit;
  font-size: 10.5px;
  cursor: pointer;
}
.dcb-msg-toggle:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.08)); }
.dcb-msg-toggle:disabled { opacity: .5; cursor: default; }
.dcb-msg-toggle[aria-pressed="true"] {
  color: var(--dsw-alias-label-primary, #d5d9e0);
  border-color: var(--dsw-alias-border-l1, rgba(128,128,128,.25));
  background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.10));
}
.dcb-msg-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 4px;
  font-size: 10.5px;
  color: var(--dsw-alias-label-tertiary, #7d8590);
}
.dcb-msg-more {
  margin-left: auto;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--dsw-static-blue-450, #5b9dff);
  font: inherit;
  font-size: 10.5px;
  cursor: pointer;
}
.dcb-msg-more:disabled { opacity: .5; cursor: default; }
.dcb-global { margin-top: 8px; border: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.20)); border-radius: 6px; }
.dcb-global:focus { outline: none; }
.dcb-global-result.active { background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.10)); box-shadow: inset 0 0 0 1px var(--dsw-static-blue-450, #5b9dff); }
.dcb-global-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 6px 8px; border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.14)); font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-global-result { border-top: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.10)); }
.dcb-global-result:first-child { border-top: none; }
.dcb-global-row { display: flex; align-items: center; gap: 6px; padding: 3px 6px; }
.dcb-global-open { display: flex; align-items: baseline; gap: 6px; min-width: 0; flex: 1 1 auto; padding: 2px 0; border: none; background: transparent; color: var(--dsw-alias-label-secondary, #9aa0a8); font: inherit; font-size: 10.5px; text-align: left; cursor: pointer; }
.dcb-global-open:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.08)); }
.dcb-global-step { flex: none; padding: 0 5px; border-radius: 999px; background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.10)); color: var(--dsw-alias-label-tertiary, #7d8590); font-size: 9.5px; }
.dcb-global-role { flex: none; color: var(--dsw-alias-label-primary, #e8eaed); font-size: 10px; }
.dcb-global-kind { flex: none; padding: 0 4px; border-radius: 999px; background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.10)); color: var(--dsw-alias-label-secondary, #9aa0a8); font-size: 9px; line-height: 13px; }
.dcb-global-kinds { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; padding: 5px 8px; border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.14)); }
.dcb-global-kind-chip { height: 20px; padding: 0 6px; border: 1px solid transparent; border-radius: 999px; background: transparent; color: var(--dsw-alias-label-tertiary, #7d8590); font: inherit; font-size: 9.5px; cursor: pointer; }
.dcb-global-kind-chip:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.08)); }
.dcb-global-kind-chip.on { border-color: var(--dsw-alias-border-l1, rgba(128,128,128,.25)); background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.12)); color: var(--dsw-alias-label-primary, #e8eaed); }
.dcb-global-tool { flex: none; color: var(--dsw-alias-label-tertiary, #7d8590); font-size: 10px; }
.dcb-global-preview { min-width: 0; overflow: hidden; color: var(--dsw-alias-label-tertiary, #7d8590); text-overflow: ellipsis; white-space: nowrap; }
.dcb-global-jump { flex: none; padding: 0; border: none; background: transparent; color: var(--dsw-static-blue-450, #5b9dff); font: inherit; font-size: 10px; cursor: pointer; }
.dcb-global-detail { padding: 4px 8px 8px 20px; border-top: 1px dashed var(--dsw-alias-border-l1, rgba(128,128,128,.18)); }
.dcb-global-detail-head { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; margin-bottom: 4px; font-size: 10px; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-global-foot { padding: 6px 8px; border-top: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.14)); text-align: right; }
.dcb-log { border-left: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.18)); }
.dcb-entry { padding: 7px 0 9px 11px; }
.dcb-entry + .dcb-entry { border-top: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.12)); }
.dcb-entry-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 3px; }
.dcb-role {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font: 10.5px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: .04em;
  color: var(--dcb-role, var(--dsw-alias-label-secondary, #9aa0a8));
}
.dcb-entry-tk { margin-left: auto; font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #7d8590); }
.dcb-entry-copy {
  flex: none;
  padding: 0 2px;
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-tertiary, #7d8590);
  font: inherit;
  font-size: 10px;
  cursor: pointer;
}
.dcb-entry-copy:hover { color: var(--dsw-alias-label-primary, #d5d9e0); }
.dcb-tool-status {
  flex: none;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.10));
  font-size: 9.5px;
  line-height: 14px;
}
.dcb-tool-status.ok { color: var(--dsw-alias-state-success-primary, #46b28a); }
.dcb-tool-status.error { color: var(--dsw-alias-state-error-primary, #dc2626); }
.dcb-tool-status.pending { color: var(--dsw-alias-state-warn-primary, #e3b341); }
.dcb-tool-duration { flex: none; font-size: 10px; color: var(--dsw-alias-label-tertiary, #7d8590); font-variant-numeric: tabular-nums; }
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
.dcb-group-count {
  margin-left: 6px;
  font-size: 10.5px;
  font-weight: 400;
  color: var(--dsw-alias-label-tertiary, #7d8590);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
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

@container (max-width: 300px) {
  .dcb-cat-head { gap: 6px; }
  .dcb-cat-pct { display: none; }
  .dcb-cat-current { display: none; }
}
@container (max-width: 250px) {
  .dcb-cat-count { display: none; }
  .dcb-cat-tokens { width: 44px; }
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
          style: {
            left: `${offset}%`,
            width: `max(2px, calc(${row.percent}% - 1px))`,
            backgroundColor: row.color,
            ...(row.opacity === undefined ? {} : { opacity: row.opacity }),
          },
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

    function categoryUrl(sessionId, category, at, params) {
      const query = new URLSearchParams({ sessionId: String(sessionId), category })
      if (at !== undefined && at !== null) query.set('at', String(at))
      for (const [key, value] of Object.entries(params ?? {})) {
        if (value !== undefined && value !== null) query.set(key, String(value))
      }
      return `/api/context-bar.ui?${query.toString()}`
    }

    function attachmentFileUrl(sessionId, attachmentId) {
      return `/api/context-bar.file?sessionId=${encodeURIComponent(String(sessionId))}&attachmentId=${encodeURIComponent(String(attachmentId))}`
    }

    /** Compact, non-path display form of a content-addressed attachment id. */
    function shortAttachmentId(item) {
      const id = String(item?.attachmentId ?? '')
      const digest = /^sha256:([0-9a-f]+)$/i.exec(id)
      if (digest !== null) return `sha256:${digest[1].slice(0, 12)}…`
      if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,200}$/.test(id)) return ''
      return id.length > 24 ? `${id.slice(0, 24)}…` : id
    }

    const MESSAGE_FILTER_ROLES = ['user', 'assistant', 'tool']
    const SEARCH_KINDS = ['message', 'system', 'tool', 'skill']
    const MESSAGE_ROLE_COLORS = {
      user: 'var(--dsw-static-blue-450, #5b9dff)',
      assistant: 'var(--dsw-static-green-450, #46b28a)',
      tool: 'var(--dsw-alias-label-secondary, #9aa0a8)',
      system: 'var(--dsw-static-violet-400, #a78bfa)',
    }

    const LIVE_BASIS_STORAGE_KEY = 'dsh-context-bar.live-basis'
    const liveBasisListeners = new Set()
    let liveBasisValue = (() => {
      try {
        return window.localStorage.getItem(LIVE_BASIS_STORAGE_KEY) === 'projected' ? 'projected' : 'actual'
      } catch {
        return 'actual'
      }
    })()

    function setLiveBasis(value) {
      const next = value === 'projected' ? 'projected' : 'actual'
      if (next === liveBasisValue) return
      liveBasisValue = next
      try {
        window.localStorage.setItem(LIVE_BASIS_STORAGE_KEY, next)
      } catch {
        // Storage may be unavailable in a sandboxed webview.
      }
      for (const listener of liveBasisListeners) listener(next)
    }

    function useLiveBasis() {
      const [value, setValue] = React.useState(liveBasisValue)
      React.useEffect(() => {
        const listener = (next) => setValue(next)
        liveBasisListeners.add(listener)
        setValue(liveBasisValue)
        return () => { liveBasisListeners.delete(listener) }
      }, [])
      return [value, setLiveBasis]
    }

    const SIDEBAR_VIEW_LIMIT = 32
    const sidebarViewMemory = new Map()

    function recallSidebarView(sessionId) {
      if (sessionId === undefined || sessionId === null) return undefined
      const key = String(sessionId)
      const value = sidebarViewMemory.get(key)
      if (value === undefined) return undefined
      sidebarViewMemory.delete(key)
      sidebarViewMemory.set(key, value)
      return value
    }

    function rememberSidebarView(sessionId, value) {
      if (sessionId === undefined || sessionId === null) return
      const key = String(sessionId)
      sidebarViewMemory.delete(key)
      sidebarViewMemory.set(key, value)
      while (sidebarViewMemory.size > SIDEBAR_VIEW_LIMIT) {
        sidebarViewMemory.delete(sidebarViewMemory.keys().next().value)
      }
    }

    const MESSAGE_VIEW_LIMIT = 32
    const messageViewMemory = new Map()

    function recallMessageView(sessionId) {
      if (sessionId === undefined || sessionId === null) return undefined
      const key = String(sessionId)
      const value = messageViewMemory.get(key)
      if (value === undefined) return undefined
      messageViewMemory.delete(key)
      messageViewMemory.set(key, value)
      return value
    }

    function rememberMessageView(sessionId, value) {
      if (sessionId === undefined || sessionId === null) return
      const key = String(sessionId)
      messageViewMemory.delete(key)
      messageViewMemory.set(key, value)
      while (messageViewMemory.size > MESSAGE_VIEW_LIMIT) {
        messageViewMemory.delete(messageViewMemory.keys().next().value)
      }
    }

    function formatDuration(ms) {
      if (!Number.isFinite(ms) || ms < 0) return ''
      if (ms < 1000) return `${Math.round(ms)}ms`
      if (ms < 10000) return `${(ms / 1000).toFixed(1)}s`
      return `${Math.round(ms / 1000)}s`
    }

    function signedTokens(value) {
      const number = Number(value)
      if (!Number.isFinite(number) || number === 0) return '0'
      return `${number > 0 ? '+' : '-'}${formatTokens(Math.abs(number))}`
    }

    /** Flatten a JSON value into leaf paths for a structural argument diff. */
    function jsonLeaves(value, prefix, out) {
      if (Array.isArray(value)) {
        if (value.length === 0) out.push({ path: prefix === '' ? '[]' : prefix, value: [] })
        else value.forEach((item, index) => jsonLeaves(item, `${prefix}[${index}]`, out))
        return
      }
      if (value !== null && typeof value === 'object') {
        const keys = Object.keys(value).sort()
        if (keys.length === 0) out.push({ path: prefix === '' ? '{}' : prefix, value: {} })
        else for (const key of keys) jsonLeaves(value[key], prefix === '' ? key : `${prefix}.${key}`, out)
        return
      }
      out.push({ path: prefix === '' ? '$' : prefix, value })
    }

    /** Structural diff of two JSON strings; null when either side is not JSON. */
    function jsonDiff(before, after) {
      let left
      let right
      try {
        left = JSON.parse(before)
        right = JSON.parse(after)
      } catch {
        return null
      }
      const leftLeaves = []
      const rightLeaves = []
      jsonLeaves(left, '', leftLeaves)
      jsonLeaves(right, '', rightLeaves)
      const leftMap = new Map(leftLeaves.map((leaf) => [leaf.path, leaf.value]))
      const rightMap = new Map(rightLeaves.map((leaf) => [leaf.path, leaf.value]))
      const paths = [...new Set([...leftMap.keys(), ...rightMap.keys()])].sort()
      const changes = []
      for (const path of paths) {
        const hasLeft = leftMap.has(path)
        const hasRight = rightMap.has(path)
        const leftValue = leftMap.get(path)
        const rightValue = rightMap.get(path)
        if (!hasLeft) {
          changes.push({ type: 'added', path, value: JSON.stringify(rightValue) })
        } else if (!hasRight) {
          changes.push({ type: 'removed', path, value: JSON.stringify(leftValue) })
        } else if (JSON.stringify(leftValue) !== JSON.stringify(rightValue)) {
          changes.push({ type: 'changed', path, from: JSON.stringify(leftValue), to: JSON.stringify(rightValue) })
        }
      }
      return { changes: changes.slice(0, 100), total: changes.length }
    }

    /** Minimal line diff: common prefix/suffix, then LCS for the middle. */
    function lineDiff(before, after) {
      const toLines = (value) => (value === undefined || value === null || value === '' ? [] : String(value).split('\n'))
      const left = toLines(before)
      const right = toLines(after)
      let start = 0
      while (start < left.length && start < right.length && left[start] === right[start]) start += 1
      let endLeft = left.length - 1
      let endRight = right.length - 1
      while (endLeft >= start && endRight >= start && left[endLeft] === right[endRight]) {
        endLeft -= 1
        endRight -= 1
      }
      const lines = []
      for (let index = 0; index < start; index += 1) lines.push({ type: 'same', text: left[index] })
      const middleLeft = left.slice(start, endLeft + 1)
      const middleRight = right.slice(start, endRight + 1)
      if (middleLeft.length * middleRight.length <= 40000) {
        const rows = middleLeft.length
        const cols = middleRight.length
        const table = Array.from({ length: rows + 1 }, () => new Uint16Array(cols + 1))
        for (let i = rows - 1; i >= 0; i -= 1) {
          for (let j = cols - 1; j >= 0; j -= 1) {
            table[i][j] = middleLeft[i] === middleRight[j]
              ? table[i + 1][j + 1] + 1
              : Math.max(table[i + 1][j], table[i][j + 1])
          }
        }
        let i = 0
        let j = 0
        while (i < rows && j < cols) {
          if (middleLeft[i] === middleRight[j]) {
            lines.push({ type: 'same', text: middleLeft[i] })
            i += 1
            j += 1
          } else if (table[i + 1][j] >= table[i][j + 1]) {
            lines.push({ type: 'remove', text: middleLeft[i] })
            i += 1
          } else {
            lines.push({ type: 'add', text: middleRight[j] })
            j += 1
          }
        }
        while (i < rows) {
          lines.push({ type: 'remove', text: middleLeft[i] })
          i += 1
        }
        while (j < cols) {
          lines.push({ type: 'add', text: middleRight[j] })
          j += 1
        }
      } else {
        for (const text of middleLeft) lines.push({ type: 'remove', text })
        for (const text of middleRight) lines.push({ type: 'add', text })
      }
      for (let index = endLeft + 1; index < left.length; index += 1) lines.push({ type: 'same', text: left[index] })
      pairLineSegments(lines)
      return lines
    }

    /** Character-level diff for one line pair, used to highlight changed characters. */
    function charDiff(before, after) {
      const left = Array.from(String(before ?? ''))
      const right = Array.from(String(after ?? ''))
      let start = 0
      while (start < left.length && start < right.length && left[start] === right[start]) start += 1
      let endLeft = left.length - 1
      let endRight = right.length - 1
      while (endLeft >= start && endRight >= start && left[endLeft] === right[endRight]) {
        endLeft -= 1
        endRight -= 1
      }
      const segments = []
      const push = (type, text) => {
        if (text === '') return
        const last = segments[segments.length - 1]
        if (last !== undefined && last.type === type) last.text += text
        else segments.push({ type, text })
      }
      for (let index = 0; index < start; index += 1) push('same', left[index])
      const middleLeft = left.slice(start, endLeft + 1)
      const middleRight = right.slice(start, endRight + 1)
      if (middleLeft.length * middleRight.length <= 40000) {
        const rows = middleLeft.length
        const cols = middleRight.length
        const table = Array.from({ length: rows + 1 }, () => new Uint16Array(cols + 1))
        for (let i = rows - 1; i >= 0; i -= 1) {
          for (let j = cols - 1; j >= 0; j -= 1) {
            table[i][j] = middleLeft[i] === middleRight[j]
              ? table[i + 1][j + 1] + 1
              : Math.max(table[i + 1][j], table[i][j + 1])
          }
        }
        let i = 0
        let j = 0
        while (i < rows && j < cols) {
          if (middleLeft[i] === middleRight[j]) {
            push('same', middleLeft[i])
            i += 1
            j += 1
          } else if (table[i + 1][j] >= table[i][j + 1]) {
            push('remove', middleLeft[i])
            i += 1
          } else {
            push('add', middleRight[j])
            j += 1
          }
        }
        while (i < rows) {
          push('remove', middleLeft[i])
          i += 1
        }
        while (j < cols) {
          push('add', middleRight[j])
          j += 1
        }
      } else {
        for (const char of middleLeft) push('remove', char)
        for (const char of middleRight) push('add', char)
      }
      for (let index = endLeft + 1; index < left.length; index += 1) push('same', left[index])
      return segments
    }

    /** Pair adjacent removed/added lines and attach character-level segments. */
    function pairLineSegments(lines) {
      let index = 0
      while (index < lines.length) {
        if (lines[index].type === 'same') {
          index += 1
          continue
        }
        const removes = []
        const adds = []
        while (index < lines.length && lines[index].type !== 'same') {
          if (lines[index].type === 'remove') removes.push(lines[index])
          else adds.push(lines[index])
          index += 1
        }
        const pairs = Math.min(removes.length, adds.length)
        for (let pair = 0; pair < pairs; pair += 1) {
          const segments = charDiff(removes[pair].text, adds[pair].text)
          removes[pair].segments = segments.filter((segment) => segment.type !== 'add')
          adds[pair].segments = segments.filter((segment) => segment.type !== 'remove')
        }
      }
    }

    function diffMarkdown(data, t) {
      const lines = []
      lines.push(`# ${translate(t, 'diffExportTitle', {
        fromTurn: data.fromTurn ?? '?', fromStep: data.fromStep ?? '?',
        toTurn: data.turn ?? '?', toStep: data.step ?? '?',
      })}`)
      lines.push('')
      lines.push(`- ${translate(t, 'diffTotal', {
        from: formatTokens(data.total?.from ?? 0),
        to: formatTokens(data.total?.to ?? 0),
      })}: ${signedTokens(data.totalDelta ?? 0)} ${translate(t, 'tokensLabel')}`)
      if (data.systemChanged) lines.push(`- ${translate(t, 'diffSystemChanged')}`)
      if (data.compactionBetween) lines.push(`- ${translate(t, 'diffCompaction')}`)
      lines.push('')
      lines.push(`## ${translate(t, 'mdBreakdown')}`)
      lines.push('')
      lines.push(`| ${translate(t, 'mdCategory')} | ${translate(t, 'diffPrevious')} | ${translate(t, 'diffCurrent')} | Δ |`)
      lines.push('|---|---|---|---|')
      for (const item of data.categories ?? []) {
        const count = item.fromCount !== undefined && item.toCount !== undefined
          ? ` (${item.fromCount} → ${item.toCount})`
          : ''
        lines.push(`| ${translate(t, item.key)}${count} | ${formatTokens(item.from)} | ${formatTokens(item.to)} | ${signedTokens(item.delta)} |`)
      }
      lines.push('')
      const tools = data.tools ?? {}
      if ((tools.added ?? []).length > 0 || (tools.removed ?? []).length > 0 || (tools.changed ?? []).length > 0) {
        lines.push(`## ${translate(t, 'diffTools')}`)
        for (const name of tools.added ?? []) lines.push(`- +${name}`)
        for (const name of tools.removed ?? []) lines.push(`- -${name}`)
        for (const name of tools.changed ?? []) lines.push(`- ~${name}`)
        lines.push('')
      }
      if (data.systemChanged) {
        lines.push(`## ${translate(t, 'mdSystem')}`)
        lines.push('')
        lines.push('```diff')
        for (const line of lineDiff(data.systemBefore ?? '', data.systemAfter ?? '')) {
          lines.push(`${line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '} ${line.text}`)
        }
        lines.push('```')
        lines.push('')
      }
      const messages = data.messages ?? {}
      if ((messages.addedCount ?? 0) + (messages.removedCount ?? 0) + (messages.changedCount ?? 0) > 0) {
        lines.push(`## ${translate(t, 'diffMessages')}`)
        lines.push('')
        const append = (kind, items) => {
          for (const item of items ?? []) {
            lines.push(`- ${kind} [${translate(t, 'roles')[item.role] ?? item.role}]${item.toolName === undefined ? '' : ` ${item.toolName}`}: ${item.preview || '—'}`)
          }
        }
        append('+', messages.added)
        append('-', messages.removed)
        append('~', messages.changed)
        lines.push('')
      }
      const attachments = data.attachments ?? {}
      if ((attachments.added ?? []).length > 0 || (attachments.removed ?? []).length > 0) {
        lines.push(`## ${translate(t, 'diffAttachments')}`)
        for (const item of attachments.added ?? []) lines.push(`- +${item.name}`)
        for (const item of attachments.removed ?? []) lines.push(`- -${item.name}`)
        lines.push('')
      }
      const noChanges = (data.totalDelta ?? 0) === 0
        && (data.categories ?? []).every((item) => item.delta === 0 && item.fromCount === item.toCount)
        && (tools.added ?? []).length === 0
        && (tools.removed ?? []).length === 0
        && (tools.changed ?? []).length === 0
        && (messages.addedCount ?? 0) === 0
        && (messages.removedCount ?? 0) === 0
        && (messages.changedCount ?? 0) === 0
        && (attachments.added ?? []).length === 0
        && (attachments.removed ?? []).length === 0
        && data.systemChanged !== true
        && data.compactionBetween !== true
      if (noChanges) lines.push(translate(t, 'diffNoChanges'))
      return lines.join('\n')
    }

    function downloadText(name, text, type) {
      const blob = new Blob([text], { type })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = name
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }

    function exportMarkdown(data, t) {
      const lines = []
      const counts = data.counts ?? {}
      const breakdown = data.breakdown ?? {}
      lines.push(`# ${translate(t, 'mdTitle')}`)
      lines.push('')
      if (data.step !== null && data.step !== undefined) {
        lines.push(`- ${translate(t, 'mdStep')}: T${data.step.turn} · S${data.step.step}`)
      }
      if (data.step?.promptTokens !== undefined) {
        lines.push(`- ${translate(t, 'mdActual')}: ${formatTokens(data.step.promptTokens)} / ${formatTokens(data.window ?? 0)}`)
      }
      lines.push(`- ${translate(t, 'mdExported')}: ${data.exportedAt}`)
      lines.push('')
      lines.push(`## ${translate(t, 'mdBreakdown')}`)
      lines.push('')
      lines.push(`| ${translate(t, 'mdCategory')} | ${translate(t, 'mdTokens')} | ${translate(t, 'mdCount')} |`)
      lines.push('|---|---|---|')
      const rows = [
        ['messages', 'messageTokens', counts.messages],
        ['attachments', 'attachmentTokens', counts.attachments],
        ['systemTools', 'systemToolsTokens', counts.systemTools],
        ['mcpTools', 'mcpToolsTokens', counts.mcpTools],
        ['system', 'systemTokens', null],
      ]
      for (const [key, field, count] of rows) {
        lines.push(`| ${translate(t, key)} | ${formatTokens(Number(breakdown[field] ?? 0))} | ${count ?? '—'} |`)
      }
      lines.push('')
      lines.push(`## ${translate(t, 'mdSystem')}`)
      lines.push('')
      lines.push('~~~text')
      lines.push(data.system ?? '')
      lines.push('~~~')
      lines.push('')
      lines.push(`## ${translate(t, 'mdTools')}`)
      lines.push('')
      for (const [group, key] of [['system', 'systemTools'], ['mcp', 'mcpTools']]) {
        lines.push(`### ${translate(t, key)}`)
        const tools = data.tools?.[group] ?? []
        if (tools.length === 0) lines.push('—')
        for (const tool of tools) {
          const description = String(tool.description ?? '').replace(/\s+/g, ' ').trim()
          lines.push(`- **${tool.name}**${description === '' ? '' : ` — ${description}`}`)
        }
        lines.push('')
      }
      lines.push(`## ${translate(t, 'mdMessages')}`)
      lines.push('')
      for (const message of data.messages ?? []) {
        lines.push(`### [${message.role}]${message.toolName === undefined ? '' : ` ${message.toolName}`}`)
        lines.push(`- ${translate(t, 'mdTokens')}: ${message.tokens ?? 0}`)
        if (message.reasoning) lines.push('', '~~~text', message.reasoning, '~~~')
        if (message.toolArguments) lines.push('', '~~~json', message.toolArguments, '~~~')
        if (message.text) lines.push('', '~~~text', message.text, '~~~')
        lines.push('')
      }
      lines.push(`## ${translate(t, 'mdAttachments')}`)
      lines.push('')
      const attachments = data.attachments ?? []
      if (attachments.length === 0) lines.push('—')
      for (const item of attachments) {
        lines.push(`- ${item.kind} · ${item.name} · ${Number(item.bytes ?? 0)}B`)
      }
      lines.push('')
      if (data.skills === null) lines.push(`> ${translate(t, 'mdSkillsNote')}`)
      return lines.join('\n')
    }

    function messageMatches(message, needle) {
      const haystack = [message.toolName, message.toolArguments, message.text, message.reasoning]
      return haystack.some((part) => String(part ?? '').toLowerCase().includes(needle))
    }

    function messageCopyText(message) {
      const lines = []
      if (message.role === 'tool') {
        lines.push(`[tool] ${String(message.toolName ?? '')}`)
        if (message.toolArguments !== undefined && message.toolArguments !== '') lines.push(message.toolArguments)
      } else {
        lines.push(`[${String(message.role ?? '')}]`)
      }
      if (message.reasoning) lines.push(message.reasoning)
      if (message.text) lines.push(message.text)
      return lines.join('\n')
    }

    function DetailsSection({ expandAll, className, summary, children }) {
      return h('details', { className, ...(expandAll ? { open: true } : {}) },
        h('summary', null, summary),
        children)
    }

    function MessageEntry({ message, t, expandAll, showReasoning }) {
      const [copied, setCopied] = React.useState(false)
      const role = String(message.role ?? 'user')
      const color = MESSAGE_ROLE_COLORS[role] ?? MESSAGE_ROLE_COLORS.system
      const roleLabel = translate(t, 'roles')[role] ?? role
      const tool = role === 'tool'
      const detailKey = (kind) => `${message.id ?? 'message'}:${kind}:${expandAll ? 'open' : 'closed'}`
      const detail = (kind, className, summary, children) => h(DetailsSection, {
        key: detailKey(kind),
        expandAll,
        className,
        summary,
        children,
      })
      const copy = async () => {
        try {
          await navigator.clipboard.writeText(messageCopyText(message))
          setCopied(true)
          setTimeout(() => setCopied(false), 1200)
        } catch {
          // Clipboard may be unavailable in a sandboxed webview; keep the label stable.
        }
      }
      return h('article', { className: 'dcb-entry' },
        h('div', { className: 'dcb-entry-head' },
          h('span', { className: 'dcb-role', style: { '--dcb-role': color } },
            message.toolName ? `${roleLabel} · ${message.toolName}` : roleLabel),
          tool && message.status !== undefined
            ? h('span', { className: `dcb-tool-status ${message.status}` }, translate(t, `toolStatus_${message.status}`))
            : null,
          tool && Number.isFinite(message.durationMs)
            ? h('span', { className: 'dcb-tool-duration' }, formatDuration(message.durationMs))
            : null,
          h('span', { className: 'dcb-entry-tk' }, formatTokens(Number(message.tokens ?? 0))),
          h('button', { type: 'button', className: 'dcb-entry-copy', onClick: copy }, copied ? translate(t, 'copied') : translate(t, 'copyEntry'))),
        tool
          ? h('div', { className: 'dcb-tool-calls' },
            message.toolArguments === undefined
              ? null
              : detail('input', 'dcb-tool-call dcb-tool-input',
                h('span', { className: 'dcb-tool-name' }, translate(t, 'argumentsLabel')),
                h('pre', null, message.toolArguments === '' ? '{}' : message.toolArguments)),
            message.text === ''
              ? null
              : detail('output', 'dcb-tool-call dcb-tool-output',
                h('span', null,
                  h('span', { className: 'dcb-tool-name' }, translate(t, 'outputLabel')),
                  message.isError === true ? h('span', { className: 'dcb-tool-args-label' }, translate(t, 'errorLabel')) : null),
                h('pre', null, message.text)))
          : null,
        !tool && message.text !== ''
          ? h('p', { className: 'dcb-entry-body' }, message.text)
          : null,
        !tool && message.reasoning && showReasoning !== false
          ? h('div', { className: 'dcb-tool-calls' },
            detail('reasoning', 'dcb-tool-call dcb-reasoning',
              h('span', { className: 'dcb-tool-args-label' }, translate(t, 'reasoningLabel')),
              h('pre', null, message.reasoning)))
          : null,
        message.toolCalls?.length
          ? h('div', { className: 'dcb-tool-calls' }, message.toolCalls.map((call) => detail(`legacy:${call.id}`, 'dcb-tool-call',
            h('span', null,
              h('span', { className: 'dcb-tool-name' }, call.name),
              h('span', { className: 'dcb-tool-args-label' }, translate(t, 'argumentsLabel'))),
            h('pre', null, call.arguments === '' ? '{}' : call.arguments))))
          : null)
    }

    /** Keep selected roles; roles outside the selector (system) stay visible. */
    function filterMessages(messages, visible) {
      return messages.filter((message) => {
        const role = String(message.role ?? 'user')
        return visible.has(role) || !MESSAGE_FILTER_ROLES.includes(role)
      })
    }

    /** Message log with role/search/state filters and paged history. */
    function MessageLog({ data, t, onLoadMore, loadingMore, sessionId, onJumpToStep, onOpenCategory }) {
      const messages = data.messages ?? []
      const total = Number.isFinite(Number(data.total)) ? Number(data.total) : messages.length
      const hasMore = data.hasMore === true && typeof onLoadMore === 'function'
      const storedView = recallMessageView(sessionId)
      const storedRoles = Array.isArray(storedView?.visible)
        ? storedView.visible.filter((role) => MESSAGE_FILTER_ROLES.includes(role))
        : null
      const [visible, setVisible] = React.useState(() => new Set(storedRoles === null ? MESSAGE_FILTER_ROLES : storedRoles))
      const [query, setQuery] = React.useState(() => String(storedView?.query ?? ''))
      const [errorsOnly, setErrorsOnly] = React.useState(() => storedView?.errorsOnly === true)
      const [showReasoning, setShowReasoning] = React.useState(() => storedView?.showReasoning !== false)
      const [expandAll, setExpandAll] = React.useState(() => storedView?.expandAll === true)
      const storedKinds = Array.isArray(storedView?.kinds)
        ? storedView.kinds.filter((kind) => SEARCH_KINDS.includes(kind))
        : null
      const [globalKinds, setGlobalKinds] = React.useState(() => new Set(storedKinds === null ? SEARCH_KINDS : storedKinds))
      const [globalSearch, setGlobalSearch] = React.useState(null)
      const [globalDetail, setGlobalDetail] = React.useState(null)
      const [globalActive, setGlobalActive] = React.useState(0)
      const [globalLoadingMore, setGlobalLoadingMore] = React.useState(false)
      const globalPanelRef = React.useRef(null)
      const globalListRef = React.useRef(null)
      const globalSearchTokenRef = React.useRef(0)
      React.useEffect(() => {
        rememberMessageView(sessionId, {
          visible: [...visible],
          query,
          errorsOnly,
          showReasoning,
          expandAll,
          kinds: [...globalKinds],
        })
      }, [sessionId, visible, query, errorsOnly, showReasoning, expandAll, globalKinds])
      React.useEffect(() => {
        if (globalSearch?.status !== 'ready' || globalPanelRef.current === null) return
        globalPanelRef.current.focus()
      }, [globalSearch?.status, globalSearch?.query])
      React.useEffect(() => {
        if (globalSearch?.status !== 'ready' || globalListRef.current === null) return
        const row = globalListRef.current.querySelector(`[data-result-index="${globalActive}"]`)
        if (row !== null) row.scrollIntoView({ block: 'nearest' })
      }, [globalActive, globalSearch?.status])
      if (messages.length === 0) return h('div', { className: 'dcb-loading' }, translate(t, 'empty'))
      const base = showReasoning
        ? messages
        : messages.filter((message) => message.role !== 'assistant' || message.text !== '')
      const counts = {}
      for (const message of base) {
        const role = String(message.role ?? 'user')
        counts[role] = (counts[role] ?? 0) + 1
      }
      const needle = query.trim().toLowerCase()
      const shown = filterMessages(base, visible).filter((message) => {
        if (errorsOnly && !(message.role === 'tool' && message.isError === true)) return false
        return needle === '' || messageMatches(message, needle)
      })
      const hiddenAll = MESSAGE_FILTER_ROLES.every((role) => !visible.has(role))
      const toggle = (role) => {
        const next = new Set(visible)
        if (next.has(role)) next.delete(role)
        else next.add(role)
        setVisible(next)
        if (globalSearch !== null) {
          setGlobalDetail(null)
          runGlobalSearch(next)
        }
      }
      const showAllRoles = () => {
        const next = new Set(MESSAGE_FILTER_ROLES)
        setVisible(next)
        if (globalSearch !== null) {
          setGlobalDetail(null)
          runGlobalSearch(next)
        }
      }
      const toggleGlobalKind = (kind) => {
        const next = new Set(globalKinds)
        if (next.has(kind)) next.delete(kind)
        else next.add(kind)
        setGlobalKinds(next)
        if (globalSearch !== null) {
          setGlobalDetail(null)
          runGlobalSearch(undefined, next)
        }
      }
      const toggleButton = (active, label, onClick) => h('button', {
        type: 'button',
        className: 'dcb-msg-toggle',
        'aria-pressed': active,
        onClick,
      }, label)
      const runGlobalSearch = async (rolesOverride, kindsOverride) => {
        const searchQuery = query.trim()
        if (searchQuery === '' || sessionId === undefined || sessionId === null) return
        const roles = rolesOverride === undefined ? visible : rolesOverride
        const kinds = kindsOverride === undefined ? globalKinds : kindsOverride
        const token = globalSearchTokenRef.current + 1
        globalSearchTokenRef.current = token
        setGlobalDetail(null)
        setGlobalActive(0)
        setGlobalSearch({ status: 'loading', query: searchQuery })
        try {
          const body = await fetchJson(categoryUrl(sessionId, 'search', undefined, {
            q: searchQuery,
            limit: 30,
            offset: 0,
            roles: [...roles].join(','),
            kinds: [...kinds].join(','),
          }))
          if (globalSearchTokenRef.current !== token) return
          setGlobalSearch({ status: 'ready', query: searchQuery, data: body })
        } catch (error) {
          if (globalSearchTokenRef.current !== token) return
          setGlobalSearch({ status: 'error', query: searchQuery, error: String(error?.message ?? error) })
        }
      }
      const loadMoreGlobal = async () => {
        const current = globalSearch
        if (current?.status !== 'ready' || current.data.nextOffset === null || globalLoadingMore) return
        if (sessionId === undefined || sessionId === null) return
        const token = globalSearchTokenRef.current
        setGlobalLoadingMore(true)
        try {
          const body = await fetchJson(categoryUrl(sessionId, 'search', undefined, {
            q: current.query,
            limit: 30,
            offset: current.data.nextOffset,
            roles: [...visible].join(','),
            kinds: [...globalKinds].join(','),
          }))
          if (globalSearchTokenRef.current !== token) return
          setGlobalSearch((state) => (state?.status === 'ready'
            ? {
              ...state,
              data: {
                ...state.data,
                results: [...state.data.results, ...body.results],
                total: body.total,
                nextOffset: body.nextOffset,
              },
            }
            : state))
        } catch {
          // The current page stays; the button is retryable.
        } finally {
          setGlobalLoadingMore(false)
        }
      }
      const openGlobalDetail = async (result) => {
        if (sessionId === undefined || sessionId === null) return
        if (globalDetail?.id === result.id) {
          setGlobalDetail(null)
          return
        }
        setGlobalDetail({ id: result.id, status: 'loading' })
        try {
          const body = await fetchJson(categoryUrl(sessionId, 'message', undefined, { scope: 'all', id: result.id }))
          setGlobalDetail({ id: result.id, status: 'ready', data: body })
        } catch (error) {
          setGlobalDetail({ id: result.id, status: 'error', error: String(error?.message ?? error) })
        }
      }
      const isMessageResult = (result) => result.kind === undefined || result.kind === 'message'
      const jumpTo = (result) => {
        if (typeof onJumpToStep !== 'function') return
        onJumpToStep(result.at === null ? 'live' : result.at)
        if (!isMessageResult(result) && typeof onOpenCategory === 'function' && typeof result.category === 'string') {
          onOpenCategory(result.category)
        }
      }
      const activateGlobalResult = (result) => {
        if (isMessageResult(result)) openGlobalDetail(result)
        else jumpTo(result)
      }
      const handleGlobalKeyDown = (event) => {
        if (globalSearch?.status !== 'ready') return
        const results = globalSearch.data.results ?? []
        if (event.key === 'Escape') {
          event.preventDefault()
          globalSearchTokenRef.current += 1
          setGlobalSearch(null)
          setGlobalDetail(null)
          return
        }
        if (event.key === 'Enter' && event.target === globalPanelRef.current && results.length > 0) {
          event.preventDefault()
          const target = results[Math.max(0, Math.min(results.length - 1, globalActive))]
          if (target !== undefined) activateGlobalResult(target)
          return
        }
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Home' && event.key !== 'End') return
        if (results.length === 0) return
        event.preventDefault()
        let next = globalActive
        if (event.key === 'ArrowDown') next = Math.min(results.length - 1, globalActive + 1)
        else if (event.key === 'ArrowUp') next = Math.max(0, globalActive - 1)
        else if (event.key === 'Home') next = 0
        else next = results.length - 1
        setGlobalActive(next)
      }
      const renderGlobalMessage = (detail) => {
        const message = detail.message
        if (message === null || message === undefined) {
          return h('div', { className: 'dcb-global-detail' }, translate(t, 'diffNoContent'))
        }
        const fields = []
        if (message.text) fields.push([message.role === 'tool' ? 'diffOutput' : 'diffText', message.text])
        if (message.reasoning) fields.push(['diffReasoning', message.reasoning])
        if (message.toolArguments) fields.push(['diffArguments', message.toolArguments])
        return h('div', { className: 'dcb-global-detail' },
          h('div', { className: 'dcb-global-detail-head' },
            h('span', null, `${translate(t, 'roles')[message.role] ?? message.role}${message.toolName === undefined ? '' : ` · ${message.toolName}`}`),
            h('span', null, `${message.tokens ?? 0} ${translate(t, 'tokensLabel')}`),
            message.status === undefined ? null : h('span', null, message.status)),
          fields.length === 0
            ? h('div', { className: 'dcb-diff-empty' }, translate(t, 'diffNoContent'))
            : fields.map(([label, value]) => h('div', { key: label, className: 'dcb-diff-field' },
              h('div', { className: 'dcb-diff-field-label' }, translate(t, label)),
              h('pre', { className: 'dcb-diff-pre' }, value))))
      }
      const globalPanel = globalSearch === null ? null : h('div', {
        className: 'dcb-global',
        ref: globalPanelRef,
        tabIndex: -1,
        onKeyDown: handleGlobalKeyDown,
      },
        h('div', { className: 'dcb-global-head', title: translate(t, 'globalSearchScopeHint') },
          h('span', null, translate(t, 'globalSearchTitle', { query: globalSearch.query })),
          globalSearch.status === 'ready'
            ? h('span', null, translate(t, 'globalSearchCount', { total: globalSearch.data.total, shown: globalSearch.data.results.length }))
            : null,
          h('button', { type: 'button', className: 'dcb-msg-more', onClick: () => { globalSearchTokenRef.current += 1; setGlobalSearch(null); setGlobalDetail(null) } }, translate(t, 'backToLoaded'))),
        h('div', { className: 'dcb-global-kinds' },
          SEARCH_KINDS.map((kind) => h('button', {
            key: kind,
            type: 'button',
            className: globalKinds.has(kind) ? 'dcb-global-kind-chip on' : 'dcb-global-kind-chip',
            'aria-pressed': globalKinds.has(kind),
            onClick: () => toggleGlobalKind(kind),
          }, translate(t, kind === 'message' ? 'searchKindMessage' : kind === 'system' ? 'searchKindSystem' : kind === 'tool' ? 'searchKindTool' : 'searchKindSkill')))),
        globalSearch.status === 'loading' ? h('div', { className: 'dcb-loading' }, translate(t, 'loading')) : null,
        globalSearch.status === 'error' ? h('div', { className: 'dcb-loading' }, translate(t, 'globalSearchFailed')) : null,
        globalSearch.status === 'ready'
          ? (globalSearch.data.results.length === 0
            ? h('div', { className: 'dcb-loading' }, translate(t, 'noGlobalResults'))
            : h('div', { className: 'dcb-global-list', ref: globalListRef }, globalSearch.data.results.map((result, index) => {
              const messageResult = isMessageResult(result)
              const open = messageResult && globalDetail?.id === result.id
              const active = index === globalActive
              const kindLabel = result.kind === 'system'
                ? translate(t, 'searchKindSystem')
                : result.kind === 'tool'
                  ? translate(t, 'searchKindTool')
                  : result.kind === 'skill'
                    ? translate(t, 'searchKindSkill')
                    : translate(t, 'searchKindMessage')
              return h('div', { key: result.id, className: active ? 'dcb-global-result active' : 'dcb-global-result', 'data-result-index': index },
                h('div', { className: 'dcb-global-row' },
                  h('button', {
                    type: 'button',
                    className: 'dcb-global-open',
                    'aria-expanded': messageResult ? open : undefined,
                    onClick: () => activateGlobalResult(result),
                  },
                    h('span', { className: 'dcb-global-step' }, result.at === null ? translate(t, 'historyLive') : `T${result.turn} · S${result.step}`),
                    h('span', { className: 'dcb-global-kind' }, kindLabel),
                    messageResult ? h('span', { className: 'dcb-global-role' }, translate(t, 'roles')[result.role] ?? result.role) : null,
                    result.toolName === undefined ? null : h('span', { className: 'dcb-global-tool' }, result.toolName),
                    h('span', { className: 'dcb-global-preview' }, result.preview === '' || result.preview === undefined ? '—' : result.preview),
                    h('span', { className: 'dcb-diff-msg-open', 'aria-hidden': true }, messageResult ? (open ? '▾' : '▸') : '→')),
                  h('button', { type: 'button', className: 'dcb-global-jump', onClick: () => jumpTo(result) }, translate(t, 'jumpToStep'))),
                open
                  ? (globalDetail.status === 'loading'
                    ? h('div', { className: 'dcb-global-detail dcb-loading' }, translate(t, 'loading'))
                    : globalDetail.status === 'error'
                      ? h('div', { className: 'dcb-global-detail dcb-error' }, translate(t, 'loadError'))
                      : renderGlobalMessage(globalDetail.data))
                  : null)
            })))
          : null,
        globalSearch.status === 'ready' && globalSearch.data.nextOffset !== null && globalSearch.data.nextOffset !== undefined
          ? h('div', { className: 'dcb-global-foot' },
            h('button', {
              type: 'button',
              className: 'dcb-msg-more',
              disabled: globalLoadingMore,
              onClick: loadMoreGlobal,
            }, globalLoadingMore ? translate(t, 'loading') : translate(t, 'loadMoreResults')))
          : null)
      return h('div', null,
        h('div', { className: 'dcb-msg-tools' },
          h('div', { className: 'dcb-filter', role: 'group', 'aria-label': translate(t, 'filterByRole') },
            MESSAGE_FILTER_ROLES.map((role) => h('button', {
              key: role,
              type: 'button',
              className: 'dcb-filter-chip',
              'aria-pressed': visible.has(role),
              onClick: () => toggle(role),
            },
              h('span', { className: 'dcb-filter-dot', style: { '--dcb-role-dot': MESSAGE_ROLE_COLORS[role] }, 'aria-hidden': true }),
              h('span', null, translate(t, 'roles')[role] ?? role),
              h('span', { className: 'dcb-filter-count' }, String(counts[role] ?? 0))))),
          h('div', { className: 'dcb-msg-search' },
            h('input', {
              className: 'dcb-msg-input',
              type: 'search',
              value: query,
              placeholder: translate(t, 'searchMessages'),
              'aria-label': translate(t, 'searchMessages'),
              onChange: (event) => {
                setQuery(event.target.value)
                setGlobalSearch(null)
                setGlobalDetail(null)
                globalSearchTokenRef.current += 1
              },
            }),
            toggleButton(errorsOnly, translate(t, 'onlyErrors'), () => setErrorsOnly((value) => !value)),
            toggleButton(showReasoning, translate(t, 'showReasoning'), () => setShowReasoning((value) => !value)),
            h('button', {
              type: 'button',
              className: 'dcb-msg-toggle',
              'aria-pressed': expandAll,
              onClick: () => setExpandAll((value) => !value),
            }, translate(t, expandAll ? 'collapseAll' : 'expandAllLabel')),
            h('button', {
              type: 'button',
              className: 'dcb-msg-toggle',
              disabled: query.trim() === '',
              onClick: runGlobalSearch,
            }, translate(t, 'globalSearch'))),
          globalSearch === null
            ? h('div', { className: 'dcb-msg-meta' },
              h('span', null, translate(t, 'loadedCount', { loaded: messages.length, total })),
              needle === '' ? null : h('span', null, translate(t, 'matchCount', { count: shown.length })),
              hasMore
                ? h('button', {
                  type: 'button',
                  className: 'dcb-msg-more',
                  disabled: loadingMore === true,
                  onClick: onLoadMore,
                }, loadingMore === true ? translate(t, 'loading') : translate(t, 'loadMore'))
                : null)
            : null,
        globalSearch === null
          ? (shown.length === 0
            ? h('div', { className: 'dcb-loading dcb-msg-hidden' },
              translate(t, hiddenAll ? 'allRolesHidden' : 'noFilteredMessages'),
              hiddenAll
                ? h('button', { type: 'button', className: 'dcb-msg-more', onClick: showAllRoles }, translate(t, 'showAllRoles'))
                : null)
            : h('div', { className: 'dcb-log' }, shown.map((message, index) => h(MessageEntry, {
              key: message.id ?? index,
              message,
              t,
              expandAll,
              showReasoning,
            }))))
          : globalPanel))
    }

    /** Attachment rows; clicking opens a preview tab in the right Sidebar. */
    function AttachmentList({ data, t, onOpen }) {
      const attachments = data.attachments ?? []
      if (attachments.length === 0) return h('div', { className: 'dcb-loading' }, translate(t, 'empty'))
      return h('div', null, attachments.map((item) => h('button', {
        key: `${item.attachmentId ?? ''}:${item.index}`,
        type: 'button',
        className: 'dcb-att',
        title: translate(t, 'openAttachment'),
        onClick: () => onOpen(item),
      },
        h('span', { className: 'dcb-att-kind' }, item.kind === 'image' ? 'image' : 'file'),
        h('div', { className: 'dcb-att-main' },
          h('div', { className: 'dcb-att-name' }, item.name),
          h('div', { className: 'dcb-att-meta' },
            [item.mimeType, item.width ? `${item.width} × ${item.height}` : '', item.bytes ? `${formatTokens(item.bytes)}B` : ''].filter(Boolean).join(' · ')),
          h('div', { className: 'dcb-att-path' }, shortAttachmentId(item))),
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
      const tokens = tools.reduce((sum, tool) => sum + Number(tool.tokens ?? 0), 0)
      return h('div', { className: open ? 'dcb-group open' : 'dcb-group' },
        h('button', { type: 'button', className: 'dcb-group-head', onClick: onToggle, 'aria-expanded': open },
          h('span', { className: 'dcb-cat-chev', 'aria-hidden': true }, h(ChevronRight)),
          h('span', { className: 'dcb-group-name' },
            group === 'builtin' ? translate(t, 'builtinTools')
              : group.startsWith('server:') ? translate(t, 'serverGroup', { name: group.slice(7) })
                : translate(t, 'pluginGroup', { name: group }),
            h('span', { className: 'dcb-group-count' }, translate(t, 'toolCount', { count: tools.length }))),
          h('span', { className: 'dcb-group-tokens' }, formatTokens(tokens))),
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

    function SkillDefinition({ skill, t }) {
      return h('article', { className: 'dcb-def' },
        h('div', { className: 'dcb-def-head' },
          h('span', { className: 'dcb-def-name' }, skill.name),
          h('span', { className: 'dcb-def-tk' }, formatTokens(Number(skill.tokens ?? 0)))),
        skill.description === '' ? null : h('p', { className: 'dcb-def-desc' }, skill.description),
        skill.content === undefined || skill.content === '' ? null : h('details', null,
          h('summary', null, translate(t, 'viewContent')),
          h('pre', null, skill.content)))
    }

    const SKILL_SCOPE_GROUPS = [
      ['custom', 'skillGroupCustom'],
      ['project', 'skillGroupProject'],
      ['user', 'skillGroupUser'],
      ['runtime', 'skillGroupRuntime'],
      ['bundled', 'skillGroupBundled'],
      ['other', 'skillGroupOther'],
    ]
    const SKILL_SCOPE_LABELS = Object.fromEntries(SKILL_SCOPE_GROUPS)
    const SKILL_SCOPE_RANK = new Map(SKILL_SCOPE_GROUPS.map(([key], index) => [key, index]))
    /** Provider names that register a whole skill package, with their short display names. */
    const SKILL_PACKAGE_LABELS = { 'dsh-office': 'office', 'dsh-badge': 'dsh-badge' }
    const COUNT_KEYS = {
      messages: 'messageCount',
      attachments: 'attachmentCount',
      systemTools: 'toolCount',
      mcpTools: 'toolCount',
      skills: 'skillCount',
    }

    /**
     * Group by the package that provides the skill: a provider that ships several
     * skills (dsh-office, dsh-badge) stays one package, while filesystem-discovered
     * skills fall back to their scope (custom / project / user / bundled).
     */
    function skillPackageGroup(skill) {
      const provider = String(skill?.provider ?? '')
      if (provider !== '' && provider !== 'filesystem') return `pkg:${provider}`
      const source = String(skill?.source ?? '')
      if (source === 'custom' || source === 'runtime' || source === 'bundled') return `scope:${source}`
      if (source.startsWith('user-') || source === 'user') return 'scope:user'
      if (source.startsWith('project-') || source === 'project') return 'scope:project'
      return 'scope:other'
    }

    function skillPackageRank(key) {
      if (key.startsWith('pkg:')) return 0
      return 10 + (SKILL_SCOPE_RANK.get(key.slice(6)) ?? 99)
    }

    function skillGroupLabel(t, key) {
      if (key.startsWith('pkg:')) {
        const provider = key.slice(4)
        return translate(t, 'skillPackage', { name: SKILL_PACKAGE_LABELS[provider] ?? provider })
      }
      const label = SKILL_SCOPE_LABELS[key.slice(6)]
      return label === undefined ? translate(t, 'skillGroupOther') : translate(t, label)
    }

    function SkillGroup({ groupKey, skills, open, onToggle, t }) {
      const tokens = skills.reduce((sum, skill) => sum + Number(skill.tokens ?? 0), 0)
      return h('div', { className: open ? 'dcb-group open' : 'dcb-group' },
        h('button', { type: 'button', className: 'dcb-group-head', onClick: onToggle, 'aria-expanded': open },
          h('span', { className: 'dcb-cat-chev', 'aria-hidden': true }, h(ChevronRight)),
          h('span', { className: 'dcb-group-name' },
            skillGroupLabel(t, groupKey),
            h('span', { className: 'dcb-group-count' }, translate(t, 'skillCount', { count: skills.length }))),
          h('span', { className: 'dcb-group-tokens' }, formatTokens(tokens))),
        h('div', { className: 'dcb-group-body' },
          skills.map((skill) => h(SkillDefinition, { key: skill.name, skill, t }))))
    }

    function SkillGroupList({ entries, t }) {
      const [openGroups, setOpenGroups] = React.useState(() => new Set(entries.slice(0, 1).map(([id]) => id)))
      return h('div', null, entries.map(([id, skills]) => h(SkillGroup, {
        key: id,
        groupKey: id,
        skills,
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
      const groups = new Map()
      for (const skill of skills) {
        const id = skillPackageGroup(skill)
        if (!groups.has(id)) groups.set(id, [])
        groups.get(id).push(skill)
      }
      const tokenSum = (items) => items.reduce((sum, skill) => sum + Number(skill.tokens ?? 0), 0)
      const entries = [...groups.entries()].sort((a, b) => {
        const rankA = skillPackageRank(a[0])
        const rankB = skillPackageRank(b[0])
        return rankA - rankB || tokenSum(b[1]) - tokenSum(a[1])
      })
      return h(SkillGroupList, { entries, t })
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

    function CategoryContent({ category, detail, t, onRetry, onOpenAttachment, onLoadMore, loadingMore, sessionId, onJumpToStep, onOpenCategory }) {
      if (detail === undefined) return null
      if (detail.status === 'loading') return h('div', { className: 'dcb-loading' }, translate(t, 'loading'))
      if (detail.status === 'error') {
        return h('div', { className: 'dcb-error' },
          `${translate(t, 'loadError')}: ${errorText(t, detail.error)}`,
          h('button', { type: 'button', className: 'dcb-retry', onClick: onRetry }, translate(t, 'retry')))
      }
      const data = detail.data ?? {}
      if (category === 'messages') return h(MessageLog, { data, t, onLoadMore, loadingMore, sessionId, onJumpToStep, onOpenCategory })
      if (category === 'attachments') return h(AttachmentList, { data, t, onOpen: onOpenAttachment })
      if (category === 'systemTools' || category === 'mcpTools') return h(ToolGroups, { data, t })
      if (category === 'skills') return h(SkillList, { data, t })
      if (category === 'system') return h(SystemPrompt, { data, t })
      return null
    }

    /** Turn a historical counts response into the same row shape the live view uses. */
    function snapshotView(snapshot, fallbackWindow) {
      const window_ = Number(snapshot?.window ?? fallbackWindow ?? 0)
      if (!(window_ > 0)) return null
      const breakdown = snapshot?.breakdown ?? {}
      const counts = snapshot?.counts ?? {}
      const rawRows = CATEGORIES
        .map((category) => {
          const tokens = Math.max(0, Number(breakdown[DETAILED_FIELDS[category.key]] ?? 0))
          return {
            ...category,
            tokens,
            rawTokens: tokens,
            count: counts[category.key],
            percent: Math.min(100, (tokens / window_) * 100),
          }
        })
        .filter((row) => row.tokens > 0)
      const estimated = rawRows.reduce((sum, row) => sum + Number(row.tokens ?? 0), 0)
      const prompt = Number(snapshot?.promptTokens)
      const used = Number.isFinite(prompt) && prompt > 0 ? prompt : estimated
      const rows = allocateRows(rawRows, used, window_)
      return {
        used,
        window: window_,
        usedPercent: Math.min(100, (used / window_) * 100),
        rows,
        historical: true,
        ...accounting(rows, used, window_, 'actual'),
      }
    }

    function groupHistorySteps(steps) {
      const groups = new Map()
      for (const step of steps) {
        const turn = Number(step.turn ?? 0)
        if (!groups.has(turn)) groups.set(turn, [])
        groups.get(turn).push(step)
      }
      return [...groups.entries()]
    }

    function historyOptionLabel(t, step) {
      const tokens = Number.isFinite(Number(step.promptTokens))
        ? formatTokens(Number(step.promptTokens))
        : '—'
      return translate(t, 'historyOption', { turn: step.turn, step: step.step, tokens })
    }

    function categoryRows(view, details, counts) {
      if (view === null) return []
      const rows = view.rows.filter((row) => row.key !== 'system')
      rows.push({ key: 'skills', color: SKILLS_COLOR, tokens: undefined, count: counts?.skills, percent: undefined })
      const system = view.rows.find((row) => row.key === 'system')
      if (system !== undefined) rows.push(system)
      return rows
    }

    /** Counts derived from an already-loaded category payload, staying in sync with the list. */
    function loadedCategoryCount(category, detail) {
      if (detail?.status !== 'ready') return undefined
      const data = detail.data ?? {}
      if (category === 'messages') {
        if (!Array.isArray(data.messages)) return undefined
        return Number.isFinite(Number(data.total)) ? Number(data.total) : data.messages.length
      }
      if (category === 'attachments') return Array.isArray(data.attachments) ? data.attachments.length : undefined
      if (category === 'skills') return Array.isArray(data.skills) ? data.skills.length : undefined
      if (category === 'systemTools' || category === 'mcpTools') {
        return Array.isArray(data.tools) ? data.tools.length : undefined
      }
      return undefined
    }

    /** Right-Sidebar "上下文" tab. */
    function ContextSidebarBody({ useProjection, t, sessionId }) {
      const pressure = useProjection('contextPressure')
      const detailed = useProjection('contextBreakdownDetailed')
      const basic = useProjection('contextBreakdown')
      const [liveBasis, setLiveBasis] = useLiveBasis()
      const [expanded, setExpanded] = React.useState(() => recallSidebarView(sessionId)?.expanded ?? null)
      const [details, setDetails] = React.useState({})
      const [loadingMore, setLoadingMore] = React.useState(false)
      const [counts, setCounts] = React.useState({})
      const [pinned, setPinned] = React.useState(() => recallSidebarView(sessionId)?.pinned ?? null)
      const [diff, setDiff] = React.useState(null)
      const [diffMessage, setDiffMessage] = React.useState(null)
      const [copiedDiff, setCopiedDiff] = React.useState(false)
      const [exporting, setExporting] = React.useState(null)
      const [history, setHistory] = React.useState(null)
      const [historyError, setHistoryError] = React.useState(null)
      const [historyLoading, setHistoryLoading] = React.useState(false)
      const [historyOpen, setHistoryOpen] = React.useState(false)
      const [historyQuery, setHistoryQuery] = React.useState('')
      const [historyScroll, setHistoryScroll] = React.useState(0)
      const [historyActive, setHistoryActive] = React.useState(null)
      const [following, setFollowing] = React.useState(() => recallSidebarView(sessionId)?.following ?? true)
      const historyRef = React.useRef(null)
      const historyListRef = React.useRef(null)
      const historySearchRef = React.useRef(null)
      const historyTokenRef = React.useRef(0)
      const scrollRef = React.useRef(null)
      const scrollTopRef = React.useRef(recallSidebarView(sessionId)?.scrollTop ?? 0)
      const scrollTargetRef = React.useRef(recallSidebarView(sessionId)?.scrollTop ?? 0)
      const scrollRestoredRef = React.useRef(false)
      const scrollUserRef = React.useRef(false)
      const [selection, setSelection] = React.useState(() => recallSidebarView(sessionId)?.selection ?? null)
      const [snapshot, setSnapshot] = React.useState(null)
      const [revision, setRevision] = React.useState(0)
      const requestRef = React.useRef({})
      const [pending, setPending] = React.useState({ seq: pendingCategory.seq, category: pendingCategory.value })
      const [attachment, setAttachment] = React.useState(null)
      const liveView = contextView(pressure, detailed, basic, liveBasis)
      const historical = typeof selection === 'number'
      const historicalReady = historical && snapshot?.status === 'ready'
      const view = historicalReady ? snapshotView(snapshot.data, liveView?.window) : liveView

      const load = async (category, options = {}) => {
        if (sessionId === undefined || sessionId === null) {
          setDetails((current) => ({ ...current, [category]: { status: 'error', error: 'no-session' } }))
          return
        }
        const at = typeof selection === 'number' ? selection : undefined
        const next = (requestRef.current[category] ?? 0) + 1
        requestRef.current[category] = next
        const keep = options.silent === true && details[category]?.status === 'ready'
        if (!keep) setDetails((current) => ({ ...current, [category]: { status: 'loading' } }))
        try {
          const body = await fetchJson(categoryUrl(sessionId, category, at))
          if (requestRef.current[category] !== next) return
          setDetails((current) => ({ ...current, [category]: { status: 'ready', data: body } }))
        } catch (error) {
          if (requestRef.current[category] !== next) return
          if (!keep) setDetails((current) => ({ ...current, [category]: { status: 'error', error: String(error?.message ?? error) } }))
        }
      }

      const loadMoreMessages = async () => {
        const detail = details.messages
        if (sessionId === undefined || sessionId === null || loadingMore) return
        if (detail?.status !== 'ready' || detail.data?.hasMore !== true) return
        const cursor = Number(detail.data?.nextBefore)
        if (!Number.isInteger(cursor) || cursor <= 0) return
        const token = (requestRef.current.messagesMore ?? 0) + 1
        requestRef.current.messagesMore = token
        setLoadingMore(true)
        try {
          const at = typeof selection === 'number' ? selection : undefined
          const body = await fetchJson(categoryUrl(sessionId, 'messages', at, { before: cursor, limit: 40 }))
          if (requestRef.current.messagesMore !== token) return
          setDetails((current) => {
            const previous = current.messages
            if (previous?.status !== 'ready') return current
            return {
              ...current,
              messages: {
                status: 'ready',
                data: {
                  ...body,
                  messages: [...(body.messages ?? []), ...(previous.data.messages ?? [])],
                },
              },
            }
          })
        } catch {
          // Keep the loaded page; the same button retries the older page.
        } finally {
          setLoadingMore(false)
        }
      }

      // A different session restores its remembered step and invalidates loaded payloads.
      React.useEffect(() => {
        const stored = recallSidebarView(sessionId)
        setHistory(null)
        setHistoryError(null)
        setHistoryLoading(false)
        setHistoryOpen(false)
        setHistoryQuery('')
        setHistoryScroll(0)
        setHistoryActive(null)
        setFollowing(stored?.following ?? true)
        historyTokenRef.current += 1
        setExpanded(stored?.expanded ?? null)
        const scrollTop = Number(stored?.scrollTop ?? 0)
        scrollTopRef.current = scrollTop
        scrollTargetRef.current = scrollTop
        scrollRestoredRef.current = scrollTop === 0
        scrollUserRef.current = false
        setSelection(stored?.selection ?? null)
        setSnapshot(null)
        setDetails({})
        setLoadingMore(false)
        setPinned(stored?.pinned ?? null)
        setDiff(null)
        setDiffMessage(null)
        setCopiedDiff(false)
        setExporting(null)
        requestRef.current = {}
      }, [sessionId])

      const memorySessionRef = React.useRef(sessionId)
      React.useEffect(() => {
        if (memorySessionRef.current !== sessionId) {
          memorySessionRef.current = sessionId
          return
        }
        rememberSidebarView(sessionId, { selection, pinned, following, expanded, scrollTop: scrollTopRef.current })
      }, [sessionId, selection, pinned, following, expanded])

      // Persist the last scroll offset when this session view goes away.
      React.useEffect(() => {
        return () => {
          if (sessionId === undefined || sessionId === null) return
          const stored = recallSidebarView(sessionId) ?? {}
          rememberSidebarView(sessionId, { ...stored, scrollTop: scrollTopRef.current })
        }
      }, [sessionId])

      // Restore the sidebar scroll after mount, session switch, or file preview.
      React.useEffect(() => {
        const node = scrollRef.current
        if (node === null) return
        const target = Number(scrollTargetRef.current ?? 0)
        if (!Number.isFinite(target) || target <= 0) {
          scrollRestoredRef.current = true
          return
        }
        node.scrollTop = target
        if (node.scrollHeight - node.clientHeight >= target) scrollRestoredRef.current = true
      }, [sessionId, attachment])

      // Content grows as categories load; keep trying until the remembered offset is reachable.
      React.useEffect(() => {
        if (scrollRestoredRef.current) return
        const node = scrollRef.current
        if (node === null) return
        const target = Number(scrollTargetRef.current ?? 0)
        if (!Number.isFinite(target) || target <= 0) {
          scrollRestoredRef.current = true
          return
        }
        node.scrollTop = target
        if (node.scrollHeight - node.clientHeight >= target) scrollRestoredRef.current = true
      }, [sessionId, selection, attachment, history?.steps?.length, expanded, details[expanded]?.status, snapshot?.status])

      const loadHistory = async (selectLatest = false) => {
        if (sessionId === undefined || sessionId === null) return
        const token = historyTokenRef.current + 1
        historyTokenRef.current = token
        setHistoryLoading(true)
        setHistoryError(null)
        try {
          const body = await fetchJson(categoryUrl(sessionId, 'history'))
          if (historyTokenRef.current !== token) return
          const steps = Array.isArray(body?.steps) ? body.steps : []
          const latest = steps.length === 0 ? 'live' : steps[steps.length - 1].at
          setHistory({ steps, total: Number(body?.total ?? steps.length) })
          setSelection((current) => {
            if (selectLatest) return latest
            if (current === null) return latest
            if (current === 'live') return 'live'
            return steps.some((step) => step.at === current) ? current : latest
          })
          setPinned((current) => (current !== null && steps.some((step) => step.at === current) ? current : null))
        } catch (error) {
          if (historyTokenRef.current !== token) return
          setHistoryError(String(error?.message ?? error))
          setSelection((current) => current ?? 'live')
          setHistory((current) => current ?? { steps: [], total: 0 })
        } finally {
          if (historyTokenRef.current === token) setHistoryLoading(false)
        }
      }

      // Load the step list once, then default to the newest step.
      React.useEffect(() => {
        if (sessionId === undefined || sessionId === null) return undefined
        loadHistory()
        return undefined
      }, [sessionId])

      // Switching the viewed version invalidates loaded category payloads.
      React.useEffect(() => {
        setDetails({})
        setLoadingMore(false)
        requestRef.current = {}
        if (expanded !== null && sessionId !== undefined && sessionId !== null) load(expanded)
      }, [selection, revision])

      // Restoring an expanded category (new session or remount) loads it once.
      React.useEffect(() => {
        if (expanded === null || sessionId === undefined || sessionId === null) return
        if (details[expanded] === undefined && requestRef.current[expanded] === undefined) load(expanded)
      }, [expanded, sessionId])

      // Historical summary: counts + estimated breakdown at the selected cut.
      React.useEffect(() => {
        if (sessionId === undefined || sessionId === null || typeof selection !== 'number') {
          setSnapshot(null)
          return undefined
        }
        let live = true
        setSnapshot({ status: 'loading' })
        fetchJson(categoryUrl(sessionId, 'counts', selection))
          .then((body) => { if (live) setSnapshot({ status: 'ready', data: body }) })
          .catch((error) => { if (live) setSnapshot({ status: 'error', error: String(error?.message ?? error) }) })
        return () => { live = false }
      }, [sessionId, selection, revision])

      // Step diff against the previous step, or against a pinned step.
      React.useEffect(() => {
        if (sessionId === undefined || sessionId === null || typeof selection !== 'number') {
          setDiff(null)
          return undefined
        }
        let live = true
        setDiff({ status: 'loading' })
        const params = pinned === null ? {} : { from: pinned }
        fetchJson(categoryUrl(sessionId, 'diff', selection, params))
          .then((body) => { if (live) setDiff({ status: 'ready', data: body }) })
          .catch((error) => { if (live) setDiff({ status: 'error', error: String(error?.message ?? error) }) })
        return () => { live = false }
      }, [sessionId, selection, pinned, revision])

      React.useEffect(() => {
        setDiffMessage(null)
        setCopiedDiff(false)
      }, [selection, pinned])

      // The version popover dismisses on outside pointer or Escape.
      React.useEffect(() => {
        if (!historyOpen) return undefined
        const dismiss = (event) => {
          const root = historyRef.current
          if (root !== null && event.target instanceof Node && root.contains(event.target)) return
          setHistoryOpen(false)
          setHistoryQuery('')
          setHistoryActive(null)
        }
        const escape = (event) => {
          if (event.key !== 'Escape') return
          setHistoryOpen(false)
          setHistoryQuery('')
          setHistoryActive(null)
        }
        document.addEventListener('pointerdown', dismiss, true)
        document.addEventListener('keydown', escape)
        return () => {
          document.removeEventListener('pointerdown', dismiss, true)
          document.removeEventListener('keydown', escape)
        }
      }, [historyOpen])

      // Open at the selected step when it is visible in the current filter.
      React.useEffect(() => {
        if (!historyOpen) return
        const node = historyListRef.current
        if (node !== null) {
          const steps = history?.steps ?? []
          const needle = historyQuery.trim().toLowerCase()
          const filtered = needle === ''
            ? steps
            : steps.filter((step) => historyOptionLabel(t, step).toLowerCase().includes(needle))
          const index = filtered.findIndex((step) => step.at === selection)
          if (index === -1) {
            node.scrollTop = node.scrollHeight
          } else {
            let offset = 28
            let lastTurn = null
            for (let cursor = 0; cursor <= index; cursor += 1) {
              const turn = Number(filtered[cursor].turn ?? 0)
              if (turn !== lastTurn) {
                offset += 22
                lastTurn = turn
              }
              offset += 28
            }
            node.scrollTop = Math.max(0, offset - 4 * 28)
          }
          setHistoryScroll(node.scrollTop)
        }
        if (historySearchRef.current !== null) historySearchRef.current.focus()
      }, [historyOpen, historyQuery])

      // While following, poll the step list and move to a newly started step.
      React.useEffect(() => {
        if (sessionId === undefined || sessionId === null || !following) return undefined
        const timer = setInterval(() => { loadHistory(true) }, 6000)
        return () => clearInterval(timer)
      }, [sessionId, following])

      // Live counts fill the row counts before any category is expanded.
      React.useEffect(() => {
        if (sessionId === undefined || sessionId === null || typeof selection === 'number') return undefined
        let live = true
        fetchJson(categoryUrl(sessionId, 'counts'))
          .then((body) => { if (live) setCounts(body?.counts ?? {}) })
          .catch(() => {})
        return () => { live = false }
      }, [sessionId, selection])

      // Stable live categories refresh quietly after events settle.
      React.useEffect(() => {
        if (sessionId === undefined || sessionId === null || typeof selection === 'number') return undefined
        if (expanded === null || expanded === 'messages') return undefined
        if (details[expanded]?.status !== 'ready') return undefined
        const delay = expanded === 'skills' ? 15000 : 2500
        const timer = setTimeout(() => { load(expanded, { silent: true }) }, delay)
        return () => clearTimeout(timer)
      }, [sessionId, selection, expanded, detailed])

      // Live message lists follow new events, unless the user paged into older history.
      React.useEffect(() => {
        if (sessionId === undefined || sessionId === null || typeof selection === 'number') return undefined
        if (expanded !== 'messages' || loadingMore) return undefined
        const current = details.messages
        if (current?.status !== 'ready') return undefined
        if ((current.data?.messages?.length ?? 0) > 40) return undefined
        const timer = setTimeout(() => { load('messages', { silent: true }) }, 1200)
        return () => clearTimeout(timer)
      }, [sessionId, selection, expanded, detailed, loadingMore])

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

      const goLatest = async () => {
        if (sessionId === undefined || sessionId === null) return
        setFollowing(true)
        await loadHistory(true)
        setRevision((value) => value + 1)
      }

      const togglePin = () => {
        if (typeof selection !== 'number') return
        setPinned((current) => (current === selection ? null : selection))
      }

      const openDiffMessage = async (item) => {
        if (sessionId === undefined || sessionId === null || typeof selection !== 'number') return
        if (diffMessage?.key === item.id) {
          setDiffMessage(null)
          return
        }
        setDiffMessage({ key: item.id, status: 'loading' })
        try {
          const body = await fetchJson(categoryUrl(sessionId, 'message', selection, {
            from: diffData?.from ?? undefined,
            id: item.id,
          }))
          setDiffMessage({ key: item.id, status: 'ready', data: body })
        } catch (error) {
          setDiffMessage({ key: item.id, status: 'error', error: String(error?.message ?? error) })
        }
      }

      const exportSnapshot = async (format) => {
        if (sessionId === undefined || sessionId === null || exporting !== null) return
        setExporting(format)
        try {
          const at = typeof selection === 'number' ? selection : undefined
          const data = await fetchJson(categoryUrl(sessionId, 'export', at))
          const base = data.step ? `context-T${data.step.turn}-S${data.step.step}` : 'context-live'
          if (format === 'json') downloadText(`${base}.json`, JSON.stringify(data, null, 2), 'application/json')
          else downloadText(`${base}.md`, exportMarkdown(data, t), 'text/markdown')
        } catch {
          // The button is retryable; no destructive state to roll back.
        } finally {
          setExporting(null)
        }
      }

      const copyDiff = async () => {
        if (diff?.status !== 'ready') return
        try {
          await navigator.clipboard.writeText(diffMarkdown(diff.data, t))
          setCopiedDiff(true)
          setTimeout(() => setCopiedDiff(false), 1200)
        } catch {
          // Clipboard may be unavailable in a sandboxed webview.
        }
      }

      const exportDiff = () => {
        if (diff?.status !== 'ready') return
        const data = diff.data
        downloadText(
          `diff-T${data.fromTurn}-S${data.fromStep}-to-T${data.turn}-S${data.step}.md`,
          diffMarkdown(data, t),
          'text/markdown',
        )
      }

      const exportDiffJson = () => {
        if (diff?.status !== 'ready') return
        const data = diff.data
        downloadText(
          `diff-T${data.fromTurn}-S${data.fromStep}-to-T${data.turn}-S${data.step}.json`,
          JSON.stringify(data, null, 2),
          'application/json',
        )
      }

      if (attachment !== null) {
        return h(FilePreview, { attachment, sessionId, t, onBack: () => setAttachment(null) })
      }

      if (view === null) return null

      const rows = historicalReady
        ? categoryRows(view, details, snapshot.data.counts)
        : categoryRows(view, details).map((row) => {
            const count = row.count ?? loadedCategoryCount(row.key, details[row.key]) ?? counts[row.key]
            return count === row.count ? row : { ...row, count }
          })
      const usedText = translate(t, historicalReady ? 'historyUsed' : 'used', { percent: Math.round(view.usedPercent) })
      const steps = history?.steps ?? []
      const selectedStep = historical
        ? steps.find((step) => step.at === selection)
          ?? (snapshot?.status === 'ready' && snapshot.data?.at === selection
            ? {
              at: selection,
              turn: snapshot.data.turn,
              step: snapshot.data.step,
              promptTokens: snapshot.data.promptTokens,
            }
            : undefined)
        : undefined

      const toggle = (category) => {
        if (expanded === category) {
          setExpanded(null)
          return
        }
        setExpanded(category)
        if (details[category]?.status !== 'ready') load(category)
      }

      const historyNeedle = historyQuery.trim().toLowerCase()
      const historyFiltered = historyNeedle === ''
        ? steps
        : steps.filter((step) => historyOptionLabel(t, step).toLowerCase().includes(historyNeedle))
      const historyRows = [{ key: 'live', type: 'live', offset: 0, height: 28 }]
      let historyTotalHeight = 28
      for (const [turn, turnSteps] of groupHistorySteps(historyFiltered)) {
        historyRows.push({ key: `turn:${turn}`, type: 'group', turn, offset: historyTotalHeight, height: 22 })
        historyTotalHeight += 22
        for (const step of turnSteps) {
          historyRows.push({ key: `step:${step.at}`, type: 'step', step, offset: historyTotalHeight, height: 28 })
          historyTotalHeight += 28
        }
      }
      if (historyFiltered.length === 0) {
        historyRows.push({ key: 'empty', type: 'empty', offset: historyTotalHeight, height: 26 })
        historyTotalHeight += 26
      }
      const historyViewTop = Math.max(0, historyScroll - 6 * 28)
      const historyViewBottom = historyScroll + 280 + 6 * 28
      const historyVisibleRows = historyRows.filter((row) => row.offset + row.height >= historyViewTop && row.offset <= historyViewBottom)
      const selectHistory = (value) => {
        setSelection(value)
        setFollowing(value !== 'live' && value === steps[steps.length - 1]?.at)
        setHistoryOpen(false)
        setHistoryQuery('')
        setHistoryActive(null)
      }
      const historySelectable = ['live', ...historyFiltered.map((step) => step.at)]
      const scrollHistoryTo = (value) => {
        const row = historyRows.find((entry) => (value === 'live'
          ? entry.type === 'live'
          : entry.type === 'step' && entry.step.at === value))
        const node = historyListRef.current
        if (row === undefined || node === null) return
        const top = node.scrollTop
        const bottom = top + node.clientHeight
        if (row.offset < top) node.scrollTop = row.offset
        else if (row.offset + row.height > bottom) node.scrollTop = row.offset + row.height - node.clientHeight
      }
      const handleHistoryKeyDown = (event) => {
        const candidates = historyQuery.trim() === '' ? historySelectable : historySelectable.slice(1)
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault()
          if (candidates.length === 0) return
          const current = candidates.indexOf(historyActive)
          const start = current === -1
            ? (event.key === 'ArrowDown' ? -1 : candidates.length)
            : current
          const nextIndex = Math.max(0, Math.min(candidates.length - 1, start + (event.key === 'ArrowDown' ? 1 : -1)))
          const value = candidates[nextIndex]
          setHistoryActive(value)
          scrollHistoryTo(value)
          return
        }
        if (event.key === 'Home' || event.key === 'End') {
          event.preventDefault()
          if (candidates.length === 0) return
          const value = event.key === 'Home' ? candidates[0] : candidates[candidates.length - 1]
          setHistoryActive(value)
          scrollHistoryTo(value)
          return
        }
        if (event.key === 'Enter' && event.target?.tagName === 'INPUT') {
          const value = candidates.includes(historyActive) ? historyActive : candidates[0]
          if (value === undefined) return
          event.preventDefault()
          selectHistory(value)
        }
      }
      const historySelector = steps.length === 0 ? null : h('div', { className: 'dcb-hist', ref: historyRef },
        h('span', { className: 'dcb-hist-label' }, translate(t, 'historyLabel')),
        h('button', {
          type: 'button',
          className: 'dcb-hist-trigger',
          'aria-expanded': historyOpen,
          'aria-haspopup': 'dialog',
          title: history.total > steps.length
            ? translate(t, 'historyTotal', { total: history.total, shown: steps.length })
            : undefined,
          onClick: () => {
            if (historyOpen) {
              setHistoryQuery('')
              setHistoryActive(null)
            } else {
              setHistoryActive(selection === 'live' ? 'live' : selection)
            }
            setHistoryOpen(!historyOpen)
          },
        },
          selection === 'live'
            ? translate(t, 'historyLive')
            : selectedStep === undefined
              ? translate(t, 'historyLabel')
              : translate(t, 'historyStep', { turn: selectedStep.turn, step: selectedStep.step }),
          following ? h('span', { className: 'dcb-hist-follow' }, translate(t, 'followingLabel')) : null,
          h('span', { className: 'dcb-hist-caret', 'aria-hidden': true }, historyOpen ? '▴' : '▾')),
        historyOpen ? h('div', {
          className: 'dcb-hist-pop',
          role: 'dialog',
          'aria-label': translate(t, 'historyLabel'),
          onKeyDown: handleHistoryKeyDown,
        },
          h('input', {
            className: 'dcb-msg-input',
            type: 'search',
            ref: historySearchRef,
            value: historyQuery,
            placeholder: translate(t, 'searchHistory'),
            'aria-label': translate(t, 'searchHistory'),
            onChange: (event) => {
              setHistoryQuery(event.target.value)
              setHistoryActive(null)
            },
          }),
          h('div', {
            className: 'dcb-hist-list',
            role: 'listbox',
            'aria-label': translate(t, 'historyLabel'),
            ref: historyListRef,
            onScroll: (event) => setHistoryScroll(event.currentTarget.scrollTop),
          },
            h('div', { className: 'dcb-hist-virtual', style: { height: historyTotalHeight } },
              ...historyVisibleRows.map((row) => {
                const style = { position: 'absolute', left: 0, right: 0, top: row.offset, height: row.height }
                if (row.type === 'live') {
                  return h('div', { key: row.key, className: 'dcb-hist-row', style },
                    h('button', {
                      type: 'button',
                      role: 'option',
                      'aria-selected': selection === 'live',
                      className: `${selection === 'live' ? 'dcb-hist-option on' : 'dcb-hist-option'}${historyActive === 'live' ? ' active' : ''}`,
                      onClick: () => selectHistory('live'),
                    }, translate(t, 'historyLive')))
                }
                if (row.type === 'group') {
                  return h('div', { key: row.key, className: 'dcb-hist-row dcb-hist-row-group', style },
                    h('div', { className: 'dcb-hist-group-label' }, translate(t, 'historyTurn', { turn: row.turn })))
                }
                if (row.type === 'empty') {
                  return h('div', { key: row.key, className: 'dcb-hist-row dcb-hist-empty', style }, translate(t, 'noFilteredMessages'))
                }
                const step = row.step
                return h('div', { key: row.key, className: 'dcb-hist-row', style },
                  h('button', {
                    type: 'button',
                    role: 'option',
                    'aria-selected': selection === step.at,
                    className: `${selection === step.at ? 'dcb-hist-option on' : 'dcb-hist-option'}${historyActive === step.at ? ' active' : ''}`,
                    onClick: () => selectHistory(step.at),
                  },
                    h('span', null, historyOptionLabel(t, step)),
                    step.compacted === true
                      ? h('span', { className: 'dcb-hist-option-mark' }, translate(t, 'compactedShort'))
                      : null))
              }))),
          h('div', { className: 'dcb-hist-footer' },
            history.total > steps.length
              ? translate(t, 'historyTotal', { total: history.total, shown: steps.length })
              : translate(t, 'historyTotalShort', { total: history.total })))
          : null)

      const historyStatusRow = historyError !== null
        ? h('div', { className: 'dcb-hist-error-row' },
          h('div', { className: 'dcb-hist-error-main' }, translate(t, 'historyUnavailable', { error: historyError })),
          h('div', { className: 'dcb-hist-error-hint' }, translate(t, 'historyUnavailableHint')),
          h('button', { type: 'button', className: 'dcb-hist-action', onClick: () => loadHistory(steps.length === 0) }, translate(t, 'retry')))
        : historyLoading && steps.length === 0
          ? h('div', { className: 'dcb-hist-loading' }, translate(t, 'historyLoading'))
          : null

      const historyBanner = !historical ? null : h('div', { className: 'dcb-hist-banner' },
        h('span', { className: 'dcb-hist-badge' }, translate(t, 'historyBadge')),
        selectedStep === undefined
          ? h('span', null, translate(t, 'historyStepUnknown'))
          : h('span', null, translate(t, 'historyStep', { turn: selectedStep.turn, step: selectedStep.step })),
        selectedStep?.promptTokens !== undefined
          ? h('span', { className: 'dcb-hist-actual' }, translate(t, 'historyActual', { tokens: formatTokens(selectedStep.promptTokens) }))
          : null,
        selectedStep?.compacted === true
          ? h('span', { className: 'dcb-hist-compacted' }, translate(t, 'historyCompacted'))
          : null,
        snapshot?.status === 'loading' ? h('span', null, translate(t, 'historyLoading')) : null,
        snapshot?.status === 'error' ? h('span', { className: 'dcb-hist-error' }, translate(t, 'historyLoadFailed')) : null,
        h('button', { type: 'button', className: 'dcb-hist-latest', onClick: goLatest }, translate(t, 'historyLatest')))

      const pinnedStep = pinned === null ? undefined : steps.find((step) => step.at === pinned)
      const diffTitle = translate(t, pinned === null ? 'comparePrev' : 'comparePinned')
      const diffData = diff?.status === 'ready' ? diff.data : undefined
      // The host resolves the step before the newest compaction; a locally
      // derived target would drift back to the first compaction in the session.
      const jumpAt = diffData?.compactionBeforeAt
      const totalDelta = Number(diffData?.totalDelta ?? 0)
      const diffClass = totalDelta > 0 ? 'up' : totalDelta < 0 ? 'down' : 'flat'
      const diffSummary = diff?.status === 'loading'
        ? `${diffTitle} · ${translate(t, 'loading')}`
        : diff?.status === 'error'
          ? `${diffTitle} · ${translate(t, 'loadError')}`
          : diffData === undefined
            ? diffTitle
            : diffData.from === null
              ? `${diffTitle} · ${translate(t, 'diffNoPrevious')}`
              : diffTitle

      let diffBody = null
      if (diffData !== undefined && diffData.from !== null) {
        const parts = []
        const categoryChanges = diffData.categories.filter((item) => {
          const countChanged = item.fromCount !== undefined && item.toCount !== undefined && item.fromCount !== item.toCount
          return item.delta !== 0 || countChanged
        })
        parts.push(h('div', { className: 'dcb-diff-row' },
          h('span', { className: 'dcb-diff-name' },
            translate(t, 'diffTotal', { from: formatTokens(diffData.total?.from ?? 0), to: formatTokens(diffData.total?.to ?? 0) })),
          h('span', { className: `dcb-diff-delta ${diffClass}` }, `${signedTokens(totalDelta)} ${translate(t, 'tokensLabel')}`)))
        for (const item of categoryChanges) {
          parts.push(h('div', { className: 'dcb-diff-row' },
            h('span', { className: 'dcb-diff-name' }, translate(t, item.key)),
            h('span', { className: `dcb-diff-delta ${item.delta > 0 ? 'up' : item.delta < 0 ? 'down' : 'flat'}` }, signedTokens(item.delta)),
            item.fromCount === undefined || item.toCount === undefined || item.fromCount === item.toCount
              ? null
              : h('span', { className: 'dcb-diff-count' }, translate(t, 'diffCount', { from: item.fromCount, to: item.toCount }))))
        }
        const messageChanges = diffData.messages
        if (messageChanges !== undefined) {
          const addedCount = Number(messageChanges.addedCount ?? messageChanges.added?.length ?? 0)
          const removedCount = Number(messageChanges.removedCount ?? messageChanges.removed?.length ?? 0)
          const changedCount = Number(messageChanges.changedCount ?? messageChanges.changed?.length ?? 0)
          const totalCount = addedCount + removedCount + changedCount
          if (totalCount > 0) {
            parts.push(h('div', { className: 'dcb-diff-group' },
              h('span', { className: 'dcb-diff-label' }, translate(t, 'diffMessages')),
              addedCount === 0 ? null : h('span', { className: 'dcb-diff-tag add' }, `+${addedCount}`),
              removedCount === 0 ? null : h('span', { className: 'dcb-diff-tag remove' }, `-${removedCount}`),
              changedCount === 0 ? null : h('span', { className: 'dcb-diff-tag change' }, `~${changedCount}`)))
            let shown = 0
            const renderFieldDiff = (label, before, after) => {
              if (label === 'diffArguments') {
                const structural = jsonDiff(before, after)
                if (structural !== null) {
                  return h('div', { className: 'dcb-diff-field' },
                    h('div', { className: 'dcb-diff-field-label' }, translate(t, label)),
                    h('div', { className: 'dcb-json-diff' },
                      structural.changes.map((change, index) => h('div', {
                        key: index,
                        className: `dcb-json-row ${change.type}`,
                      },
                        h('span', { className: 'dcb-json-mark' }, change.type === 'added' ? '+' : change.type === 'removed' ? '-' : '~'),
                        h('span', { className: 'dcb-json-path' }, change.path),
                        h('span', { className: 'dcb-json-value' }, change.type === 'changed' ? `${change.from} → ${change.to}` : change.value))),
                      structural.total > structural.changes.length
                        ? h('div', { className: 'dcb-diff-more' }, translate(t, 'jsonMore', { count: structural.total - structural.changes.length }))
                        : null))
                }
              }
              const lines = lineDiff(before, after)
              return h('div', { className: 'dcb-diff-field' },
                h('div', { className: 'dcb-diff-field-label' }, translate(t, label)),
                h('pre', { className: 'dcb-diff-pre dcb-diff-pre-inline' },
                  ...lines.map((line, index) => h('span', {
                    key: index,
                    className: `dcb-diff-inline ${line.type}`,
                  },
                    line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ',
                    ' ',
                    line.segments === undefined
                      ? line.text
                      : line.segments.map((segment, segmentIndex) => h('span', {
                        key: segmentIndex,
                        className: `dcb-char ${segment.type}`,
                      }, segment.text))))))
            }
            const renderFullMessage = (detail) => {
              const previous = detail.previous
              const current = detail.message
              if (previous === null && current === null) {
                return h('div', { className: 'dcb-diff-detail' }, translate(t, 'diffNoContent'))
              }
              if (previous !== null && current !== null) {
                const label = current.role === 'tool' ? 'diffOutput' : 'diffText'
                const fields = [
                  [label, previous.text ?? '', current.text ?? ''],
                  ['diffReasoning', previous.reasoning ?? '', current.reasoning ?? ''],
                  ['diffArguments', previous.toolArguments ?? '', current.toolArguments ?? ''],
                ].filter(([, before, after]) => before !== after)
                return h('div', { className: 'dcb-diff-detail' },
                  h('div', { className: 'dcb-diff-variant' },
                    h('div', { className: 'dcb-diff-variant-head' },
                      h('span', null, `${translate(t, 'diffPrevious')} → ${translate(t, 'diffCurrent')}`),
                      h('span', null, `${translate(t, 'roles')[current.role] ?? current.role}${current.toolName === undefined ? '' : ` · ${current.toolName}`}`),
                      h('span', null, `${previous.tokens ?? 0} → ${current.tokens ?? 0} ${translate(t, 'tokensLabel')}`),
                      current.status === undefined ? null : h('span', null, current.status)),
                    fields.length === 0
                      ? h('div', { className: 'dcb-diff-empty' }, translate(t, 'diffNoContent'))
                      : fields.map(([fieldLabel, before, after]) => renderFieldDiff(fieldLabel, before, after)))
                )
              }
              const message = current ?? previous
              const label = current === null ? 'diffPrevious' : 'diffCurrent'
              const fields = []
              if (message.text) fields.push([message.role === 'tool' ? 'diffOutput' : 'diffText', message.text])
              if (message.reasoning) fields.push(['diffReasoning', message.reasoning])
              if (message.toolArguments) fields.push(['diffArguments', message.toolArguments])
              return h('div', { className: 'dcb-diff-detail' },
                h('div', { className: 'dcb-diff-variant' },
                  h('div', { className: 'dcb-diff-variant-head' },
                    h('span', null, translate(t, label)),
                    h('span', null, `${translate(t, 'roles')[message.role] ?? message.role}${message.toolName === undefined ? '' : ` · ${message.toolName}`}`),
                    h('span', null, `${message.tokens ?? 0} ${translate(t, 'tokensLabel')}`),
                    message.status === undefined ? null : h('span', null, message.status)),
                  fields.length === 0
                    ? h('div', { className: 'dcb-diff-empty' }, translate(t, 'diffNoContent'))
                    : fields.map(([fieldLabel, value]) => h('div', { key: fieldLabel, className: 'dcb-diff-field' },
                      h('div', { className: 'dcb-diff-field-label' }, translate(t, fieldLabel)),
                      h('pre', { className: 'dcb-diff-pre' }, value)))))
            }
            const append = (kind, items) => {
              for (const item of items.slice(0, 6)) {
                shown += 1
                const open = diffMessage?.key === item.id
                parts.push(h('button', {
                  key: `${kind}:${item.id}:${item.seq}`,
                  type: 'button',
                  className: `dcb-diff-msg ${kind}`,
                  title: item.preview ?? '',
                  'aria-expanded': open,
                  onClick: () => openDiffMessage(item),
                },
                  h('span', { className: 'dcb-diff-msg-sign' }, kind === 'added' ? '+' : kind === 'removed' ? '-' : '~'),
                  h('span', { className: 'dcb-diff-msg-role' },
                    `${translate(t, 'roles')[item.role] ?? item.role}${item.toolName === undefined ? '' : ` · ${item.toolName}`}`),
                  h('span', { className: 'dcb-diff-msg-preview' }, item.preview === undefined || item.preview === '' ? '—' : item.preview),
                  h('span', { className: 'dcb-diff-msg-open', 'aria-hidden': true }, open ? '▾' : '▸')))
                if (open) {
                  parts.push(diffMessage.status === 'loading'
                    ? h('div', { className: 'dcb-diff-detail dcb-diff-loading' }, translate(t, 'loading'))
                    : diffMessage.status === 'error'
                      ? h('div', { className: 'dcb-diff-detail dcb-error' }, translate(t, 'loadError'))
                      : renderFullMessage(diffMessage.data))
                }
              }
            }
            append('added', messageChanges.added ?? [])
            append('removed', messageChanges.removed ?? [])
            append('changed', messageChanges.changed ?? [])
            if (totalCount > shown) {
              parts.push(h('div', { className: 'dcb-diff-more' }, translate(t, 'diffMessageMore', { count: totalCount - shown })))
            }
          }
        }
        const changedTools = diffData.tools.changed ?? []
        if (diffData.tools.added.length > 0 || diffData.tools.removed.length > 0 || changedTools.length > 0) {
          parts.push(h('div', { className: 'dcb-diff-group' },
            h('span', { className: 'dcb-diff-label' }, translate(t, 'diffTools')),
            ...diffData.tools.added.map((name) => h('span', { key: `add:${name}`, className: 'dcb-diff-tag add' }, `+${name}`)),
            ...diffData.tools.removed.map((name) => h('span', { key: `remove:${name}`, className: 'dcb-diff-tag remove' }, `-${name}`)),
            ...changedTools.map((name) => h('span', { key: `change:${name}`, className: 'dcb-diff-tag change' }, `~${name}`))))
        }
        if (diffData.systemChanged) {
          const systemLines = lineDiff(diffData.systemBefore ?? '', diffData.systemAfter ?? '')
          parts.push(h('details', { className: 'dcb-diff-system' },
            h('summary', null, translate(t, 'diffSystemChanged')),
            h('pre', { className: 'dcb-diff-pre dcb-diff-pre-inline' },
              ...systemLines.map((line, index) => h('span', {
                key: index,
                className: `dcb-diff-inline ${line.type}`,
              }, `${line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '} ${line.text}`)))))
        }
        if (diffData.attachments.added.length > 0 || diffData.attachments.removed.length > 0) {
          parts.push(h('div', { className: 'dcb-diff-group' },
            h('span', { className: 'dcb-diff-label' }, translate(t, 'diffAttachments')),
            ...diffData.attachments.added.map((item) => h('span', { key: `add:${item.name}`, className: 'dcb-diff-tag add' }, `+${item.name}`)),
            ...diffData.attachments.removed.map((item) => h('span', { key: `remove:${item.name}`, className: 'dcb-diff-tag remove' }, `-${item.name}`))))
        }
        if (diffData.compactionBetween || jumpAt !== undefined) {
          parts.push(h('div', { className: 'dcb-diff-line' },
            h('span', null, translate(t, 'diffCompaction')),
            jumpAt === undefined
              ? null
              : h('button', { type: 'button', className: 'dcb-diff-jump', onClick: () => setSelection(jumpAt) }, translate(t, 'jumpBeforeCompaction'))))
        }
        if (totalDelta === 0
          && categoryChanges.length === 0
          && diffData.tools.added.length === 0
          && diffData.tools.removed.length === 0
          && (diffData.tools.changed ?? []).length === 0
          && diffData.attachments.added.length === 0
          && diffData.attachments.removed.length === 0
          && Number(diffData.messages?.addedCount ?? 0) === 0
          && Number(diffData.messages?.removedCount ?? 0) === 0
          && Number(diffData.messages?.changedCount ?? 0) === 0
          && diffData.systemChanged !== true
          && diffData.compactionBetween !== true
          && jumpAt === undefined) {
          parts.push(h('div', { className: 'dcb-diff-line' }, translate(t, 'diffNoChanges')))
        }
        parts.push(h('div', { className: 'dcb-diff-actions' },
          h('button', { type: 'button', className: 'dcb-diff-action', onClick: copyDiff }, copiedDiff ? translate(t, 'copied') : translate(t, 'copyDiff')),
          h('button', { type: 'button', className: 'dcb-diff-action', onClick: exportDiff }, translate(t, 'exportDiff')),
          h('button', { type: 'button', className: 'dcb-diff-action', onClick: exportDiffJson }, translate(t, 'exportDiffJson'))))
        diffBody = h('div', { className: 'dcb-diff-body' }, ...parts)
      }

      const historyActions = !historical ? null : h('div', { className: 'dcb-hist-actions' },
        h('button', { type: 'button', className: 'dcb-hist-action', onClick: togglePin },
          translate(t, pinned === selection ? 'unpinStep' : 'pinStep')),
        h('button', {
          type: 'button',
          className: 'dcb-hist-action',
          disabled: exporting !== null,
          onClick: () => exportSnapshot('json'),
        }, exporting === 'json' ? translate(t, 'exporting') : translate(t, 'exportJson')),
        h('button', {
          type: 'button',
          className: 'dcb-hist-action',
          disabled: exporting !== null,
          onClick: () => exportSnapshot('markdown'),
        }, exporting === 'markdown' ? translate(t, 'exporting') : translate(t, 'exportMarkdown')),
        jumpAt === undefined
          ? null
          : h('button', { type: 'button', className: 'dcb-hist-action', onClick: () => setSelection(jumpAt) }, translate(t, 'jumpBeforeCompaction')),
        pinnedStep === undefined || pinned === selection
          ? null
          : h('span', { className: 'dcb-hist-pin' }, `T${pinnedStep.turn} · S${pinnedStep.step}`))

      const diffPanel = !historical ? null : h('details', { className: 'dcb-diff' },
        h('summary', { className: 'dcb-diff-summary' },
          h('span', null, diffSummary),
          diffData === undefined || diffData.from === null
            ? null
            : h('span', { className: `dcb-diff-delta ${diffClass}` }, `${signedTokens(totalDelta)} ${translate(t, 'tokensLabel')}`)),
        diff?.status === 'error' ? h('div', { className: 'dcb-diff-body dcb-error' }, translate(t, 'historyLoadFailed')) : null,
        diffBody)

      const basis = view.basis === 'actual' ? 'actual' : 'projected'
      const estimate = translate(t, 'estimateApportioned', { total: formatTokens(view.used) })
      const basisHint = translate(t, basis === 'actual' ? 'basisHintActual' : 'basisHintProjected')
      const basisTag = historical
        ? h('span', { className: 'dcb-basis-tag' }, translate(t, 'basisActual'))
        : h('button', {
          type: 'button',
          className: 'dcb-basis-tag dcb-basis-toggle',
          title: translate(t, 'basisToggleHint'),
          onClick: () => setLiveBasis(basis === 'actual' ? 'projected' : 'actual'),
        }, translate(t, basis === 'actual' ? 'basisActual' : 'basisProjected'))

      return h('div', {
        className: 'dcb-side',
        ref: scrollRef,
        onScroll: (event) => {
          const node = event.currentTarget
          scrollTopRef.current = node.scrollTop
          if (scrollUserRef.current) {
            scrollTargetRef.current = node.scrollTop
            scrollRestoredRef.current = true
          }
        },
        onWheel: () => { scrollUserRef.current = true },
        onPointerDown: () => { scrollUserRef.current = true },
        onTouchStart: () => { scrollUserRef.current = true },
      },
        h('style', null, CSS),
        historyStatusRow,
        historySelector,
        historyBanner,
        historyActions,
        diffPanel,
        h('div', { className: 'dcb-usage' },
          h('div', { className: 'dcb-usage-row', title: basisHint },
            h('span', { className: 'dcb-used' }, usedText),
            h('span', { className: 'dcb-total' }, `${formatTokens(view.used)} / ${formatTokens(view.window)}`)),
          h(Track, { rows: view.trackRows ?? view.rows, t }),
          h('div', { className: 'dcb-usage-note' },
            h('span', null, translate(t, 'windowLabel', { tokens: formatTokens(view.window) })),
            h('span', null, translate(t, 'remaining', { tokens: formatTokens(Math.max(0, view.window - view.used)) }))),
          h('div', { className: 'dcb-usage-basis', title: basisHint },
            basisTag,
            h('span', { className: 'dcb-basis-note' }, estimate))),
        h('div', { className: 'dcb-cats' }, rows.map((row) => h('section', {
          key: row.key,
          className: expanded === row.key ? 'dcb-cat open' : 'dcb-cat',
        },
          h('button', {
            type: 'button',
            className: 'dcb-cat-head',
            'aria-expanded': expanded === row.key,
            title: row.rawTokens !== undefined && Math.round(row.rawTokens) !== Math.round(row.tokens)
              ? translate(t, 'apportionedHint', { raw: formatTokens(row.rawTokens), tokens: formatTokens(row.tokens) })
              : translate(t, 'estimateHint'),
            onClick: () => toggle(row.key),
          },
            h('i', { className: 'dcb-swatch', style: { '--dcb-color': row.color }, 'aria-hidden': true }),
            h('span', { className: 'dcb-cat-name' },
              translate(t, row.key),
              historicalReady && row.key === 'skills'
                ? h('span', { className: 'dcb-cat-current' }, translate(t, 'currentTag'))
                : null,
              row.count === undefined || COUNT_KEYS[row.key] === undefined
                ? null
                : h('span', { className: 'dcb-cat-count' }, translate(t, COUNT_KEYS[row.key], { count: row.count }))),
            h('span', { className: 'dcb-cat-tokens' }, row.tokens === undefined ? '—' : formatTokens(row.tokens)),
            h('span', { className: 'dcb-cat-pct', title: translate(t, 'estimateHint') }, row.percent === undefined ? '—' : formatPercent(row.percent)),
            h('span', { className: 'dcb-cat-chev', 'aria-hidden': true }, h(ChevronRight))),
          h('div', { className: 'dcb-cat-body' },
            expanded === row.key
              ? h('div', { className: 'dcb-cat-content' },
                historical
                  ? null
                  : h('div', { className: 'dcb-cat-refresh' },
                    h('button', { type: 'button', className: 'dcb-cat-refresh-btn', onClick: () => load(row.key) }, translate(t, 'refresh'))),
                h(CategoryContent, {
                  category: row.key,
                  detail: details[row.key],
                  t,
                  onRetry: () => { delete requestRef.current[row.key]; load(row.key) },
                  onOpenAttachment: (item) => setAttachment(item),
                  onLoadMore: row.key === 'messages' ? loadMoreMessages : undefined,
                  loadingMore,
                  sessionId,
                  onJumpToStep: (value) => setSelection(value),
                  onOpenCategory: (category) => setExpanded(category),
                }))
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
    function FilePreview({ attachment, sessionId, t, onBack }) {
      const [state, setState] = React.useState({ status: 'loading' })
      const attachmentId = String(attachment?.attachmentId ?? '')

      React.useEffect(() => {
        let live = true
        setState({ status: 'loading' })
        if (attachmentId === '') {
          setState({ status: 'error', error: 'bad-attachment-id' })
          return () => { live = false }
        }
        fetchJson(attachmentFileUrl(sessionId, attachmentId))
          .then((data) => { if (live) setState({ status: 'ready', data }) })
          .catch((error) => { if (live) setState({ status: 'error', error: String(error?.message ?? error) }) })
        return () => { live = false }
      }, [sessionId, attachmentId])

      const body = state.status === 'loading'
        ? h('div', { className: 'dcb-loading' }, translate(t, 'loading'))
        : state.status === 'error'
          ? h('div', { className: 'dcb-error' }, `${translate(t, 'loadError')}: ${errorText(t, state.error)}`)
          : (() => {
            const data = state.data ?? {}
            return h('div', null,
              h('div', { className: 'dcb-file-head' },
                h('div', { className: 'dcb-file-title' }, data.name ?? attachment?.name ?? ''),
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
      const [liveBasis, setLiveBasis] = useLiveBasis()
      const view = contextView(pressure, detailed, basic, liveBasis)
      if (view === null) return null

      const usedText = translate(t, 'used', { percent: Math.round(view.usedPercent) })
      const totalText = `${formatTokens(view.used)} / ${formatTokens(view.window)}`
      const ariaSummary = translate(t, 'ariaSummary', {
        percent: Math.round(view.usedPercent),
        used: formatTokens(view.used),
        total: formatTokens(view.window),
      })
      const basis = view.basis === 'actual' ? 'actual' : 'projected'
      const basisHint = translate(t, basis === 'actual' ? 'basisHintActual' : 'basisHintProjected')
      const panelNote = translate(t, 'panelApportioned', { total: formatTokens(view.used) })
      const toggleBasis = () => setLiveBasis(basis === 'actual' ? 'projected' : 'actual')
      const openCategory = (category) => {
        setOpen(false)
        requestCategory(category)
        openSidebarTab()
      }

      return h('div', { className: 'dcb-root', ref: rootRef },
        h('style', null, CSS),
        open && h('div', { className: 'dcb-panel', role: 'dialog', 'aria-label': translate(t, 'title') },
          h('div', { className: 'dcb-panel-head' },
            h('span', { className: 'dcb-panel-title' },
              translate(t, 'title'),
              h('button', { type: 'button', className: 'dcb-basis-tag dcb-basis-toggle', title: translate(t, 'basisToggleHint'), onClick: toggleBasis }, translate(t, basis === 'actual' ? 'basisActual' : 'basisProjected'))),
            h('button', { type: 'button', className: 'dcb-panel-close', onClick: () => setOpen(false), 'aria-label': translate(t, 'title') }, '×')),
          h('div', { className: 'dcb-panel-summary', title: basisHint },
            h('span', { className: 'dcb-used' }, usedText),
            h('span', null, totalText)),
          h(Track, { rows: view.trackRows ?? view.rows, t }),
          h('div', { className: 'dcb-panel-note' }, panelNote),
          h('div', { className: 'dcb-panel-cats' }, view.rows.map((row) => h('button', {
            key: row.key,
            type: 'button',
            className: 'dcb-panel-cat',
            title: row.rawTokens !== undefined && Math.round(row.rawTokens) !== Math.round(row.tokens)
              ? translate(t, 'apportionedHint', { raw: formatTokens(row.rawTokens), tokens: formatTokens(row.tokens) })
              : translate(t, 'estimateHint'),
            onClick: () => openCategory(row.key),
          },
            h('span', { className: 'dcb-swatch', style: { '--dcb-color': row.color }, 'aria-hidden': true }),
            h('span', { className: 'dcb-cat-name' }, translate(t, row.key)),
            h('span', { className: 'dcb-cat-tokens' }, formatTokens(row.tokens)),
            h('span', { className: 'dcb-cat-pct', title: translate(t, 'estimateHint') }, formatPercent(row.percent)),
            h('span', { className: 'dcb-cat-chev' }, h(ChevronRight))))),
          ),
        h('button', {
          ref: rowRef,
          type: 'button',
          className: 'dcb-row',
          onClick: () => setOpen(!open),
          'aria-expanded': open,
          'aria-label': `${translate(t, 'title')}。${translate(t, basis === 'actual' ? 'basisActual' : 'basisProjected')}。${ariaSummary}`,
          title: basisHint,
        },
          h(Track, { rows: view.trackRows ?? view.rows, t }),
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
      snapshotView,
      formatTokens,
      diffMarkdown,
      exportMarkdown,
      categoryRows,
      charDiff,
      jsonDiff,
      lineDiff,
      filterMessages,
      skillPackageGroup,
      attachmentFileUrl,
      shortAttachmentId,
      LOCALES,
    }
  },
})
