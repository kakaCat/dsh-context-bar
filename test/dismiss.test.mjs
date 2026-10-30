/**
 * The inline panel collapses when the pointer lands anywhere outside it, and
 * Escape collapses it while returning focus to the bar.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import vm from 'node:vm'
import test from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(join(root, 'client.js'), 'utf8')

class FakeNode {}

/**
 * Load the plugin with an interactive React stub: one render with the panel
 * open, the collected effects, and a document that records its listeners.
 */
function loadOpen() {
  let definition
  const window = { __ModuleLoader__: { load(def) { definition = def } } }
  const listeners = new Map()
  const document = {
    addEventListener(type, fn) {
      const entries = listeners.get(type) ?? []
      entries.push(fn)
      listeners.set(type, entries)
    },
    removeEventListener(type, fn) {
      listeners.set(type, (listeners.get(type) ?? []).filter(entry => entry !== fn))
    },
  }
  const calls = []
  const focused = []
  const inside = new FakeNode()
  const outside = new FakeNode()
  const barNode = {
    contains: (target) => target === inside,
    focus: () => { focused.push('bar') },
  }
  const effects = []
  const reactStub = {
    createElement(type, props, ...children) {
      if (props !== null && props !== undefined && props.ref !== null && props.ref !== undefined) props.ref.current = barNode
      return { type, props: props ?? {}, children }
    },
    useState: () => [true, (...args) => { calls.push(args) }],
    useRef: (initial) => ({ current: initial }),
    useEffect: (callback) => { effects.push(callback) },
    Component: class { constructor(props) { this.props = props } },
  }
  vm.runInNewContext(source, { window, document, Node: FakeNode }, { filename: 'client.js' })
  const mod = definition.factory((id) => {
    assert.equal(id, 'react')
    return reactStub
  })
  return { mod, listeners, effects, calls, focused, inside, outside }
}

const PROJECTIONS = {
  contextPressure: { projectedTokens: 281000, contextWindow: 1000000 },
  contextBreakdownDetailed: undefined,
  contextBreakdown: undefined,
}

function render(mod) {
  return mod.ContextBar({
    useProjection: (key) => PROJECTIONS[key],
    t: (key) => key,
  })
}

test('a pointer press outside the panel collapses it; one inside does not', () => {
  const { mod, listeners, effects, calls, inside, outside } = loadOpen()
  render(mod)
  assert.equal(effects.length, 1)
  effects[0]()
  const dismiss = (listeners.get('pointerdown') ?? [])[0]
  assert.equal(typeof dismiss, 'function')
  dismiss({ target: outside })
  assert.deepEqual(calls, [[false]])
  dismiss({ target: inside })
  assert.deepEqual(calls, [[false]])
})

test('Escape collapses the panel and returns focus to the bar, and the listeners are removed', () => {
  const { mod, listeners, effects, calls, focused } = loadOpen()
  render(mod)
  const cleanup = effects[0]()
  const escape = (listeners.get('keydown') ?? [])[0]
  assert.equal(typeof escape, 'function')
  escape({ key: 'Enter' })
  assert.deepEqual(calls, [])
  escape({ key: 'Escape' })
  assert.deepEqual(calls, [[false]])
  assert.deepEqual(focused, ['bar'])
  cleanup()
  assert.equal((listeners.get('pointerdown') ?? []).length, 0)
  assert.equal((listeners.get('keydown') ?? []).length, 0)
})
