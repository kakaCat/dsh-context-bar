/**
 * Host routes: `/api/context-bar.ui` and `/api/context-bar.file`.
 * These exercise the real `apply()` wiring with a fake Cordis context, so the
 * route table, lookups, bounds and error codes are covered end to end.
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { apply, skillsContent, historySteps, foldDetailedUntil } from '../index.js'

const MAX_PREVIEW_BYTES = 12 * 1024 * 1024
const ID = (seed) => `sha256:${String(seed).padStart(2, '0').repeat(32)}`

function sessionOf(events, header = { cwd: '/workspace' }) {
  return { snapshotEvents: () => events, header }
}

/** Apply the Host half against a fake Cordis context and capture registered routes. */
function harness({ sessions = new Map(), skills, attachments } = {}) {
  const routes = new Map()
  apply({
    sessionProjections: { register() {} },
    get(name) {
      if (name === 'sessions') return { get: (id) => sessions.get(id) }
      if (name === 'skills') return skills
      if (name === 'attachments') return attachments
      return undefined
    },
    inject(_services, callback) {
      callback({
        connection: {
          fetch: {
            register(route) {
              routes.set(route.path, route)
              return () => {}
            },
          },
        },
        effect(fn) { return fn() },
      })
    },
  })
  assert.ok(routes.has('/api/context-bar.ui'))
  assert.ok(routes.has('/api/context-bar.file'))
  return routes
}

const request = (path, sessionId, params) => {
  const query = new URLSearchParams({ sessionId, ...params })
  return new Request(`http://dsh.local${path}?${query}`)
}

const json = async (response) => ({ status: response.status, body: await response.json() })

const systemEvent = (text) => ({
  type: 'system/message',
  seq: 1,
  data: { message: { role: 'system', content: [{ type: 'text', text }] } },
})

const imageEvent = (attachmentId, seq = 1) => ({
  type: 'user/message',
  seq,
  data: {
    role: 'user',
    content: [{
      type: 'image',
      attachment: { attachmentId, mediaType: 'image/png', bytes: 4, width: 2, height: 2, name: 'shot.png' },
    }],
  },
})

const fileEvent = (attachment, seq = 1) => ({
  type: 'user/message',
  seq,
  data: { role: 'user', content: [{ type: 'file', attachment }] },
})

const fileSurfaceEvent = (attachment, seq = 1) => ({
  type: 'user/message',
  seq,
  surfaceOp: 'append',
  data: { role: 'user', content: [{ type: 'file', attachment }] },
})

const textStream = (...parts) => ({
  async *readFileStream() {
    for (const part of parts) yield Buffer.from(part)
  },
})

const stepStart = (seq, turn, step) => ({
  type: 'step/start',
  seq,
  time: seq * 10,
  data: { turn, step },
})

const requestContextAt = (seq, contextWindow) => ({
  type: 'request/context',
  seq,
  data: { provider: 'mock', model: 'mock', contextWindow },
})

const requestHeaderAt = (seq, names) => ({
  type: 'request/header',
  seq,
  data: { header: { tools: names.map((name) => ({ type: 'function', function: { name, description: 'd' } })) } },
})

const systemAt = (seq, text) => ({
  type: 'system/message',
  seq,
  data: { message: { role: 'system', content: [{ type: 'text', text }] } },
})

const headerToolsAt = (seq, tools) => ({
  type: 'request/header',
  seq,
  data: { header: { tools } },
})

const userText = (seq, text) => ({
  type: 'user/message',
  seq,
  surfaceOp: 'append',
  data: { role: 'user', content: [{ type: 'text', text }] },
})

const assistantReply = (seq, inputTokens) => ({
  type: 'assistant/message',
  seq,
  surfaceOp: 'append',
  data: {
    message: { role: 'assistant', content: [{ type: 'text', text: 'ok' }] },
    ...(inputTokens === undefined ? {} : { usage: { inputTokens } }),
  },
})

// ---------------------------------------------------------------- context route

test('context route serves the latest system prompt and rejects bad input', async () => {
  const sessions = new Map([['s1', sessionOf([systemEvent('be helpful')])]])
  const routes = harness({ sessions })
  const route = routes.get('/api/context-bar.ui')

  const ok = await json(await route.fetch(request(route.path, 's1', { category: 'system' })))
  assert.equal(ok.status, 200)
  assert.equal(ok.body.kind, 'text')
  assert.equal(ok.body.text, 'be helpful')

  assert.equal((await json(await route.fetch(request(route.path, '', { category: 'system' })))).status, 400)
  assert.equal((await json(await route.fetch(request(route.path, 's1', { category: 'nope' })))).status, 400)
  assert.equal((await json(await route.fetch(request(route.path, 'missing', { category: 'system' })))).status, 404)
})

