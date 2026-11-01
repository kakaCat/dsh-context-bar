/** Content extraction behind the right-side drawer endpoint. */
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  latestSystemPrompt,
  recentMessages,
  messagePage,
  messageTotal,
  toolContent,
  attachmentItems,
  messageText,
} from '../index.js'

const systemEvent = (seq, text) => ({
  type: 'system/message',
  seq,
  data: { message: { role: 'system', content: [{ type: 'text', text }] } },
})

test('latest system prompt skips empty rewrites', () => {
  const events = [
    systemEvent(1, 'first prompt'),
    systemEvent(2, 'second prompt'),
    systemEvent(3, ''),
  ]
  assert.equal(latestSystemPrompt(events), 'second prompt')
  assert.equal(latestSystemPrompt([]), '')
})

test('messageText labels tool calls and files by display name, never by path', () => {
  const text = messageText({
    role: 'assistant',
    content: [
      { type: 'text', text: 'hello' },
      { type: 'tool-call', name: 'read_file' },
      { type: 'file', attachment: { name: 'a.md', path: '/tmp/a.md' } },
    ],
  })
  assert.equal(text, 'hello\n[tool-call] read_file\n[file] a.md')
})

test('tools are split by the mcp__ prefix', () => {
  const header = {
    tools: [
      { type: 'function', function: { name: 'shell', description: 'Run commands' } },
      { type: 'function', function: { name: 'mcp__github__search', description: 'Search' } },
    ],
  }
  const system = toolContent(header, false)
  const mcp = toolContent(header, true)
  assert.equal(JSON.stringify(system.map((tool) => tool.name)), JSON.stringify(['shell']))
  assert.equal(JSON.stringify(mcp.map((tool) => tool.name)), JSON.stringify(['mcp__github__search']))
})

test('recent messages keep chronological order and roles', () => {
  const events = [
    { type: 'user/message', seq: 1, data: { role: 'user', content: [{ type: 'text', text: 'hi' }] } },
    {
      type: 'assistant/message',
      seq: 2,
      data: { message: { role: 'assistant', content: [{ type: 'text', text: 'hello' }] } },
    },
    {
      type: 'tool/result',
      seq: 3,
      data: { message: { role: 'user', content: [{ type: 'text', text: 'result' }] } },
    },
  ]
  const items = recentMessages(events)
  assert.equal(JSON.stringify(items.map((item) => item.role)), JSON.stringify(['user', 'assistant', 'tool']))
  assert.equal(items[0].text, 'hi')
})

test('attachment items expose durable content-addressed refs, not paths', () => {
  const fileId = `sha256:${'cd'.repeat(32)}`
  const imageId = `sha256:${'ef'.repeat(32)}`
  const events = [{
    type: 'user/message',
    seq: 1,
    data: {
      role: 'user',
      content: [
        { type: 'file', attachment: { attachmentId: fileId, name: 'spec.md', bytes: 42 } },
        {
          type: 'image',
          attachment: { attachmentId: imageId, mediaType: 'image/png', bytes: 128, width: 4, height: 3 },
        },
      ],
    },
  }]
  const items = attachmentItems(events)
  assert.equal(JSON.stringify(items.map((item) => item.kind)), JSON.stringify(['file', 'image']))
  assert.equal(items[0].attachmentId, fileId)
  assert.equal(items[0].mimeType, 'text/markdown')
  assert.equal(items[0].name, 'spec.md')
  assert.equal('path' in items[0], false)
  assert.equal(items[1].attachmentId, imageId)
  assert.equal(items[1].mimeType, 'image/png')
})

