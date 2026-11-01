/**
 * Host projection fold: categories, tool split, attachments, compaction.
 * Run with `node --test`.
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { contextBreakdownDetailedProjection as def } from '../index.js'

function stateWith(events) {
  let state = def.init()
  for (const event of events) state = def.apply(state, event)
  return state
}

const system = (seq, text) => ({
  type: 'system/message',
  seq,
  surfaceOp: 'append',
  data: { turn: 0, step: 0, message: { role: 'system', content: [{ type: 'text', text }] } },
})

const user = (seq, content) => ({
  type: 'user/message',
  seq,
  surfaceOp: 'append',
  data: { role: 'user', content },
})

const header = (seq, tools) => ({
  type: 'request/header',
  seq,
  data: { header: { tools } },
})

test('splits tool schemas into system and MCP buckets', () => {
  const state = stateWith([
    header(1, [
      { type: 'function', function: { name: 'read_file', description: 'Read a file' } },
      { type: 'function', function: { name: 'mcp__github__search', description: 'Search GitHub' } },
    ]),
  ])
  const view = def.wire.view(state)
  assert.ok(view.systemToolsTokens > 0)
  assert.ok(view.mcpToolsTokens > 0)
  assert.equal(view.systemToolsCount, 1)
  assert.equal(view.mcpToolsCount, 1)
  assert.equal(view.messageTokens, 0)
})

test('classifies system prompt, message text and file attachments', () => {
  const state = stateWith([
    system(1, 'You are a helpful assistant.'),
    user(2, [{ type: 'text', text: 'please inspect this document carefully' }]),
    user(3, [{ type: 'file', attachment: { path: '/tmp/report.md', mimeType: 'text/markdown' } }]),
  ])
  const view = def.wire.view(state)
  assert.ok(view.systemTokens > 0)
  assert.ok(view.messageTokens > 0)
  assert.ok(view.attachmentTokens > 0)
  // messageTokens excludes the system prompt and the attachment price.
  assert.equal(view.messageTokens, Math.max(0, state.surfaceTokens - view.systemTokens - view.attachmentTokens))
})

test('compaction claim removes shadowed attachment nodes and prices the replacement', () => {
  const file = { type: 'file', attachment: { path: '/tmp/a.md', mimeType: 'text/markdown' } }
  const before = stateWith([user(1, [file]), user(2, [{ type: 'text', text: 'older turn' }])])
  const shadowedTokenCount = before.surfaceTokens
  const compacted = def.apply(before, {
    type: 'compaction/summary',
    seq: 3,
    data: { shadowedSeqs: [1, 2], shadowedRange: { start: 1, end: 2 }, shadowedTokenCount },
  })
  const replacement = def.apply(compacted, {
    type: 'assistant/message',
    seq: 4,
    surfaceOp: { op: 'replace', startSeq: 1, endSeq: 2 },
    data: { message: { role: 'assistant', content: [{ type: 'text', text: 'summary of the older turns' }] } },
  })
  const view = def.wire.view(replacement)
  assert.equal(view.attachmentTokens, 0)
  assert.ok(view.messageTokens > 0)
  assert.deepEqual(replacement.attachments, [])
})

test('keeps the last non-empty system prompt as system tokens', () => {
  const state = stateWith([system(1, 'first prompt'), system(2, 'second prompt that replaces order')])
  const view = def.wire.view(state)
  assert.ok(view.systemTokens > 0)
  assert.ok(view.systemTokens < state.surfaceTokens)
})

test('wire view is a plain JSON object', () => {
  const state = stateWith([
    header(1, [{ type: 'function', function: { name: 'shell', description: 'Run commands' } }]),
    system(2, 'prompt'),
    user(3, [{ type: 'text', text: 'hi' }]),
  ])
  const view = def.wire.view(state)
  assert.deepEqual(Object.keys(view).sort(), [
    'attachmentTokens', 'mcpToolsCount', 'mcpToolsTokens', 'messageTokens',
    'systemTokens', 'systemToolsCount', 'systemToolsTokens',
  ])
  for (const value of Object.values(view)) assert.equal(typeof value, 'number')
})

const validState = () => ({
  systems: [{ seq: 1, tokens: 10 }],
  attachments: [{ seq: 2, tokens: 4 }],
  surfaceTokens: 14,
  breakdown: {
    systemTokens: 10,
    systemToolsTokens: 0,
    mcpToolsTokens: 0,
    systemToolsCount: 0,
    mcpToolsCount: 0,
    messageTokens: 4,
    attachmentTokens: 4,
  },
})

test('state parser accepts a valid state and an armed claim', () => {
  const parse = def.stateSchema.parse
  assert.deepEqual(parse(validState()), validState())
  const claimed = {
    ...validState(),
    claim: { start: 1, end: 2, tokens: 14, systemSeqs: [1], seqs: [1, 2] },
  }
  assert.deepEqual(parse(claimed), claimed)
})

test('state parser rejects malformed claims and negative counters', () => {
  const parse = def.stateSchema.parse
  assert.throws(() => parse({ ...validState(), claim: {} }))
  assert.throws(() => parse({ ...validState(), claim: { start: -1, end: 2, tokens: 3, systemSeqs: [], seqs: [] } }))
  assert.throws(() => parse({ ...validState(), claim: { start: 1, end: 2, tokens: 3, systemSeqs: ['x'], seqs: [] } }))
  assert.throws(() => parse({ ...validState(), surfaceTokens: -1 }))
  assert.throws(() => parse({ ...validState(), breakdown: { ...validState().breakdown, messageTokens: -1 } }))
  assert.throws(() => parse({ ...validState(), breakdown: { ...validState().breakdown, systemToolsCount: -1 } }))
})