test('context route never echoes internal error text', async () => {
  const sessions = new Map([['s1', { snapshotEvents() { throw new Error('boom at /Users/secret/path') } }]])
  const routes = harness({ sessions })
  const { status, body } = await json(await routes.get('/api/context-bar.ui')
    .fetch(request('/api/context-bar.ui', 's1', { category: 'system' })))
  assert.equal(status, 500)
  assert.equal(body.error, 'context-read-failed')
  assert.equal(JSON.stringify(body).includes('/Users/secret'), false)
})

test('context route exposes attachments with display-window indexes', async () => {
  const sessions = new Map([['s1', sessionOf([fileEvent({ attachmentId: ID(1), name: 'a.md', bytes: 2 })])]])
  const routes = harness({ sessions })
  const { status, body } = await json(await routes.get('/api/context-bar.ui')
    .fetch(request('/api/context-bar.ui', 's1', { category: 'attachments' })))
  assert.equal(status, 200)
  assert.equal(body.attachments.length, 1)
  assert.equal(body.attachments[0].index, 0)
  assert.equal(body.attachments[0].attachmentId, ID(1))
})

test('counts category summarizes messages, attachments and skills', async () => {
  const sessions = new Map([['s1', sessionOf([
    systemEvent('prompt'),
    { type: 'user/message', seq: 2, data: { role: 'user', content: [{ type: 'text', text: 'hi' }] } },
    {
      type: 'assistant/message',
      seq: 3,
      data: { message: { role: 'assistant', content: [{ type: 'text', text: 'hello' }] } },
    },
    fileEvent({ attachmentId: ID(8), name: 'notes.md', bytes: 2 }, 4),
  ])]])
  const skills = {
    async list() {
      return [
        { name: 'alpha', description: 'A', source: 'bundled' },
        { name: 'beta', description: 'B', source: 'user-dsh' },
      ]
    },
    async get() { return {} },
  }
  const routes = harness({ sessions, skills })
  const { status, body } = await json(await routes.get('/api/context-bar.ui')
    .fetch(request('/api/context-bar.ui', 's1', { category: 'counts' })))
  assert.equal(status, 200)
  assert.equal(body.kind, 'counts')
  assert.deepEqual(body.counts, { messages: 3, attachments: 1, skills: 2 })
})

test('counts category degrades to zero skills without a registry', async () => {
  const sessions = new Map([['s1', sessionOf([systemEvent('prompt')])]])
  const routes = harness({ sessions })
  const { status, body } = await json(await routes.get('/api/context-bar.ui')
    .fetch(request('/api/context-bar.ui', 's1', { category: 'counts' })))
  assert.equal(status, 200)
  assert.deepEqual(body.counts, { messages: 0, attachments: 0, skills: 0 })
})

test('messages category pages older rows and counts the whole list', async () => {
  const events = Array.from({ length: 45 }, (_, index) => userText(index + 1, `m${index + 1}`))
  const routes = harness({ sessions: new Map([['s1', sessionOf(events)]]) })
  const route = routes.get('/api/context-bar.ui')

  const first = await json(await route.fetch(request(route.path, 's1', { category: 'messages' })))
  assert.equal(first.status, 200)
  assert.equal(first.body.total, 45)
  assert.equal(first.body.messages.length, 40)
  assert.equal(first.body.hasMore, true)
  assert.equal(first.body.nextBefore, 5)
  assert.equal(first.body.messages[0].text, 'm6')

  const older = await json(await route.fetch(request(route.path, 's1', {
    category: 'messages', before: '5', limit: '40',
  })))
  assert.equal(older.body.messages.length, 5)
  assert.equal(older.body.hasMore, false)
  assert.deepEqual(older.body.messages.map((message) => message.text), ['m1', 'm2', 'm3', 'm4', 'm5'])

  const counts = await json(await route.fetch(request(route.path, 's1', { category: 'counts' })))
  assert.equal(counts.body.counts.messages, 45)

  assert.equal((await json(await route.fetch(request(route.path, 's1', { category: 'messages', limit: '0' })))).status, 400)
  assert.equal((await json(await route.fetch(request(route.path, 's1', { category: 'messages', before: 'x' })))).status, 400)
})

