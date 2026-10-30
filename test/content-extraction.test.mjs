/** Content extraction behind the right-side drawer endpoint. */
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  latestSystemPrompt,
  recentMessages,
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

test('messageText labels tool calls and files', () => {
  const text = messageText({
    role: 'assistant',
    content: [
      { type: 'text', text: 'hello' },
      { type: 'tool-call', name: 'read_file' },
      { type: 'file', attachment: { path: '/tmp/a.md' } },
    ],
  })
  assert.equal(text, 'hello\n[tool-call] read_file\n[file] /tmp/a.md')
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

test('attachment items include file paths and image markers', () => {
  const events = [{
    type: 'user/message',
    seq: 1,
    data: {
      role: 'user',
      content: [
        { type: 'file', attachment: { name: 'spec.md', path: '/tmp/spec.md', mimeType: 'text/markdown' } },
        { type: 'image', mimeType: 'image/png' },
      ],
    },
  }]
  const items = attachmentItems(events)
  assert.equal(JSON.stringify(items.map((item) => item.kind)), JSON.stringify(['file', 'image']))
  assert.equal(items[0].path, '/tmp/spec.md')
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
  assert.equal(items[0].text, 'checking')
  assert.deepEqual(items[0].toolCalls, [{ id: 'c1', name: 'bash', arguments: '{"command":"ls"}' }])
  assert.equal(items[1].toolName, 'bash')
  assert.equal(items[1].text, 'a.txt')
})
