import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import vm from 'node:vm'
import test from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(join(root, 'client.js'), 'utf8')

function loadModule() {
  let definition
  const window = { __ModuleLoader__: { load(def) { definition = def } } }
  vm.runInNewContext(source, { window }, { filename: 'client.js' })
  const reactStub = {
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
    useState: (initial) => [initial, () => {}],
    useRef: (initial) => ({ current: initial }),
    useEffect: () => {},
    Component: class { constructor(props) { this.props = props } },
  }
  return definition.factory((id) => {
    assert.equal(id, 'react')
    return reactStub
  })
}

function render(mod, pressure, detailed, basic) {
  return mod.ContextBar({
    useProjection: (key) => {
      if (key === 'contextPressure') return pressure
      if (key === 'contextBreakdownDetailed') return detailed
      return basic
    },
  })
}

const DETAILED = {
  systemTokens: 9100,
  systemToolsTokens: 17200,
  systemToolsCount: 20,
  mcpToolsTokens: 10900,
  mcpToolsCount: 5,
  messageTokens: 187200,
  attachmentTokens: 41900,
}

test('hidden until occupancy and contextWindow are both known', () => {
  const mod = loadModule()
  assert.equal(render(mod, undefined, undefined, undefined), null)
  assert.equal(render(mod, { pressureTokens: 1000 }, undefined, undefined), null)
  assert.equal(render(mod, { contextWindow: 128000 }, undefined, undefined), null)
  assert.equal(render(mod, { pressureTokens: 1000, contextWindow: 0 }, undefined, undefined), null)
})

test('detailed categories are apportioned to the LLM actual total', () => {
  const mod = loadModule()
  const view = mod.contextView(
    { projectedTokens: 281000, pressureTokens: 250000, contextWindow: 1000000 },
    DETAILED,
    undefined,
  )
  assert.equal(view.used, 250000) // LLM actual (pressureTokens) wins
  assert.equal(Math.round(view.usedPercent), 25)
  const byKey = Object.fromEntries(view.rows.map((row) => [row.key, row]))
  assert.equal(byKey.messages.rawTokens, 187200)
  assert.equal(byKey.messages.tokens < byKey.messages.rawTokens, true)
  assert.equal(byKey.systemTools.count, 20)
  assert.equal(byKey.mcpTools.count, 5)
  assert.equal(byKey.system.count, undefined)
  assert.equal(view.rows.length, 5)
  assert.equal(view.rows.reduce((sum, row) => sum + row.tokens, 0), 250000)
  assert.equal(view.categorized, 250000)
  assert.equal(view.unaccounted, 0)
  assert.equal(view.over, 0)
  assert.equal(view.basis, 'actual')
  assert.equal(view.trackRows.length, 5)
})

test('live basis can switch between actual usage and the next-request projection', () => {
  const mod = loadModule()
  const actual = mod.contextView(
    { pressureTokens: 250000, projectedTokens: 281000, contextWindow: 1000000 },
    DETAILED,
    undefined,
  )
  assert.equal(actual.used, 250000)
  assert.equal(actual.basis, 'actual')
  assert.equal(actual.rows.reduce((sum, row) => sum + row.tokens, 0), 250000)
  const projected = mod.contextView(
    { pressureTokens: 250000, projectedTokens: 281000, contextWindow: 1000000 },
    DETAILED,
    undefined,
    'projected',
  )
  assert.equal(projected.used, 281000)
  assert.equal(projected.basis, 'projected')
  assert.equal(projected.rows.reduce((sum, row) => sum + row.tokens, 0), 281000)
  const fallback = mod.contextView(
    { projectedTokens: 281000, contextWindow: 1000000 },
    DETAILED,
    undefined,
    'actual',
  )
  assert.equal(fallback.used, 281000)
  assert.equal(fallback.basis, 'projected')
})

test('skills stay count-only so category rows still sum to the total', () => {
  const mod = loadModule()
  const view = mod.contextView(
    { pressureTokens: 250000, contextWindow: 1000000 },
    DETAILED,
    undefined,
  )
  const rows = mod.categoryRows(view, { skills: { status: 'ready', data: { skills: [{ tokens: 999 }] } } }, { skills: 1 })
  const skills = rows.find((row) => row.key === 'skills')
  assert.equal(skills.tokens, undefined)
  assert.equal(skills.count, 1)
  assert.equal(rows.reduce((sum, row) => sum + (row.tokens ?? 0), 0), 250000)
})