test('messages category filters by role and errors before paging', async () => {
  const events = [
    userText(1, 'u1'),
    userText(2, 'u2'),
    userText(3, 'u3'),
    assistantReply(4, 10),
    assistantReply(5, 11),
    { type: 'tool/call', seq: 6, data: { callId: 'c1', name: 'bash', arguments: '{}' } },
    {
      type: 'tool/result',
      seq: 7,
      data: { message: { role: 'tool', toolCallId: 'c1', isError: true, content: [{ type: 'text', text: 'boom' }] } },
    },
    userText(8, 'u4'),
  ]
  const route = harness({ sessions: new Map([['s1', sessionOf(events)]] ) }).get('/api/context-bar.ui')

  const users = await json(await route.fetch(request(route.path, 's1', { category: 'messages', roles: 'user', limit: '2' })))
  assert.equal(users.status, 200)
  assert.equal(users.body.total, 4)
  assert.equal(users.body.allTotal, 7)
  assert.equal(users.body.messages.length, 2)
  assert.deepEqual(users.body.messages.map((message) => message.text), ['u3', 'u4'])
  assert.equal(users.body.hasMore, true)
  assert.equal(users.body.nextBefore, 2)
  assert.deepEqual(users.body.filters, { roles: ['user'], errorsOnly: false })
  assert.deepEqual(users.body.counts, { user: 4, assistant: 2, tool: 1, system: 0 })

  const olderUsers = await json(await route.fetch(request(route.path, 's1', {
    category: 'messages', roles: 'user', limit: '2', before: '2',
  })))
  assert.deepEqual(olderUsers.body.messages.map((message) => message.text), ['u1', 'u2'])
  assert.equal(olderUsers.body.hasMore, false)

  const errors = await json(await route.fetch(request(route.path, 's1', { category: 'messages', errors: '1' })))
  assert.equal(errors.body.total, 1)
  assert.equal(errors.body.messages[0].role, 'tool')
  assert.equal(errors.body.messages[0].isError, true)

  const noErrorUsers = await json(await route.fetch(request(route.path, 's1', {
    category: 'messages', roles: 'user,assistant', errors: '1',
  })))
  assert.equal(noErrorUsers.body.total, 0)
  assert.equal(noErrorUsers.body.messages.length, 0)

  assert.equal((await json(await route.fetch(request(route.path, 's1', { category: 'messages', roles: 'nobody' })))).status, 400)
  assert.equal((await json(await route.fetch(request(route.path, 's1', { category: 'messages', errors: 'yes' })))).status, 400)
})

