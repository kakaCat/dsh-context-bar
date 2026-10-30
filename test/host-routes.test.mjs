/**
 * Host routes: `/api/context-bar.ui` and `/api/context-bar.file`.
 * These exercise the real `apply()` wiring with a fake Cordis context, so the
 * route table, lookups, bounds and error codes are covered end to end.
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { apply, skillsContent } from '../index.js'

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

const textStream = (...parts) => ({
  async *readFileStream() {
    for (const part of parts) yield Buffer.from(part)
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
    async list() { return [{ name: 'a', description: 'A' }, { name: 'b', description: 'B' }] },
    async get(name) { if (name === 'a') throw new Error('unreadable'); return { content: 'body of b' } },
  }, '/w')
  assert.equal(partial.length, 2)
  assert.equal(partial[0].content, '')
  assert.equal(partial[1].content, 'body of b')
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