test('falls back to the token-meter 3-bucket projection', () => {
  const mod = loadModule()
  const view = mod.contextView(
    { pressureTokens: 120000, contextWindow: 1000000 },
    undefined,
    { systemTokens: 9100, toolsTokens: 17200, messageTokens: 187200 },
  )
  const keys = view.rows.map((row) => row.key)
  assert.equal(JSON.stringify(keys), JSON.stringify(['messages', 'systemTools', 'system']))
  assert.equal(view.rows.reduce((sum, row) => sum + row.tokens, 0), 120000)
  assert.equal(view.rows.find((row) => row.key === 'systemTools').count, undefined)
})

test('tool counts stay hidden when the host view predates them', () => {
  const mod = loadModule()
  const { systemToolsCount: _systemCount, mcpToolsCount: _mcpCount, ...legacy } = DETAILED
  const view = mod.contextView(
    { pressureTokens: 281000, contextWindow: 1000000 },
    legacy,
    undefined,
  )
  assert.equal(view.rows.find((row) => row.key === 'systemTools').count, undefined)
  assert.equal(view.rows.find((row) => row.key === 'mcpTools').count, undefined)
})

test('usage over the window clamps at 100%', () => {
  const mod = loadModule()
  const view = mod.contextView(
    { pressureTokens: 300000, contextWindow: 128000 },
    DETAILED,
    undefined,
  )
  assert.equal(view.usedPercent, 100)
})

test('renders collapsed bar row with aria summary and five segments', () => {
  const mod = loadModule()
  const tree = render(
    mod,
    { pressureTokens: 281000, contextWindow: 1000000 },
    DETAILED,
    undefined,
  )
  assert.equal(tree.props.className, 'dcb-root')
  const row = tree.children.find((child) => child?.props?.className === 'dcb-row')
  assert.ok(row)
  assert.match(row.props['aria-label'], /28%/)
  const track = row.children.find((child) => Array.isArray(child?.props?.rows))
  assert.ok(track, 'collapsed row embeds the segmented track')
  assert.equal(track.props.rows.length, 5)
})

test('zero-token categories are omitted from legend and bar', () => {
  const mod = loadModule()
  const view = mod.contextView(
    { pressureTokens: 20000, contextWindow: 1000000 },
    { ...DETAILED, mcpToolsTokens: 0 },
    undefined,
  )
  assert.equal(view.rows.some((row) => row.key === 'mcpTools'), false)
  assert.ok(view.rows.every((row) => row.tokens > 0))
})

test('missing breakdown renders no zero-value rows', () => {
  const mod = loadModule()
  const view = mod.contextView({ pressureTokens: 5000, contextWindow: 200000 }, undefined)
  assert.equal(view.rows.length, 0)
})

test('token formatting matches Claude Code style', () => {
  const mod = loadModule()
  assert.equal(mod.formatTokens(512), '512')
  assert.equal(mod.formatTokens(26200), '26.2k')
  assert.equal(mod.formatTokens(120000), '120k')
  assert.equal(mod.formatTokens(1000000), '1M')
})

test('attachment preview url carries the stable attachment id', () => {
  const mod = loadModule()
  const id = `sha256:${'ab'.repeat(32)}`
  assert.equal(
    mod.attachmentFileUrl('s 1', id),
    `/api/context-bar.file?sessionId=s%201&attachmentId=${encodeURIComponent(id)}`,
  )
})

test('shortAttachmentId renders a digest and refuses path-like ids', () => {
  const mod = loadModule()
  assert.equal(mod.shortAttachmentId({ attachmentId: `sha256:${'ab'.repeat(32)}` }), 'sha256:abababababab…')
  assert.equal(mod.shortAttachmentId({ attachmentId: '/etc/passwd' }), '')
  assert.equal(mod.shortAttachmentId({ attachmentId: '../../secret' }), '')
  assert.equal(mod.shortAttachmentId({}), '')
})