test('diff and export summarize a step against the previous one', async () => {
  const events = [
    stepStart(1, 1, 1),
    requestContextAt(2, 1000),
    requestHeaderAt(3, ['alpha']),
    userText(4, 'first'),
    assistantReply(5, 100),
    stepStart(6, 1, 2),
    requestHeaderAt(7, ['alpha', 'beta']),
    userText(8, 'second'),
    fileSurfaceEvent({ attachmentId: ID(9), name: 'a.md', bytes: 2 }, 9),
    assistantReply(10, 150),
  ]
  const routes = harness({ sessions: new Map([['s1', sessionOf(events)]]) })
  const route = routes.get('/api/context-bar.ui')

  const diff = await json(await route.fetch(request(route.path, 's1', { category: 'diff', at: '6' })))
  assert.equal(diff.status, 200)
  assert.equal(diff.body.kind, 'diff')
  assert.equal(diff.body.from, 1)
  assert.equal(diff.body.totalDelta, 50)
  assert.deepEqual(diff.body.tools, { added: ['beta'], removed: [], changed: [] })
  assert.equal(diff.body.attachments.added.length, 1)
  assert.equal(diff.body.attachments.added[0].name, 'a.md')
  const messagesDelta = diff.body.categories.find((item) => item.key === 'messages')
  assert.ok(messagesDelta.delta > 0)
  assert.equal(messagesDelta.fromCount, 1)
  assert.equal(messagesDelta.toCount, 4)
  assert.equal(diff.body.messages.addedCount, 3)
  assert.equal(diff.body.messages.removedCount, 0)
  assert.equal(diff.body.messages.changedCount, 0)
  assert.equal(diff.body.messages.added[0].role, 'assistant')
  assert.equal(diff.body.messages.added[0].preview, 'ok')
  assert.equal(diff.body.systemChanged, false)

  const first = await json(await route.fetch(request(route.path, 's1', { category: 'diff', at: '1' })))
  assert.equal(first.body.from, null)

  const exported = await json(await route.fetch(request(route.path, 's1', { category: 'export', at: '6' })))
  assert.equal(exported.status, 200)
  assert.equal(exported.body.kind, 'export')
  assert.equal(exported.body.step.turn, 1)
  assert.equal(exported.body.step.step, 2)
  assert.equal(exported.body.step.promptTokens, 150)
  assert.equal(exported.body.tools.system.length, 2)
  assert.equal(exported.body.attachments.length, 1)
  assert.equal(exported.body.counts.messages, 4)
  assert.equal(exported.body.messages.length, 4)

  assert.equal((await json(await route.fetch(request(route.path, 's1', { category: 'diff', at: '6', from: '999' })))).status, 400)

  const detail = await json(await route.fetch(request(route.path, 's1', { category: 'message', at: '6', from: '1', id: 'assistant:5' })))
  assert.equal(detail.status, 200)
  assert.equal(detail.body.kind, 'message')
  assert.equal(detail.body.message.role, 'assistant')
  assert.equal(detail.body.message.text, 'ok')
  assert.equal(detail.body.previous, null)

  const removed = await json(await route.fetch(request(route.path, 's1', { category: 'message', at: '1', from: '6', id: 'user:8' })))
  assert.equal(removed.body.message, null)
  assert.equal(removed.body.previous.role, 'user')

  assert.equal((await json(await route.fetch(request(route.path, 's1', { category: 'message', at: '6' })))).status, 400)

  const search = await json(await route.fetch(request(route.path, 's1', { category: 'search', q: 'second' })))
  assert.equal(search.status, 200)
  assert.equal(search.body.kind, 'search')
  assert.equal(search.body.total, 1)
  assert.equal(search.body.results[0].at, 6)
  assert.equal(search.body.results[0].role, 'user')
  assert.equal(search.body.results[0].preview, 'second')

  const searchOk = await json(await route.fetch(request(route.path, 's1', { category: 'search', q: 'ok' })))
  assert.equal(searchOk.body.total, 2)
  assert.equal(searchOk.body.results[0].role, 'assistant')
  assert.equal(searchOk.body.results[0].at, null)
  assert.equal(searchOk.body.results.find((result) => result.seq === 5).at, 6)
  const searchPage = await json(await route.fetch(request(route.path, 's1', { category: 'search', q: 'ok', offset: '1' })))
  assert.equal(searchPage.body.total, 2)
  assert.equal(searchPage.body.results.length, 1)
  assert.equal(searchPage.body.results[0].seq, 5)
  assert.equal(searchPage.body.nextOffset, null)
  const searchAssistant = await json(await route.fetch(request(route.path, 's1', { category: 'search', q: 'ok', roles: 'assistant' })))
  assert.equal(searchAssistant.body.total, 2)
  const searchUser = await json(await route.fetch(request(route.path, 's1', { category: 'search', q: 'ok', roles: 'user' })))
  assert.equal(searchUser.body.total, 0)
  assert.equal((await json(await route.fetch(request(route.path, 's1', { category: 'search', q: '' })))).status, 400)
  assert.equal((await json(await route.fetch(request(route.path, 's1', { category: 'search', q: 'ok', offset: 'x' })))).status, 400)
  assert.equal((await json(await route.fetch(request(route.path, 's1', { category: 'search', q: 'ok', roles: 'nope' })))).status, 400)

  const all = await json(await route.fetch(request(route.path, 's1', { category: 'message', scope: 'all', id: 'assistant:5' })))
  assert.equal(all.body.scope, 'all')
  assert.equal(all.body.message.text, 'ok')

  const toolSearch = await json(await route.fetch(request(route.path, 's1', { category: 'search', q: 'alpha' })))
  assert.equal(toolSearch.body.total, 1)
  assert.equal(toolSearch.body.results[0].kind, 'tool')
  assert.equal(toolSearch.body.results[0].category, 'systemTools')
  assert.equal(toolSearch.body.results[0].at, null)

  const messagesOnly = await json(await route.fetch(request(route.path, 's1', { category: 'search', q: 'ok', kinds: 'message' })))
  assert.equal(messagesOnly.body.total, 2)
  const toolsOnly = await json(await route.fetch(request(route.path, 's1', { category: 'search', q: 'ok', kinds: 'tool' })))
  assert.equal(toolsOnly.body.total, 0)
  const alphaTools = await json(await route.fetch(request(route.path, 's1', { category: 'search', q: 'alpha', kinds: 'tool' })))
  assert.equal(alphaTools.body.total, 1)
  const alphaMessages = await json(await route.fetch(request(route.path, 's1', { category: 'search', q: 'alpha', kinds: 'message' })))
  assert.equal(alphaMessages.body.total, 0)
  assert.equal((await json(await route.fetch(request(route.path, 's1', { category: 'search', q: 'ok', kinds: 'nope' })))).status, 400)
})