test('recent messages keep tool calls as structured arguments and name tool results', () => {
  const events = [
    {
      type: 'assistant/message',
      seq: 1,
      data: {
        message: {
          role: 'assistant',
          content: [
            { type: 'text', text: 'checking' },
            { type: 'tool-call', id: 'c1', name: 'bash', arguments: '{"command":"ls"}' },
          ],
        },
      },
    },
    {
      type: 'tool/result',
      seq: 2,
      data: { message: { role: 'tool', toolCallId: 'c1', content: [{ type: 'text', text: 'a.txt' }] } },
    },
  ]
  const items = recentMessages(events)
  assert.equal(items.length, 2)
  assert.equal(items[0].role, 'assistant')
  assert.equal(items[0].text, 'checking')
  assert.equal(items[0].toolCalls, undefined)
  assert.equal(items[1].role, 'tool')
  assert.equal(items[1].toolName, 'bash')
  assert.equal(items[1].toolArguments, '{"command":"ls"}')
  assert.equal(items[1].text, 'a.txt')
})

test('tool calls merge with their results into one tool row', () => {
  const events = [
    {
      type: 'assistant/message',
      seq: 1,
      data: {
        message: {
          role: 'assistant',
          content: [
            { type: 'reasoning', text: 'need to list files' },
            { type: 'tool-call', id: 'c1', name: 'bash', arguments: '{"command":"ls"}' },
          ],
        },
      },
    },
    { type: 'tool/call', seq: 2, data: { callId: 'c1', name: 'bash', arguments: '{"command":"ls"}' } },
    {
      type: 'tool/result',
      seq: 3,
      data: { message: { role: 'tool', toolCallId: 'c1', content: [{ type: 'text', text: 'a.txt' }] } },
    },
  ]
  const items = recentMessages(events)
  assert.equal(items.length, 2)
  assert.equal(items[0].role, 'assistant')
  assert.equal(items[0].text, '')
  assert.equal(items[0].reasoning, 'need to list files')
  assert.equal(items[0].toolCalls, undefined)
  assert.equal(items[1].role, 'tool')
  assert.equal(items[1].toolName, 'bash')
  assert.equal(items[1].toolArguments, '{"command":"ls"}')
  assert.equal(items[1].text, 'a.txt')
})

test('message pages walk older entries without overlap', () => {
  const events = Array.from({ length: 45 }, (_, index) => ({
    type: 'user/message',
    seq: index + 1,
    data: { role: 'user', content: [{ type: 'text', text: `m${index + 1}` }] },
  }))
  assert.equal(messageTotal(events), 45)
  const first = messagePage(events, { limit: 40 })
  assert.equal(first.total, 45)
  assert.equal(first.messages.length, 40)
  assert.equal(first.hasMore, true)
  assert.equal(first.nextBefore, 5)
  assert.equal(first.messages[0].text, 'm6')
  assert.equal(first.messages.at(-1).text, 'm45')

  const older = messagePage(events, { limit: 40, before: first.nextBefore })
  assert.equal(older.messages.length, 5)
  assert.equal(older.hasMore, false)
  assert.equal(older.nextBefore, 0)
  assert.deepEqual(older.messages.map((message) => message.text), ['m1', 'm2', 'm3', 'm4', 'm5'])
})

test('tool rows expose status and duration', () => {
  const call = { type: 'tool/call', seq: 1, time: 100, data: { callId: 'c1', name: 'bash', arguments: '{}' } }
  const result = {
    type: 'tool/result',
    seq: 2,
    time: 160,
    data: { message: { role: 'tool', toolCallId: 'c1', content: [{ type: 'text', text: 'ok' }] } },
  }
  const ok = recentMessages([call, result])
  assert.equal(ok.length, 1)
  assert.equal(ok[0].status, 'ok')
  assert.equal(ok[0].durationMs, 60)

  const failed = recentMessages([call, {
    ...result,
    data: { message: { ...result.data.message, isError: true } },
  }])
  assert.equal(failed[0].status, 'error')

  const pending = recentMessages([call])
  assert.equal(pending.length, 1)
  assert.equal(pending[0].status, 'pending')
  assert.equal(pending[0].durationMs, undefined)
})
