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
  mcpToolsTokens: 10900,
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

test('detailed categories are raw shares of the full model window', () => {
  const mod = loadModule()
  const view = mod.contextView(
    { projectedTokens: 281000, pressureTokens: 250000, contextWindow: 1000000 },
    DETAILED,
    undefined,
  )
  assert.equal(view.used, 281000) // projectedTokens wins over pressureTokens
  assert.equal(Math.round(view.usedPercent), 28)
  const byKey = Object.fromEntries(view.rows.map((row) => [row.key, row]))
  assert.equal(byKey.messages.percent.toFixed(1), '18.7')
  assert.equal(byKey.attachments.percent.toFixed(1), '4.2')
  assert.equal(byKey.systemTools.percent.toFixed(1), '1.7')
  assert.equal(byKey.mcpTools.percent.toFixed(1), '1.1')
  assert.equal(byKey.system.percent.toFixed(1), '0.9')
  assert.equal(view.rows.length, 5)
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
  assert.equal(view.rows.find((row) => row.key === 'systemTools').tokens, 17200)
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