test('search includes the current system prompt', async () => {
  const events = [
    systemAt(1, 'needle system prompt'),
    stepStart(2, 1, 1),
    userText(3, 'hello'),
    assistantReply(4, 10),
  ]
  const routes = harness({ sessions: new Map([['s1', sessionOf(events)]]) })
  const found = await json(await routes.get('/api/context-bar.ui')
    .fetch(request('/api/context-bar.ui', 's1', { category: 'search', q: 'needle' })))
  assert.equal(found.status, 200)
  assert.equal(found.body.total, 1)
  assert.equal(found.body.results[0].kind, 'system')
  assert.equal(found.body.results[0].category, 'system')
  assert.equal(found.body.results[0].at, null)
})

test('diff carries system prompt and changed tool schema details', async () => {
  const events = [
    systemAt(1, 'old prompt'),
    stepStart(2, 1, 1),
    headerToolsAt(3, [{ type: 'function', function: { name: 'alpha', description: 'old' } }]),
    userText(4, 'one'),
    assistantReply(5, 10),
    stepStart(6, 1, 2),
    systemAt(7, 'new prompt'),
    headerToolsAt(8, [
      { type: 'function', function: { name: 'alpha', description: 'new' } },
      { type: 'function', function: { name: 'beta', description: 'b' } },
    ]),
    userText(9, 'two'),
    assistantReply(10, 20),
  ]
  const routes = harness({ sessions: new Map([['s1', sessionOf(events)]]) })
  const diff = await json(await routes.get('/api/context-bar.ui')
    .fetch(request('/api/context-bar.ui', 's1', { category: 'diff', at: '6' })))
  assert.equal(diff.status, 200)
  assert.equal(diff.body.systemChanged, true)
  assert.equal(diff.body.systemBefore, 'old prompt')
  assert.equal(diff.body.systemAfter, 'new prompt')
  assert.deepEqual(diff.body.tools.changed, ['alpha'])
  assert.deepEqual(diff.body.tools.added, ['beta'])
  assert.equal(diff.body.categories.reduce((sum, item) => sum + item.from, 0), 10)
  assert.equal(diff.body.categories.reduce((sum, item) => sum + item.to, 0), 20)
  assert.equal(diff.body.categories.some((item) => item.key === 'unaccounted'), false)
})

test('diff points at the step before a compaction', async () => {
  const events = [
    stepStart(1, 1, 1),
    userText(2, 'one'),
    assistantReply(3, 10),
    stepStart(4, 1, 2),
    userText(5, 'two'),
    assistantReply(6, 20),
    { type: 'compaction/summary', seq: 7, data: { shadowedSeqs: [], shadowedRange: { start: 0, end: 0 }, shadowedTokenCount: 0 } },
    stepStart(8, 1, 3),
    userText(9, 'three'),
    assistantReply(10, 30),
  ]
  const routes = harness({ sessions: new Map([['s1', sessionOf(events)]]) })
  const diff = await json(await routes.get('/api/context-bar.ui')
    .fetch(request('/api/context-bar.ui', 's1', { category: 'diff', at: '8' })))
  assert.equal(diff.status, 200)
  assert.equal(diff.body.compactionBetween, true)
  assert.equal(diff.body.compactionBeforeAt, 4)
})

test('diff jumps to the step before the newest compaction, not the first one', async () => {
  const summary = (seq) => ({
    type: 'compaction/summary',
    seq,
    data: { shadowedSeqs: [], shadowedRange: { start: 0, end: 0 }, shadowedTokenCount: 0 },
  })
  const events = [
    stepStart(1, 1, 1),
    userText(2, 'one'),
    assistantReply(3, 10),
    stepStart(4, 1, 2),
    userText(5, 'two'),
    assistantReply(6, 20),
    summary(7),
    stepStart(8, 1, 3),
    userText(9, 'three'),
    assistantReply(10, 30),
    stepStart(11, 1, 4),
    userText(12, 'four'),
    assistantReply(13, 40),
    summary(14),
    stepStart(15, 1, 5),
    userText(16, 'five'),
    assistantReply(17, 50),
  ]
  const routes = harness({ sessions: new Map([['s1', sessionOf(events)]]) })
  const diff = await json(await routes.get('/api/context-bar.ui')
    .fetch(request('/api/context-bar.ui', 's1', { category: 'diff', at: '15' })))
  assert.equal(diff.status, 200)
  assert.equal(diff.body.compactionBetween, true)
  assert.equal(diff.body.compactionBeforeAt, 11)
})