test('historical snapshots mirror the live row shape with actual prompt usage', () => {
  const mod = loadModule()
  const snapshot = {
    window: 1000,
    promptTokens: 420,
    breakdown: {
      systemTokens: 100,
      systemToolsTokens: 50,
      systemToolsCount: 3,
      mcpToolsTokens: 0,
      mcpToolsCount: 0,
      messageTokens: 300,
      attachmentTokens: 0,
    },
    counts: { messages: 4, attachments: 0, systemTools: 3, mcpTools: 0 },
  }
  const view = mod.snapshotView(snapshot, undefined)
  assert.equal(view.used, 420)
  assert.equal(view.window, 1000)
  assert.equal(view.usedPercent, 42)
  const rows = Object.fromEntries(view.rows.map((row) => [row.key, row]))
  assert.equal(rows.messages.rawTokens, 300)
  assert.equal(rows.messages.count, 4)
  assert.equal(rows.systemTools.count, 3)
  assert.equal(rows.mcpTools, undefined)
  assert.equal(view.rows.reduce((sum, row) => sum + row.tokens, 0), 420)
  assert.equal(view.basis, 'actual')
  assert.equal(view.categorized, 420)
  assert.equal(view.unaccounted, 0)
  assert.equal(view.over, 0)
  assert.equal(view.trackRows.length, 3)

  const estimate = mod.snapshotView({ ...snapshot, promptTokens: undefined }, undefined)
  assert.equal(estimate.used, 450)
  assert.equal(estimate.categorized, 450)
  assert.equal(estimate.unaccounted, 0)
  assert.equal(estimate.over, 0)
})

test('line diff keeps common lines and marks edits', () => {
  const mod = loadModule()
  assert.equal(JSON.stringify(mod.lineDiff('a\nb\nc', 'a\nx\nc').map((line) => `${line.type}:${line.text}`)), JSON.stringify(['same:a', 'remove:b', 'add:x', 'same:c']))
  assert.equal(JSON.stringify(mod.lineDiff('one\ntwo', 'one\ntwo').map((line) => line.type)), JSON.stringify(['same', 'same']))
  assert.equal(JSON.stringify(mod.lineDiff('', 'new').map((line) => `${line.type}:${line.text}`)), JSON.stringify(['add:new']))
})

test('char diff highlights changed characters inside a paired line', () => {
  const mod = loadModule()
  const chars = mod.charDiff('color: red', 'color: xyz')
  assert.equal(JSON.stringify(chars.map((segment) => `${segment.type}:${segment.text}`)), JSON.stringify([
    'same:color: ', 'remove:red', 'add:xyz',
  ]))
  const lines = mod.lineDiff('color: red', 'color: xyz')
  const removed = lines.find((line) => line.type === 'remove')
  const added = lines.find((line) => line.type === 'add')
  assert.equal(JSON.stringify(removed.segments.map((segment) => `${segment.type}:${segment.text}`)), JSON.stringify([
    'same:color: ', 'remove:red',
  ]))
  assert.equal(JSON.stringify(added.segments.map((segment) => `${segment.type}:${segment.text}`)), JSON.stringify([
    'same:color: ', 'add:xyz',
  ]))
})

test('json diff reports changed, added, and removed leaves', () => {
  const mod = loadModule()
  const diff = mod.jsonDiff('{"a":1,"b":2}', '{"a":1,"b":3,"c":4}')
  assert.equal(diff.total, 2)
  assert.equal(JSON.stringify(diff.changes.map((change) => `${change.type}:${change.path}`)), JSON.stringify([
    'changed:b', 'added:c',
  ]))
  assert.equal(diff.changes[0].from, '2')
  assert.equal(diff.changes[0].to, '3')
  assert.equal(mod.jsonDiff('not json', '{}'), null)
  const nested = mod.jsonDiff('{"a":[1,2]}', '{"a":[1,3,4]}')
  assert.equal(JSON.stringify(nested.changes.map((change) => `${change.type}:${change.path}`)), JSON.stringify([
    'changed:a[1]', 'added:a[2]',
  ]))
})

