import assert from 'node:assert/strict'
import test from 'node:test'
import { isAttachmentId, toolContent, toolGroup } from '../index.js'

const tool = (name, description = '') => ({
  name,
  description,
  parameters: { type: 'object', properties: { q: { type: 'string' } } },
})

test('toolContent keeps full descriptions and parameters and groups by namespace', () => {
  const header = { tools: [tool('read', 'read a file'), tool('reqboard_status', 'status'), tool('tm_status', 'tm')] }
  const rows = toolContent(header, false)
  assert.equal(rows.length, 3)
  const read = rows.find((row) => row.name === 'read')
  assert.equal(read.description, 'read a file')
  assert.deepEqual(read.parameters.required, undefined)
  assert.equal(read.group, 'builtin')
  assert.equal(rows.find((row) => row.name === 'reqboard_status').group, 'reqboard')
  assert.equal(rows.find((row) => row.name === 'tm_status').group, 'tm')
  assert.ok(read.tokens > 0)
})

test('MCP tools group by server and stay out of the system bucket', () => {
  const header = { tools: [tool('mcp__github__create_issue', 'issue'), tool('read')] }
  assert.equal(toolContent(header, true).length, 1)
  assert.equal(toolContent(header, true)[0].group, 'github')
  assert.equal(toolContent(header, false).length, 1)
})

test('toolGroup folds core prefixes into builtin', () => {
  assert.equal(toolGroup('todo_write'), 'builtin')
  assert.equal(toolGroup('team_task_create'), 'builtin')
  assert.equal(toolGroup('reqboard_submit'), 'reqboard')
  assert.equal(toolGroup('dsh_browser_open'), 'dsh_browser')
})

test('attachment ids are opaque storage identifiers, never filesystem paths', () => {
  assert.equal(isAttachmentId(`sha256:${'ab'.repeat(32)}`), true)
  for (const value of ['', '/etc/passwd', '../x', 'sha256:../../etc/passwd', 'a b', null, 3]) {
    assert.equal(isAttachmentId(value), false, JSON.stringify(value))
  }
})