// ------------------------------------------------------------------- history

test('history pairs each step with its settlement and prompt usage', () => {
  const events = [
    stepStart(1, 1, 1),
    requestContextAt(2, 1000),
    requestHeaderAt(3, ['alpha']),
    userText(4, 'first'),
    assistantReply(5, 13),
    stepStart(6, 1, 2),
    requestHeaderAt(7, ['alpha', 'beta']),
    userText(8, 'second'),
    assistantReply(9, 20),
  ]
  const steps = historySteps(events)
  assert.equal(steps.length, 2)
  assert.equal(steps[0].at, 1)
  assert.equal(steps[0].cut, 4)
  assert.equal(steps[0].promptTokens, 13)
  assert.equal(steps[0].window, 1000)
  assert.equal(steps[0].compacted, false)
  assert.equal(steps[1].cut, 8)
  assert.equal(steps[1].promptTokens, 20)
})

test('history route lists steps and at-scoped snapshots stay on that step', async () => {
  const events = [
    stepStart(1, 1, 1),
    requestContextAt(2, 1000),
    requestHeaderAt(3, ['alpha']),
    userText(4, 'first'),
    assistantReply(5, 13),
    stepStart(6, 1, 2),
    requestHeaderAt(7, ['alpha', 'beta']),
    userText(8, 'second'),
    assistantReply(9, 20),
  ]
  const routes = harness({ sessions: new Map([['s1', sessionOf(events)]]) })
  const route = routes.get('/api/context-bar.ui')

  const history = await json(await route.fetch(request(route.path, 's1', { category: 'history' })))
  assert.equal(history.status, 200)
  assert.equal(history.body.kind, 'history')
  assert.equal(history.body.total, 2)
  assert.equal(history.body.steps.length, 2)
  assert.equal(history.body.steps[0].cut, 4)
  assert.equal(history.body.steps[0].promptTokens, 13)

  const counts = await json(await route.fetch(request(route.path, 's1', { category: 'counts', at: '1' })))
  assert.equal(counts.status, 200)
  assert.equal(counts.body.historical, true)
  assert.equal(counts.body.counts.messages, 1)
  assert.equal(counts.body.counts.systemTools, 1)
  assert.equal(counts.body.promptTokens, 13)
  assert.equal(counts.body.window, 1000)
  assert.ok(counts.body.breakdown.systemToolsTokens > 0)

  const first = await json(await route.fetch(request(route.path, 's1', { category: 'messages', at: '1' })))
  assert.equal(first.body.messages.length, 1)
  assert.equal(first.body.messages[0].text, 'first')

  const second = await json(await route.fetch(request(route.path, 's1', { category: 'messages', at: '6' })))
  assert.equal(second.body.messages.length, 3)
  assert.deepEqual(second.body.messages.map((message) => message.text), ['first', 'ok', 'second'])

  const toolsOne = await json(await route.fetch(request(route.path, 's1', { category: 'systemTools', at: '1' })))
  assert.equal(toolsOne.body.tools.length, 1)
  const toolsTwo = await json(await route.fetch(request(route.path, 's1', { category: 'systemTools', at: '6' })))
  assert.equal(toolsTwo.body.tools.length, 2)

  assert.equal((await json(await route.fetch(request(route.path, 's1', { category: 'counts', at: '999' })))).status, 400)
  assert.equal((await json(await route.fetch(request(route.path, 's1', { category: 'counts', at: 'x' })))).status, 400)
})

test('compaction replay keeps old content before the replacement and hides it after', async () => {
  const events = [stepStart(1, 1, 1), userText(2, 'old'), assistantReply(3, 10)]
  const shadowedTokenCount = foldDetailedUntil(events, 2).surfaceTokens
  events.push(
    {
      type: 'compaction/summary',
      seq: 4,
      data: { shadowedSeqs: [2], shadowedRange: { start: 2, end: 2 }, shadowedTokenCount },
    },
    {
      type: 'assistant/message',
      seq: 5,
      surfaceOp: { op: 'replace', startSeq: 2, endSeq: 2 },
      data: { message: { role: 'assistant', content: [{ type: 'text', text: 'summary' }] } },
    },
    stepStart(6, 1, 2),
    userText(7, 'new'),
    assistantReply(8, 20),
  )

  const steps = historySteps(events)
  assert.equal(steps.length, 2)
  assert.equal(steps[0].compacted, false)
  assert.equal(steps[1].compacted, true)
  assert.ok(foldDetailedUntil(events, 2).breakdown.messageTokens > 0)
  assert.ok(foldDetailedUntil(events, 7).breakdown.messageTokens > 0)

  const routes = harness({ sessions: new Map([['s1', sessionOf(events)]]) })
  const route = routes.get('/api/context-bar.ui')
  const before = await json(await route.fetch(request(route.path, 's1', { category: 'messages', at: '1' })))
  assert.deepEqual(before.body.messages.map((message) => message.text), ['old'])
  const after = await json(await route.fetch(request(route.path, 's1', { category: 'messages', at: '6' })))
  const texts = after.body.messages.map((message) => message.text)
  assert.equal(texts.includes('old'), false)
  assert.ok(texts.includes('summary'))
  assert.ok(texts.includes('new'))
})