test('diff markdown carries categories, tools, system, and messages', () => {
  const mod = loadModule()
  const md = mod.diffMarkdown({
    fromTurn: 1,
    fromStep: 1,
    turn: 1,
    step: 2,
    total: { from: 100, to: 150 },
    totalDelta: 50,
    categories: [
      { key: 'messages', from: 60, to: 100, delta: 40, fromCount: 1, toCount: 2 },
      { key: 'system', from: 40, to: 50, delta: 10 },
    ],
    tools: { added: ['beta'], removed: ['gamma'], changed: ['alpha'] },
    attachments: { added: [{ name: 'a.md' }], removed: [] },
    messages: { addedCount: 1, removedCount: 0, changedCount: 0, added: [{ role: 'assistant', preview: 'ok' }], removed: [], changed: [] },
    systemChanged: true,
    systemBefore: 'old line',
    systemAfter: 'new line',
    compactionBetween: false,
  }, undefined)
  assert.match(md, /# 上下文 diff · T1·S1 → T1·S2/)
  assert.match(md, /\+50 tokens/)
  assert.match(md, /\| 对话消息 \(1 → 2\) \| 60 \| 100 \| \+40 \|/)
  assert.match(md, /- \+beta/)
  assert.match(md, /- -gamma/)
  assert.match(md, /- ~alpha/)
  assert.match(md, /- old line/)
  assert.match(md, /\+ new line/)
  assert.match(md, /\+ \[assistant\]: ok/)
})

test('markdown export carries the snapshot sections', () => {
  const mod = loadModule()
  const md = mod.exportMarkdown({
    step: { turn: 1, step: 2, promptTokens: 100 },
    window: 1000,
    exportedAt: '2026-11-01T00:00:00.000Z',
    breakdown: { messageTokens: 20, attachmentTokens: 0, systemToolsTokens: 10, mcpToolsTokens: 0, systemTokens: 5 },
    counts: { messages: 2, attachments: 0, systemTools: 1, mcpTools: 0 },
    system: 'system prompt',
    tools: { system: [{ name: 'bash', description: 'run' }], mcp: [] },
    messages: [{ role: 'assistant', text: 'hello', reasoning: 'think', tokens: 3 }],
    attachments: [],
    skills: null,
  }, undefined)
  assert.match(md, /# 上下文快照/)
  assert.match(md, /\| 系统提示 \| 5 \|/)
  assert.match(md, /\*\*bash\*\* — run/)
  assert.match(md, /### \[assistant\]/)
  assert.match(md, /技能目录为导出时的当前状态/)
})

test('message role filter hides only the three conversation roles', () => {
  const mod = loadModule()
  const messages = [
    { role: 'user' }, { role: 'assistant' }, { role: 'tool' }, { role: 'system' },
  ]
  const roles = (visible) => mod.filterMessages(messages, visible).map((message) => message.role)
  assert.deepEqual(roles(new Set(['user', 'assistant', 'tool'])), ['user', 'assistant', 'tool', 'system'])
  assert.deepEqual(roles(new Set(['user'])), ['user', 'system'])
  assert.deepEqual(roles(new Set(['assistant', 'tool'])), ['assistant', 'tool', 'system'])
  assert.deepEqual(roles(new Set()), ['system'])
})

test('skills group by their providing package, filesystem skills by scope', () => {
  const mod = loadModule()
  // A provider that ships several skills stays one package.
  assert.equal(mod.skillPackageGroup({ provider: 'dsh-office', source: 'bundled' }), 'pkg:dsh-office')
  assert.equal(mod.skillPackageGroup({ provider: 'dsh-badge', source: 'bundled' }), 'pkg:dsh-badge')
  // Filesystem-discovered skills fall back to their scope.
  assert.equal(mod.skillPackageGroup({ provider: 'filesystem', source: 'custom' }), 'scope:custom')
  assert.equal(mod.skillPackageGroup({ provider: 'filesystem', source: 'user-dsh' }), 'scope:user')
  assert.equal(mod.skillPackageGroup({ provider: 'filesystem', source: 'user-agents' }), 'scope:user')
  assert.equal(mod.skillPackageGroup({ provider: 'filesystem', source: 'project-dsh' }), 'scope:project')
  assert.equal(mod.skillPackageGroup({ provider: 'filesystem', source: 'project-agents' }), 'scope:project')
  assert.equal(mod.skillPackageGroup({ provider: 'filesystem', source: 'bundled' }), 'scope:bundled')
  assert.equal(mod.skillPackageGroup({ provider: 'filesystem', source: '' }), 'scope:other')
  assert.equal(mod.skillPackageGroup({ provider: '', source: '' }), 'scope:other')
  assert.equal(mod.skillPackageGroup(undefined), 'scope:other')
})

test('zh and en locale key sets match', () => {
  const mod = loadModule()
  assert.deepEqual(Object.keys(mod.LOCALES.zh).sort(), Object.keys(mod.LOCALES.en).sort())
  assert.deepEqual(Object.keys(mod.LOCALES.zh.roles).sort(), Object.keys(mod.LOCALES.en.roles).sort())
})