// ------------------------------------------------------------- attachment route

test('attachment route previews an image through the attachments service', async () => {
  const seen = []
  const attachments = {
    async readImage(ref, signal) {
      seen.push({ ref, aborted: signal?.aborted === true })
      return { ref, data: Uint8Array.from([137, 80, 78, 71]) }
    },
  }
  const sessions = new Map([['s1', sessionOf([imageEvent(ID(1))])]])
  const route = harness({ sessions, attachments }).get('/api/context-bar.file')
  const { status, body } = await json(await route.fetch(request(route.path, 's1', { attachmentId: ID(1) })))
  assert.equal(status, 200)
  assert.equal(body.ok, true)
  assert.equal(body.kind, 'image')
  assert.match(body.dataUrl, /^data:image\/png;base64,/)
  assert.equal(seen.length, 1)
  assert.equal(seen[0].ref.attachmentId, ID(1))
})

test('attachment route previews a text file as bounded chunks', async () => {
  const attachments = { ...textStream('hello ', 'world') }
  const sessions = new Map([['s1', sessionOf([fileEvent({ attachmentId: ID(2), name: 'notes.md', bytes: 11 })])]])
  const route = harness({ sessions, attachments }).get('/api/context-bar.file')
  const { status, body } = await json(await route.fetch(request(route.path, 's1', { attachmentId: ID(2) })))
  assert.equal(status, 200)
  assert.equal(body.kind, 'text')
  assert.equal(body.text, 'hello world')
  assert.equal(body.mimeType, 'text/markdown')
})

test('attachment route ignores filesystem paths carried by session events', async () => {
  let reads = 0
  const attachments = { async *readFileStream() { reads += 1; yield Buffer.from('x') } }
  const sessions = new Map([['s1', sessionOf([fileEvent({ path: '/etc/passwd', name: 'passwd' })])]])
  const route = harness({ sessions, attachments }).get('/api/context-bar.file')

  const unknown = await json(await route.fetch(request(route.path, 's1', { attachmentId: ID(3) })))
  assert.equal(unknown.status, 404)
  assert.equal(unknown.body.error, 'attachment-not-found')

  const traversal = await json(await route.fetch(request(route.path, 's1', { attachmentId: '/etc/passwd' })))
  assert.equal(traversal.status, 400)
  assert.equal(traversal.body.error, 'bad-attachment-id')
  assert.equal(reads, 0)
})

test('attachment route rejects oversized references before reading', async () => {
  let reads = 0
  const attachments = {
    async *readFileStream() { reads += 1; yield Buffer.from('x') },
    async readImage() { reads += 1; return { data: new Uint8Array(0) } },
  }
  const sessions = new Map([['s1', sessionOf([
    fileEvent({ attachmentId: ID(4), name: 'huge.bin', bytes: MAX_PREVIEW_BYTES + 1 }),
  ])]])
  const route = harness({ sessions, attachments }).get('/api/context-bar.file')
  const { status, body } = await json(await route.fetch(request(route.path, 's1', { attachmentId: ID(4) })))
  assert.equal(status, 413)
  assert.equal(body.error, 'attachment-too-large')
  assert.equal(reads, 0)
})

test('attachment route stops a stream that grows past the preview limit', async () => {
  const chunk = Buffer.alloc(5 * 1024 * 1024, 1)
  const attachments = {
    async *readFileStream() {
      for (let index = 0; index < 3; index += 1) yield chunk
    },
  }
  const sessions = new Map([['s1', sessionOf([fileEvent({ attachmentId: ID(5), name: 'grow.bin', bytes: 1 })])]])
  const route = harness({ sessions, attachments }).get('/api/context-bar.file')
  const { status, body } = await json(await route.fetch(request(route.path, 's1', { attachmentId: ID(5) })))
  assert.equal(status, 413)
  assert.equal(body.error, 'attachment-too-large')
})

test('attachment route finds an id that fell out of the 60-item display window', async () => {
  const events = []
  for (let index = 0; index < 65; index += 1) events.push(imageEvent(ID(index), index + 1))
  const attachments = { async readImage(ref) { return { ref, data: Uint8Array.from([1]) } } }
  const sessions = new Map([['s1', sessionOf(events)]])
  const routes = harness({ sessions, attachments })
  const listed = (await json(await routes.get('/api/context-bar.ui')
    .fetch(request('/api/context-bar.ui', 's1', { category: 'attachments' })))).body.attachments
  assert.equal(listed.some((item) => item.attachmentId === ID(0)), false)

  const { status, body } = await json(await routes.get('/api/context-bar.file')
    .fetch(request('/api/context-bar.file', 's1', { attachmentId: ID(0) })))
  assert.equal(status, 200)
  assert.equal(body.ok, true)
})

test('attachment route returns stable error codes and never leaks read errors', async () => {
  const attachments = {
    async *readFileStream() { throw new Error('ENOENT: /Users/secret/object') },
  }
  const sessions = new Map([['s1', sessionOf([fileEvent({ attachmentId: ID(6), name: 'x.txt', bytes: 1 })])]])
  const route = harness({ sessions, attachments }).get('/api/context-bar.file')
  const { status, body } = await json(await route.fetch(request(route.path, 's1', { attachmentId: ID(6) })))
  assert.equal(status, 502)
  assert.equal(body.error, 'attachment-read-failed')
  assert.equal(JSON.stringify(body).includes('/Users/secret'), false)
})

test('attachment route degrades when the attachments service is absent', async () => {
  const sessions = new Map([['s1', sessionOf([fileEvent({ attachmentId: ID(7), name: 'x.txt', bytes: 1 })])]])
  const route = harness({ sessions }).get('/api/context-bar.file')
  const { status, body } = await json(await route.fetch(request(route.path, 's1', { attachmentId: ID(7) })))
  assert.equal(status, 501)
  assert.equal(body.error, 'attachments-unavailable')
})

// -------------------------------------------------------------------- skills

test('skills content tolerates a failing registry and a failing skill body', async () => {
  assert.deepEqual(await skillsContent(undefined, '/w'), [])
  assert.deepEqual(await skillsContent({ async list() { throw new Error('boom') }, async get() {} }, '/w'), [])
  const partial = await skillsContent({
    async list() {
      return [
        { name: 'a', description: 'A', source: 'bundled', provider: 'dsh-office' },
        { name: 'b', description: 'B', source: 'custom', provider: 'filesystem' },
      ]
    },
    async get(name) { if (name === 'a') throw new Error('unreadable'); return { content: 'body of b' } },
  }, '/w')
  assert.equal(partial.length, 2)
  assert.equal(partial[0].content, '')
  assert.equal(partial[0].source, 'bundled')
  assert.equal(partial[0].provider, 'dsh-office')
  assert.equal(partial[1].content, 'body of b')
  assert.equal(partial[1].provider, 'filesystem')
})

test('skill summaries and bodies are cached per registry and cwd', async () => {
  let listCalls = 0
  let getCalls = 0
  const skills = {
    async list() { listCalls += 1; return [{ name: 'a', description: 'A' }] },
    async get() { getCalls += 1; return { content: 'body' } },
  }
  await skillsContent(skills, '/w')
  await skillsContent(skills, '/w')
  assert.equal(listCalls, 1)
  assert.equal(getCalls, 1)
  await skillsContent(skills, '/other')
  assert.equal(listCalls, 2)
  assert.equal(getCalls, 2)
  const other = {
    async list() { listCalls += 1; return [] },
    async get() { getCalls += 1; return { content: '' } },
  }
  await skillsContent(other, '/w')
  assert.equal(listCalls, 3)
  assert.equal(getCalls, 2)
})

test('skills content is bounded by a deadline instead of hanging the route', async () => {
  const skills = {
    async list() { return [{ name: 'slow', description: 'S' }] },
    get(_name, options) {
      return new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
      })
    },
  }
  // AbortSignal.timeout() uses an unref'd timer; keep the loop alive so the
  // deadline really fires while the slow provider is pending.
  const keepAlive = setTimeout(() => {}, 1000)
  try {
    const started = Date.now()
    const items = await skillsContent(skills, '/w', { timeoutMs: 20 })
    assert.ok(Date.now() - started < 2000)
    assert.equal(items.length, 1)
    assert.equal(items[0].content, '')
  } finally {
    clearTimeout(keepAlive)
  }
})
