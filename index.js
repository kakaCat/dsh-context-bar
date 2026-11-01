/** Host half: detailed context-composition projection.
 *
 * Folds the same durable surface events as the token-meter's 3-bucket
 * `contextBreakdown`, but keeps Claude Code-style categories:
 * system prompt, system tools, MCP tools (`mcp__*` schemas), message text,
 * and file/image attachments. Heuristic prices mirror the token-meter's
 * fixed density estimator (chars/4 + block overheads), so figures are
 * display estimates, never billing data. No LLM calls, no polling: the
 * session-projection drive folds every committed event once.
 *
 * Attachment previews read through the `attachments` service (the durable,
 * content-addressed store) and never touch a filesystem path from a session
 * event, so a crafted event cannot turn the preview route into a file reader.
 */

import { extname } from 'node:path'

export const inject = ['sessionProjections']

const CHARS_PER_TOKEN = 4
const BLOCK_OVERHEAD = 4
const ROLE_OVERHEAD = 4
const MCP_TOOL_PREFIX = 'mcp__'

const SURFACE_EVENT_TYPES = new Set([
  'system/message',
  'developer/message',
  'user/message',
  'assistant/message',
  'tool/result',
])

function estimateStructuralBlock(block) {
  if (block?.type === 'image') {
    const { offloaded: _offloaded, ...reference } = block
    return BLOCK_OVERHEAD + Math.ceil(JSON.stringify(reference).length / CHARS_PER_TOKEN)
  }
  return BLOCK_OVERHEAD + Math.ceil(JSON.stringify(block).length / CHARS_PER_TOKEN)
}

/** Structural price of durable image/file blocks; 0 for plain-text messages. */
function estimateAttachmentTokens(content) {
  let tokens = 0
  for (const block of content ?? []) {
    if (block?.type === 'image' || block?.type === 'file') tokens += estimateStructuralBlock(block)
  }
  return tokens
}

function estimateContent(blocks) {
  let tokens = 0
  for (const block of blocks ?? []) {
    switch (block?.type) {
      case 'text':
      case 'reasoning':
        tokens += Math.ceil(String(block.text ?? '').length / CHARS_PER_TOKEN) + BLOCK_OVERHEAD
        break
      case 'tool-call':
        tokens += Math.ceil(String(block.name ?? '').length / CHARS_PER_TOKEN)
          + Math.ceil(String(block.arguments ?? '').length / CHARS_PER_TOKEN)
          + BLOCK_OVERHEAD
        break
      default:
        tokens += estimateStructuralBlock(block)
    }
  }
  return tokens
}

function estimateMessage(message) {
  if (!message) return 0
  if (message.role === 'system') {
    const content = message.content ?? []
    if (content.length === 0) return 0
    let characters = 0
    for (const block of content) {
      characters += block?.type === 'text' ? String(block.text ?? '').length : JSON.stringify(block).length
    }
    return Math.ceil(characters / CHARS_PER_TOKEN) + ROLE_OVERHEAD
  }
  return estimateContent(message.content) + ROLE_OVERHEAD
}

/** Split one request envelope's tool schemas into built-in and MCP buckets. */
function estimateToolSplit(header) {
  const tools = header?.tools
  if (!Array.isArray(tools) || tools.length === 0) {
    return { system: 0, mcp: 0, systemCount: 0, mcpCount: 0 }
  }
  let systemChars = 0
  let mcpChars = 0
  let systemCount = 0
  let mcpCount = 0
  for (const tool of tools) {
    const name = String(tool?.function?.name ?? tool?.name ?? '')
    const chars = JSON.stringify(tool).length
    if (name.startsWith(MCP_TOOL_PREFIX)) {
      mcpChars += chars
      if (name !== '') mcpCount += 1
    } else {
      systemChars += chars
      if (name !== '') systemCount += 1
    }
  }
  return {
    system: systemChars === 0 ? 0 : Math.ceil(systemChars / CHARS_PER_TOKEN) + BLOCK_OVERHEAD,
    mcp: mcpChars === 0 ? 0 : Math.ceil(mcpChars / CHARS_PER_TOKEN) + BLOCK_OVERHEAD,
    systemCount,
    mcpCount,
  }
}

function eventMessage(event) {
  if (event.type === 'user/message') return event.data ?? null
  return event.data?.message ?? null
}

/** Flatten one model message to display text; tool calls and files stay labelled. */
export function messageText(message) {
  const parts = []
  for (const block of message?.content ?? []) {
    if (block?.type === 'text') parts.push(String(block.text ?? ''))
    else if (block?.type === 'tool-call') parts.push(`[tool-call] ${String(block.name ?? '')}`)
    else if (block?.type === 'image') parts.push('[image]')
    else if (block?.type === 'file') {
      const file = block.attachment ?? {}
      // FileAttachmentRef is content-addressed: `name` is the display label,
      // never a filesystem path.
      parts.push(`[file] ${String(file.name ?? file.mimeType ?? '')}`)
    }
  }
  return parts.join('\n').trim()
}

export function latestSystemPrompt(events) {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i]
    if (event.type !== 'system/message') continue
    const text = messageText(event.data?.message)
    if (text !== '') return text
  }
  return ''
}

function latestHeader(events) {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (events[i].type === 'request/header') return events[i].data?.header
  }
  return undefined
}

const CORE_TOOL_PREFIXES = new Set([
  'todo', 'web', 'ask', 'exit', 'get', 'create', 'update', 'schedule',
  'subagent', 'send', 'spawn', 'wait', 'team', 'skill', 'workprocess', 'notify',
])

/** Namespace a non-MCP tool by its name prefix; core/plain tools share one bucket. */
export function toolGroup(name) {
  if (!name.includes('_')) return 'builtin'
  const parts = name.split('_')
  const prefix = name.startsWith('dsh_') && parts.length > 1 ? parts.slice(0, 2).join('_') : parts[0]
  return CORE_TOOL_PREFIXES.has(prefix) ? 'builtin' : prefix
}

export function toolContent(header, mcp) {
  const tools = Array.isArray(header?.tools) ? header.tools : []
  return tools
    .map((tool) => {
      const fn = tool?.function ?? tool ?? {}
      const name = String(fn.name ?? '')
      const raw = JSON.stringify(tool)
      const parameters = fn.parameters ?? { type: 'object', properties: {} }
      return {
        name,
        description: String(fn.description ?? ''),
        schemaBytes: raw.length,
        tokens: Math.ceil(raw.length / CHARS_PER_TOKEN),
        parameters,
        group: mcp
          ? (name.split('__')[1] ?? 'mcp')
          : toolGroup(name),
      }
    })
    .filter((tool) => tool.name !== '' && tool.name.startsWith(MCP_TOOL_PREFIX) === mcp)
}

const MESSAGE_TEXT_LIMIT = 6000
const MESSAGE_PAGE_DEFAULT = 40
const MESSAGE_PAGE_MAX = 200

/** Concatenated reasoning blocks; they belong to the assistant message but are not flat text. */
function reasoningText(message) {
  const parts = []
  for (const block of message?.content ?? []) {
    if (block?.type === 'reasoning') parts.push(String(block.text ?? ''))
  }
  return parts.join('\n').trim()
}

/**
 * All context rows, classified like the host transcript:
 * - `assistant` = the assistant message's reasoning/text (tool calls are not assistant prose);
 * - `tool` = one row per tool call, holding the call arguments and its result;
 * - `user` / `system` = their own messages.
 */
function buildMessageEntries(events) {
  const callBlocks = new Map()
  const callEvents = new Map()
  const results = new Map()
  for (const event of events) {
    const message = eventMessage(event)
    if (event.type === 'assistant/message') {
      for (const block of message?.content ?? []) {
        if (block?.type !== 'tool-call') continue
        const id = String(block.id ?? '')
        if (id === '') continue
        callBlocks.set(id, {
          name: String(block.name ?? ''),
          arguments: String(block.arguments ?? ''),
          tokens: estimateMessage({ role: 'assistant', content: [block] }),
          time: Number(event.time ?? 0) || undefined,
        })
      }
      continue
    }
    if (event.type === 'tool/call') {
      const id = String(event.data?.callId ?? '')
      if (id === '') continue
      callEvents.set(id, {
        name: String(event.data?.name ?? ''),
        arguments: String(event.data?.arguments ?? ''),
        time: Number(event.time ?? 0) || undefined,
      })
      continue
    }
    if (event.type === 'tool/result') {
      const id = String(message?.toolCallId ?? message?.source?.callId ?? '')
      if (id === '') continue
      results.set(id, {
        text: messageText(message),
        tokens: estimateMessage(message),
        isError: message?.isError === true,
        time: Number(event.time ?? 0) || undefined,
      })
    }
  }

  const items = []
  const byCall = new Map()
  const started = new Set()
  const push = (entry) => {
    items.push(entry)
    return entry
  }
  const callInfo = (id) => callBlocks.get(id) ?? callEvents.get(id)
  const callTokens = (info) => {
    if (Number.isFinite(Number(info?.tokens)) && Number(info.tokens) > 0) return Number(info.tokens)
    return Math.ceil((String(info?.name ?? '').length + String(info?.arguments ?? '').length) / CHARS_PER_TOKEN) + BLOCK_OVERHEAD
  }
  const startCall = (id, info) => {
    if (started.has(id)) return byCall.get(id)
    const tokens = callTokens(info)
    const entry = {
      id: `tool:${id}`,
      role: 'tool',
      callId: id,
      toolName: String(info?.name ?? ''),
      toolArguments: String(info?.arguments ?? '').slice(0, MESSAGE_TEXT_LIMIT),
      text: '',
      status: 'pending',
      ...(info?.time === undefined ? {} : { startedAt: info.time, time: info.time }),
      callTokens: tokens,
      tokens,
    }
    started.add(id)
    byCall.set(id, entry)
    push(entry)
    return entry
  }

  for (const event of events) {
    const message = eventMessage(event)
    if (event.type === 'user/message' || event.type === 'developer/message') {
      const text = messageText(message)
      if (text === '') continue
      const role = event.type === 'user/message' ? 'user' : 'system'
      push({
        id: `${role}:${event.seq}`,
        role,
        seq: Number(event.seq),
        ...(Number(event.time ?? 0) ? { time: Number(event.time) } : {}),
        text: text.slice(0, MESSAGE_TEXT_LIMIT),
        tokens: estimateMessage(message),
      })
      continue
    }
    if (event.type === 'assistant/message') {
      const content = message?.content ?? []
      const nonTool = content.filter((block) => block?.type !== 'tool-call')
      const text = messageText({ content: nonTool })
      const reasoning = reasoningText({ content: nonTool })
      if (text !== '' || reasoning !== '') {
        push({
          id: `assistant:${event.seq}`,
          role: 'assistant',
          seq: Number(event.seq),
          ...(Number(event.time ?? 0) ? { time: Number(event.time) } : {}),
          text: text.slice(0, MESSAGE_TEXT_LIMIT),
          ...(reasoning === '' ? {} : { reasoning: reasoning.slice(0, MESSAGE_TEXT_LIMIT) }),
          tokens: estimateMessage({ role: 'assistant', content: nonTool }),
        })
      }
      // Older logs may lack tool/call events; keep the assistant block as the call source.
      for (const block of content) {
        if (block?.type !== 'tool-call') continue
        const id = String(block.id ?? '')
        if (id === '' || callEvents.has(id)) continue
        startCall(id, callBlocks.get(id))
      }
      continue
    }
    if (event.type === 'tool/call') {
      const id = String(event.data?.callId ?? '')
      if (id === '' || started.has(id)) continue
      const info = callInfo(id)
      startCall(id, {
        ...info,
        name: info?.name ?? event.data?.name,
        arguments: info?.arguments ?? event.data?.arguments,
        time: Number(event.time ?? 0) || info?.time,
      })
      continue
    }
    if (event.type === 'tool/result') {
      const id = String(message?.toolCallId ?? message?.source?.callId ?? '')
      const result = results.get(id) ?? {
        text: messageText(message),
        tokens: estimateMessage(message),
        isError: message?.isError === true,
      }
      let entry = id === '' ? undefined : byCall.get(id)
      if (entry === undefined) {
        const info = callInfo(id)
        const tokens = callTokens(info)
        const startedAt = callEvents.get(id)?.time ?? info?.time
        entry = {
          id: id === '' ? `tool:result:${event.seq}` : `tool:${id}`,
          role: 'tool',
          ...(id === '' ? {} : { callId: id }),
          toolName: String(info?.name ?? ''),
          toolArguments: String(info?.arguments ?? '').slice(0, MESSAGE_TEXT_LIMIT),
          text: '',
          status: result.isError === true ? 'error' : 'ok',
          ...(result.isError === true ? { isError: true } : {}),
          ...(startedAt === undefined
            ? (result.time === undefined ? {} : { time: result.time })
            : { startedAt, time: startedAt }),
          callTokens: tokens,
          tokens,
        }
        if (id !== '') {
          started.add(id)
          byCall.set(id, entry)
        }
        push(entry)
      }
      entry.text = result.text.slice(0, MESSAGE_TEXT_LIMIT)
      entry.tokens = Number(entry.callTokens ?? 0) + Number(result.tokens ?? 0)
      entry.status = result.isError === true ? 'error' : 'ok'
      if (result.isError === true) entry.isError = true
      if (entry.startedAt !== undefined && result.time !== undefined) {
        entry.durationMs = Math.max(0, Number(result.time) - Number(entry.startedAt))
      }
    }
  }
  return items
}

/** Last `limit` entries ending at `before` (an entry index), plus page metadata. */
export function messagePage(events, options = {}) {
  const requested = Math.floor(Number(options.limit))
  const limit = Number.isFinite(requested) && requested > 0
    ? Math.min(requested, MESSAGE_PAGE_MAX)
    : MESSAGE_PAGE_DEFAULT
  const entries = buildMessageEntries(events)
  const requestedBefore = Math.floor(Number(options.before))
  const before = options.before === undefined || !Number.isFinite(requestedBefore)
    ? entries.length
    : Math.max(0, Math.min(requestedBefore, entries.length))
  const start = Math.max(0, before - limit)
  return {
    messages: entries.slice(start, before),
    total: entries.length,
    hasMore: start > 0,
    nextBefore: start,
  }
}

export function recentMessages(events, options = {}) {
  return messagePage(events, options).messages
}

export function messageTotal(events) {
  return buildMessageEntries(events).length
}

/** Every durable image/file block in the session log, in event order. */
function allAttachmentItems(events) {
  const items = []
  for (const event of events) {
    for (const block of eventMessage(event)?.content ?? []) {
      if (block?.type === 'image') {
        const image = block.attachment ?? {}
        items.push({
          kind: 'image',
          tokens: estimateStructuralBlock(block),
          name: String(image.name ?? 'image'),
          mimeType: String(image.mediaType ?? ''),
          width: Number(image.width ?? 0),
          height: Number(image.height ?? 0),
          bytes: Number(image.bytes ?? 0),
          attachmentId: String(image.attachmentId ?? ''),
        })
      } else if (block?.type === 'file') {
        const file = block.attachment ?? {}
        // FileAttachmentRef carries only attachmentId/name/bytes; the MIME
        // type is derived from the sanitized display filename.
        items.push({
          kind: 'file',
          tokens: estimateStructuralBlock(block),
          name: String(file.name ?? 'file'),
          mimeType: mimeOf(file.name),
          bytes: Number(file.bytes ?? 0),
          attachmentId: String(file.attachmentId ?? ''),
        })
      }
    }
  }
  return items
}

export function attachmentItems(events) {
  return allAttachmentItems(events).slice(-60).map((item, index) => ({ ...item, index }))
}

/** Same display window as `attachmentItems`, without pricing every block. */
export function attachmentCount(events) {
  let count = 0
  for (const event of events) {
    for (const block of eventMessage(event)?.content ?? []) {
      if (block?.type === 'image' || block?.type === 'file') count += 1
    }
  }
  return Math.min(60, count)
}

const TEXT_EXTENSIONS = new Set([
  '.md', '.markdown', '.txt', '.json', '.jsonl', '.yaml', '.yml', '.toml', '.ini',
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.css', '.scss', '.less', '.html',
  '.htm', '.xml', '.svg', '.sh', '.bash', '.zsh', '.py', '.rb', '.go', '.rs',
  '.java', '.c', '.h', '.cpp', '.hpp', '.sql', '.log', '.csv', '.tsv',
])

function mimeOf(name) {
  const ext = extname(String(name)).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.md' || ext === '.markdown') return 'text/markdown'
  if (ext === '.json') return 'application/json'
  return TEXT_EXTENSIONS.has(ext) ? 'text/plain' : 'application/octet-stream'
}

const MAX_PREVIEW_BYTES = 12 * 1024 * 1024
const MAX_ATTACHMENT_ID_LENGTH = 200

/** Attachment ids are opaque storage identifiers; only ids seen in the session are read. */
export function isAttachmentId(value) {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= MAX_ATTACHMENT_ID_LENGTH
    && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)
}

const decoded = (buffer, name) => Buffer.from(buffer).toString(name)

/** Read one verbatim stored file through the attachment store, bounded by the preview limit. */
async function readStoredFile(attachments, ref, signal) {
  const chunks = []
  let total = 0
  for await (const chunk of attachments.readFileStream(ref, signal)) {
    total += chunk.byteLength
    if (total > MAX_PREVIEW_BYTES) return { ok: false, error: 'attachment-too-large' }
    chunks.push(chunk)
  }
  return { ok: true, buffer: Buffer.concat(chunks, total) }
}

/**
 * Resolve one durable attachment to previewable content through the
 * `attachments` service. The session's own references are the only input;
 * filesystem paths from events are never followed.
 */
export async function readAttachmentContent(item, attachments, signal) {
  if (!isAttachmentId(item?.attachmentId)) return { ok: false, error: 'attachment-not-found' }
  if (attachments === undefined || attachments === null) return { ok: false, error: 'attachments-unavailable' }
  const expectedBytes = Number(item.bytes ?? 0)
  if (Number.isFinite(expectedBytes) && expectedBytes > MAX_PREVIEW_BYTES) {
    return { ok: false, error: 'attachment-too-large' }
  }
  const base = {
    name: item.name,
    mimeType: item.mimeType ?? '',
    bytes: expectedBytes,
    width: item.width,
    height: item.height,
  }
  try {
    if (item.kind === 'image') {
      if (typeof attachments.readImage !== 'function') return { ok: false, error: 'attachments-unavailable' }
      const stored = await attachments.readImage({
        attachmentId: item.attachmentId,
        mediaType: item.mimeType,
        bytes: expectedBytes,
        width: Number(item.width ?? 0),
        height: Number(item.height ?? 0),
        name: item.name,
      }, signal)
      const data = stored?.data
      if (data === undefined) return { ok: false, error: 'attachment-read-failed' }
      if (data.byteLength > MAX_PREVIEW_BYTES) return { ok: false, error: 'attachment-too-large' }
      const mime = item.mimeType !== '' ? item.mimeType : String(stored?.ref?.mediaType ?? 'image/png')
      return {
        ok: true,
        kind: 'image',
        ...base,
        mimeType: mime,
        bytes: data.byteLength,
        dataUrl: `data:${mime};base64,${decoded(data, 'base64')}`,
      }
    }
    if (typeof attachments.readFileStream !== 'function') return { ok: false, error: 'attachments-unavailable' }
    const ref = { attachmentId: item.attachmentId, name: String(item.name ?? 'file'), bytes: expectedBytes }
    const read = await readStoredFile(attachments, ref, signal)
    if (!read.ok) return read
    const buffer = read.buffer
    const mime = item.mimeType !== '' && item.mimeType !== undefined ? item.mimeType : mimeOf(item.name)
    const ext = extname(String(item.name ?? '')).toLowerCase()
    if (mime.startsWith('image/')) {
      return {
        ok: true,
        kind: 'image',
        ...base,
        mimeType: mime,
        bytes: buffer.byteLength,
        dataUrl: `data:${mime};base64,${buffer.toString('base64')}`,
      }
    }
    if (mime.startsWith('text/') || TEXT_EXTENSIONS.has(ext) || mime === 'application/json') {
      return { ok: true, kind: 'text', ...base, mimeType: mime, bytes: buffer.byteLength, text: buffer.toString('utf8') }
    }
    return { ok: true, kind: 'binary', ...base, mimeType: mime, bytes: buffer.byteLength }
  } catch {
    if (signal?.aborted === true) return { ok: false, error: 'aborted' }
    return { ok: false, error: 'attachment-read-failed' }
  }
}

const SKILLS_DEADLINE_MS = 4000

/** Bound skill discovery with the request signal plus a wall-clock deadline. */
function boundedSignal(signal, timeoutMs) {
  const timeout = typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(timeoutMs) : undefined
  if (timeout === undefined) return signal
  if (signal === undefined || signal === null) return timeout
  return typeof AbortSignal.any === 'function' ? AbortSignal.any([signal, timeout]) : timeout
}

const SKILL_SUMMARY_TTL_MS = 15000
const SKILL_BODY_TTL_MS = 30000
const skillSummaryCache = new WeakMap()
const skillBodyCache = new WeakMap()

/** Bounded skill summaries; shared by the list endpoint and the count endpoint. */
async function listSkillSummaries(skills, cwd, options = {}) {
  if (skills?.list === undefined) return []
  const key = String(cwd ?? '')
  let byCwd
  if (typeof skills === 'object' && skills !== null) {
    byCwd = skillSummaryCache.get(skills)
    if (byCwd === undefined) {
      byCwd = new Map()
      skillSummaryCache.set(skills, byCwd)
    }
    const cached = byCwd.get(key)
    if (cached !== undefined && Date.now() - cached.at < SKILL_SUMMARY_TTL_MS) return cached.summaries
  }
  const signal = boundedSignal(options.signal, options.timeoutMs ?? SKILLS_DEADLINE_MS)
  try {
    const listed = await skills.list({ cwd, signal })
    const summaries = Array.isArray(listed) ? listed.slice(0, 40) : []
    if (byCwd !== undefined) byCwd.set(key, { at: Date.now(), summaries })
    return summaries
  } catch {
    return []
  }
}

/** Skills injected into this workspace, with their full body for inspection. */
export async function skillsContent(skills, cwd, options = {}) {
  if (skills?.get === undefined) return []
  const summaries = await listSkillSummaries(skills, cwd, options)
  const signal = boundedSignal(options.signal, options.timeoutMs ?? SKILLS_DEADLINE_MS)
  let bodies
  if (typeof skills === 'object' && skills !== null) {
    bodies = skillBodyCache.get(skills)
    if (bodies === undefined) {
      bodies = new Map()
      skillBodyCache.set(skills, bodies)
    }
  }
  const items = []
  for (const summary of summaries) {
    if (signal?.aborted === true) break
    const cacheKey = `${String(cwd ?? '')}\u0000${String(summary.name ?? '')}`
    const cached = bodies?.get(cacheKey)
    let content = ''
    if (cached !== undefined && Date.now() - cached.at < SKILL_BODY_TTL_MS) {
      content = cached.content
    } else {
      try {
        const full = await skills.get(summary.name, { cwd, signal })
        content = String(full?.content ?? '')
        bodies?.set(cacheKey, { at: Date.now(), content })
      } catch {
        // One unreadable skill must not blank the whole category.
        content = ''
      }
    }
    items.push({
      name: summary.name,
      description: String(summary.description ?? ''),
      source: String(summary.source ?? ''),
      provider: String(summary.provider ?? ''),
      tokens: Math.ceil(String(summary.description ?? '').length / CHARS_PER_TOKEN),
      content,
    })
  }
  return items
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

function contextRoute(getSession, getSkills) {
  const CATEGORIES = new Set(['system', 'systemTools', 'mcpTools', 'messages', 'attachments', 'skills'])
  const histories = new Map()
  const snapshots = new Map()

  const historyOf = (sessionId, events) => {
    const lastSeq = events.length === 0 ? 0 : Number(events[events.length - 1].seq ?? 0)
    const cached = histories.get(sessionId)
    if (cached !== undefined && cached.length === events.length && cached.lastSeq === lastSeq) return cached
    const entry = { length: events.length, lastSeq, steps: historySteps(events) }
    histories.set(sessionId, entry)
    while (histories.size > 64) histories.delete(histories.keys().next().value)
    return entry
  }

  const summaryOf = (sessionId, step, events) => {
    const key = `${sessionId}:${step.cut}`
    const cached = snapshots.get(key)
    if (cached !== undefined) {
      snapshots.delete(key)
      snapshots.set(key, cached)
      return cached
    }
    const state = foldDetailedUntil(events, step.cut)
    const until = eventsUntil(events, step.cut)
    const summary = {
      breakdown: state.breakdown,
      messages: messageTotal(until),
      attachments: attachmentCount(until),
    }
    snapshots.set(key, summary)
    while (snapshots.size > 32) snapshots.delete(snapshots.keys().next().value)
    return summary
  }

  return {
    path: '/api/context-bar.ui',
    methods: ['GET'],
    requestBody: 'buffered',
    async fetch(request) {
      const url = new URL(request.url)
      const sessionId = url.searchParams.get('sessionId') ?? ''
      const category = url.searchParams.get('category') ?? ''
      if (sessionId === '') return jsonResponse({ ok: false, error: 'bad-session-id' }, 400)
      if (!['counts', 'history', 'diff', 'export', 'message', 'search'].includes(category) && !CATEGORIES.has(category)) {
        return jsonResponse({ ok: false, error: 'bad-category' }, 400)
      }
      const atParam = url.searchParams.get('at')
      let at
      if (atParam !== null) {
        if (!/^\d+$/.test(atParam)) return jsonResponse({ ok: false, error: 'bad-at' }, 400)
        at = Number(atParam)
      }
      const limitParam = url.searchParams.get('limit')
      let limit
      if (limitParam !== null) {
        if (!/^\d+$/.test(limitParam) || Number(limitParam) < 1) return jsonResponse({ ok: false, error: 'bad-limit' }, 400)
        limit = Number(limitParam)
      }
      const beforeParam = url.searchParams.get('before')
      let before
      if (beforeParam !== null) {
        if (!/^\d+$/.test(beforeParam)) return jsonResponse({ ok: false, error: 'bad-before' }, 400)
        before = Number(beforeParam)
      }
      const fromParam = url.searchParams.get('from')
      let from
      if (fromParam !== null) {
        if (!/^\d+$/.test(fromParam)) return jsonResponse({ ok: false, error: 'bad-from' }, 400)
        from = Number(fromParam)
      }
      const session = getSession(sessionId)
      if (session === undefined) return jsonResponse({ ok: false, error: 'session-not-found' }, 404)
      try {
        const events = session.snapshotEvents()
        const history = historyOf(sessionId, events)
        if (category === 'history') {
          return jsonResponse({
            ok: true,
            category,
            kind: 'history',
            steps: history.steps.slice(-HISTORY_WINDOW),
            total: history.steps.length,
          })
        }
        if (category === 'search') {
          const query = (url.searchParams.get('q') ?? '').trim()
          if (query === '' || query.length > 200) return jsonResponse({ ok: false, error: 'bad-query' }, 400)
          const searchLimit = Math.min(limit ?? 30, 50)
          const offsetParam = url.searchParams.get('offset')
          let offset = 0
          if (offsetParam !== null) {
            if (!/^\d+$/.test(offsetParam)) return jsonResponse({ ok: false, error: 'bad-offset' }, 400)
            offset = Number(offsetParam)
          }
          const rolesParam = url.searchParams.get('roles')
          let roles
          if (rolesParam !== null) {
            const allowed = new Set(['user', 'assistant', 'tool', 'system'])
            const items = rolesParam === '' ? [] : rolesParam.split(',').map((role) => role.trim()).filter((role) => role !== '')
            if (items.some((role) => !allowed.has(role))) return jsonResponse({ ok: false, error: 'bad-roles' }, 400)
            roles = new Set(items)
          }
          const kindsParam = url.searchParams.get('kinds')
          let kinds
          if (kindsParam !== null) {
            const allowed = new Set(['message', 'system', 'tool', 'skill'])
            const items = kindsParam === '' ? [] : kindsParam.split(',').map((kind) => kind.trim()).filter((kind) => kind !== '')
            if (items.some((kind) => !allowed.has(kind))) return jsonResponse({ ok: false, error: 'bad-kinds' }, 400)
            kinds = new Set(items)
          }
          const wants = (kind) => kinds === undefined || kinds.has(kind)
          const liveEvents = eventsUntil(events, Number.POSITIVE_INFINITY)
          const entries = allMessages(liveEvents)
          const needle = query.toLowerCase()
          const matched = []
          if (wants('message')) for (const entry of entries) {
            if (roles !== undefined && !roles.has(String(entry.role ?? ''))) continue
            const haystack = [entry.toolName, entry.toolArguments, entry.text, entry.reasoning]
              .filter((value) => typeof value === 'string')
              .join('\n')
              .toLowerCase()
            if (haystack.includes(needle)) matched.push(entry)
          }
          const withStep = (entry) => {
            let lo = 0
            let hi = history.steps.length
            while (lo < hi) {
              const mid = (lo + hi) >> 1
              if (history.steps[mid].cut >= entry.seq) hi = mid
              else lo = mid + 1
            }
            return history.steps[lo]
          }
          const messageResults = matched.slice().reverse().map((entry) => {
            const step = withStep(entry)
            return {
              ...messageSummary(entry),
              kind: 'message',
              category: 'messages',
              at: step === undefined ? null : step.at,
              turn: step === undefined ? null : step.turn,
              step: step === undefined ? null : step.step,
            }
          })
          const contextResults = []
          const systemText = latestSystemPrompt(liveEvents)
          if (wants('system') && systemText.toLowerCase().includes(needle)) {
            contextResults.push({
              id: 'system:current',
              seq: null,
              role: 'system',
              kind: 'system',
              category: 'system',
              preview: clipPreview(systemText),
              tokens: 0,
              at: null,
              turn: null,
              step: null,
            })
          }
          const seenTools = new Set()
          if (wants('tool')) for (const tool of latestHeader(liveEvents)?.tools ?? []) {
            const name = String(tool?.function?.name ?? tool?.name ?? '')
            if (name === '' || seenTools.has(name)) continue
            seenTools.add(name)
            if (!JSON.stringify(tool).toLowerCase().includes(needle)) continue
            contextResults.push({
              id: `tool:${name}`,
              seq: null,
              role: 'tool',
              toolName: name,
              kind: 'tool',
              category: name.startsWith(MCP_TOOL_PREFIX) ? 'mcpTools' : 'systemTools',
              preview: clipPreview(`${name} — ${String(tool?.function?.description ?? tool?.description ?? '')}`),
              tokens: 0,
              at: null,
              turn: null,
              step: null,
            })
          }
          const skillItems = wants('skill') ? await skillsContent(getSkills(), session.header?.cwd, { signal: request.signal }) : []
          for (const skill of skillItems) {
            const haystack = `${skill.name}\n${skill.description}\n${skill.content}`.toLowerCase()
            if (!haystack.includes(needle)) continue
            contextResults.push({
              id: `skill:${skill.name}`,
              seq: null,
              role: 'skill',
              toolName: skill.name,
              kind: 'skill',
              category: 'skills',
              preview: clipPreview(`${skill.name} — ${skill.description}`),
              tokens: Number(skill.tokens ?? 0),
              at: null,
              turn: null,
              step: null,
            })
          }
          const ordered = [...contextResults, ...messageResults]
          const page = ordered.slice(offset, offset + searchLimit)
          return jsonResponse({
            ok: true,
            category,
            kind: 'search',
            query,
            total: ordered.length,
            offset,
            nextOffset: offset + page.length < ordered.length ? offset + page.length : null,
            results: page,
          })
        }
        let step
        let until = eventsUntil(events, Number.POSITIVE_INFINITY)
        if (at !== undefined) {
          step = history.steps.find((entry) => entry.at === at)
          if (step === undefined) return jsonResponse({ ok: false, error: 'bad-at' }, 400)
          until = eventsUntil(events, step.cut)
        }
        if (category === 'message') {
          const messageId = url.searchParams.get('id') ?? ''
          if (messageId === '' || messageId.length > 240) return jsonResponse({ ok: false, error: 'bad-id' }, 400)
          if (url.searchParams.get('scope') === 'all') {
            const messages = allMessages(eventsUntil(events, Number.POSITIVE_INFINITY))
            const message = messages.find((entry) => String(entry.id ?? '') === messageId) ?? null
            return jsonResponse({
              ok: true,
              category,
              kind: 'message',
              scope: 'all',
              at: null,
              from: null,
              message,
              previous: null,
            })
          }
          const target = step ?? history.steps.at(-1)
          if (target === undefined) return jsonResponse({ ok: false, error: 'bad-at' }, 400)
          const targetMessages = allMessages(eventsUntil(events, target.cut))
          const message = targetMessages.find((entry) => String(entry.id ?? '') === messageId) ?? null
          let previous = null
          if (from !== undefined) {
            const fromStep = history.steps.find((entry) => entry.at === from)
            if (fromStep === undefined) return jsonResponse({ ok: false, error: 'bad-from' }, 400)
            const fromMessages = allMessages(eventsUntil(events, fromStep.cut))
            previous = fromMessages.find((entry) => String(entry.id ?? '') === messageId) ?? null
          }
          return jsonResponse({
            ok: true,
            category,
            kind: 'message',
            at: target.at,
            from: from ?? null,
            message,
            previous,
          })
        }
        if (category === 'diff') {
          const target = step ?? history.steps.at(-1)
          if (target === undefined) {
            return jsonResponse({ ok: true, category, kind: 'diff', at: null, from: null })
          }
          const targetIndex = history.steps.indexOf(target)
          const previous = from !== undefined
            ? history.steps.find((entry) => entry.at === from)
            : targetIndex > 0 ? history.steps[targetIndex - 1] : undefined
          if (from !== undefined && previous === undefined) {
            return jsonResponse({ ok: false, error: 'bad-from' }, 400)
          }
          if (previous === undefined) {
            return jsonResponse({
              ok: true,
              category,
              kind: 'diff',
              at: target.at,
              from: null,
              turn: target.turn,
              step: target.step,
              categories: [],
              tools: { added: [], removed: [], changed: [] },
              attachments: { added: [], removed: [] },
              messages: { addedCount: 0, removedCount: 0, changedCount: 0, added: [], removed: [], changed: [] },
              systemChanged: false,
              compactionBetween: false,
            })
          }
          const fromUntil = eventsUntil(events, previous.cut)
          const toUntil = eventsUntil(events, target.cut)
          const fromState = foldDetailedUntil(events, previous.cut)
          const toState = foldDetailedUntil(events, target.cut)
          const fields = {
            messages: 'messageTokens',
            attachments: 'attachmentTokens',
            systemTools: 'systemToolsTokens',
            mcpTools: 'mcpToolsTokens',
            system: 'systemTokens',
          }
          const fromCounts = {
            messages: messageTotal(fromUntil),
            attachments: attachmentCount(fromUntil),
            systemTools: fromState.breakdown.systemToolsCount,
            mcpTools: fromState.breakdown.mcpToolsCount,
          }
          const toCounts = {
            messages: messageTotal(toUntil),
            attachments: attachmentCount(toUntil),
            systemTools: toState.breakdown.systemToolsCount,
            mcpTools: toState.breakdown.mcpToolsCount,
          }
          const categories = Object.keys(fields).map((key) => {
            const field = fields[key]
            const fromTokens = Number(fromState.breakdown[field] ?? 0)
            const toTokens = Number(toState.breakdown[field] ?? 0)
            return {
              key,
              from: fromTokens,
              to: toTokens,
              delta: toTokens - fromTokens,
              fromCount: fromCounts[key],
              toCount: toCounts[key],
            }
          })
          const fromToolMap = toolSchemaMap(latestHeader(fromUntil))
          const toToolMap = toolSchemaMap(latestHeader(toUntil))
          const fromTools = [...fromToolMap.keys()].sort()
          const toTools = [...toToolMap.keys()].sort()
          const changedTools = toTools.filter((name) => fromToolMap.has(name) && fromToolMap.get(name) !== toToolMap.get(name))
          const fromSystem = latestSystemPrompt(fromUntil)
          const toSystem = latestSystemPrompt(toUntil)
          const fromAttachments = attachmentItems(fromUntil)
          const toAttachments = attachmentItems(toUntil)
          const attachmentKey = (item) => (item.attachmentId !== '' ? item.attachmentId : `${item.name}:${item.kind}`)
          const fromAttachmentKeys = new Set(fromAttachments.map(attachmentKey))
          const toAttachmentKeys = new Set(toAttachments.map(attachmentKey))
          const fromMessages = allMessages(fromUntil)
          const toMessages = allMessages(toUntil)
          const messageKey = (message) => (message.id === '' || message.id === undefined
            ? `${message.seq}:${message.role}`
            : String(message.id))
          const fromMessageMap = new Map(fromMessages.map((message) => [messageKey(message), message]))
          const toMessageMap = new Map(toMessages.map((message) => [messageKey(message), message]))
          const addedMessages = toMessages.filter((message) => !fromMessageMap.has(messageKey(message)))
          const removedMessages = fromMessages.filter((message) => !toMessageMap.has(messageKey(message)))
          const changedMessages = toMessages.filter((message) => {
            const before = fromMessageMap.get(messageKey(message))
            return before !== undefined && messageSignature(before) !== messageSignature(message)
          })
          const categorizedFrom = categories.reduce((sum, categoryItem) => sum + categoryItem.from, 0)
          const categorizedTo = categories.reduce((sum, categoryItem) => sum + categoryItem.to, 0)
          const fromTotal = previous.promptTokens ?? categorizedFrom
          const toTotal = target.promptTokens ?? categorizedTo
          const normalizeSide = (list, key, total) => {
            const sum = list.reduce((acc, item) => acc + Number(item[key] ?? 0), 0)
            if (!(sum > 0) || !(total > 0)) return list.map((item) => ({ ...item }))
            const factor = Number(total) / sum
            const scaled = list.map((item) => ({ ...item, [key]: Math.max(0, Math.round(Number(item[key] ?? 0) * factor)) }))
            const delta = Number(total) - scaled.reduce((acc, item) => acc + Number(item[key] ?? 0), 0)
            if (delta !== 0 && scaled.length > 0) {
              const target = scaled.reduce((best, item) => (item[key] > best[key] ? item : best), scaled[0])
              target[key] = Math.max(0, target[key] + delta)
            }
            return scaled
          }
          const normalized = normalizeSide(normalizeSide(categories, 'from', fromTotal), 'to', toTotal)
            .map((item) => ({ ...item, delta: item.to - item.from }))
          const compactionBetween = events.some((event) => {
            if (event.type !== 'compaction/summary' && event.type !== 'compaction/prune') return false
            const seq = Number(event.seq)
            return seq > previous.cut && seq <= target.cut
          })
          const beforeCompaction = compactionBefore(history.steps, events, target)
          return jsonResponse({
            ok: true,
            category,
            kind: 'diff',
            at: target.at,
            from: previous.at,
            turn: target.turn,
            step: target.step,
            fromTurn: previous.turn,
            fromStep: previous.step,
            ...(target.promptTokens === undefined ? {} : { promptTokens: target.promptTokens }),
            ...(previous.promptTokens === undefined ? {} : { fromPromptTokens: previous.promptTokens }),
            totalDelta: toTotal - fromTotal,
            total: { from: fromTotal, to: toTotal },
            categories: normalized,
            tools: {
              added: toTools.filter((name) => !fromTools.includes(name)),
              removed: fromTools.filter((name) => !toTools.includes(name)),
              changed: changedTools,
            },
            attachments: {
              added: toAttachments
                .filter((item) => !fromAttachmentKeys.has(attachmentKey(item)))
                .map((item) => ({ name: item.name, kind: item.kind })),
              removed: fromAttachments
                .filter((item) => !toAttachmentKeys.has(attachmentKey(item)))
                .map((item) => ({ name: item.name, kind: item.kind })),
            },
            messages: {
              addedCount: addedMessages.length,
              removedCount: removedMessages.length,
              changedCount: changedMessages.length,
              added: addedMessages.slice(0, 30).map(messageSummary),
              removed: removedMessages.slice(0, 30).map(messageSummary),
              changed: changedMessages.slice(0, 30).map(messageSummary),
            },
            systemChanged: fromSystem !== toSystem,
            ...(fromSystem === toSystem ? {} : { systemBefore: fromSystem, systemAfter: toSystem }),
            compactionBetween,
            ...(beforeCompaction === undefined ? {} : { compactionBeforeAt: beforeCompaction }),
          })
        }
        if (category === 'export') {
          const target = step
          const cut = target === undefined
            ? (events.length === 0 ? 0 : Number(events[events.length - 1].seq ?? 0))
            : target.cut
          const until = eventsUntil(events, cut)
          const state = foldDetailedUntil(events, cut)
          const header = latestHeader(until)
          const latestContext = [...events].reverse().find((event) => event.type === 'request/context')?.data
          return jsonResponse({
            ok: true,
            category,
            kind: 'export',
            exportedAt: new Date().toISOString(),
            at: target === undefined ? null : target.at,
            step: target === undefined
              ? null
              : {
                at: target.at,
                cut: target.cut,
                turn: target.turn,
                step: target.step,
                time: target.time,
                ...(target.promptTokens === undefined ? {} : { promptTokens: target.promptTokens }),
              },
            window: target?.window ?? latestContext?.contextWindow,
            model: target?.model ?? latestContext?.model,
            breakdown: state.breakdown,
            counts: {
              messages: messageTotal(until),
              attachments: attachmentCount(until),
              systemTools: state.breakdown.systemToolsCount,
              mcpTools: state.breakdown.mcpToolsCount,
            },
            system: latestSystemPrompt(until),
            tools: { system: toolContent(header, false), mcp: toolContent(header, true) },
            messages: allMessages(until),
            attachments: attachmentItems(until),
            skills: null,
          })
        }
        if (category === 'counts') {
          const summaries = await listSkillSummaries(getSkills(), session.header?.cwd, { signal: request.signal })
          if (step === undefined) {
            return jsonResponse({
              ok: true,
              category,
              kind: 'counts',
              counts: {
                messages: messageTotal(until),
                attachments: attachmentCount(until),
                skills: summaries.length,
              },
            })
          }
          const summary = summaryOf(sessionId, step, events)
          return jsonResponse({
            ok: true,
            category,
            kind: 'counts',
            historical: true,
            at,
            cut: step.cut,
            turn: step.turn,
            step: step.step,
            window: step.window,
            ...(step.promptTokens === undefined ? {} : { promptTokens: step.promptTokens }),
            breakdown: summary.breakdown,
            counts: {
              messages: summary.messages,
              attachments: summary.attachments,
              skills: summaries.length,
              systemTools: summary.breakdown.systemToolsCount,
              mcpTools: summary.breakdown.mcpToolsCount,
            },
          })
        }
        if (category === 'system') {
          return jsonResponse({ ok: true, category, kind: 'text', text: latestSystemPrompt(until) })
        }
        if (category === 'messages') {
          return jsonResponse({ ok: true, category, kind: 'messages', ...messagePage(until, { limit, before }) })
        }
        if (category === 'attachments') {
          return jsonResponse({ ok: true, category, kind: 'attachments', attachments: attachmentItems(until) })
        }
        if (category === 'skills') {
          // The skills registry is current-only: the session log does not record
          // per-step skill catalogs, so historical views are explicitly labelled.
          const items = await skillsContent(getSkills(), session.header?.cwd, { signal: request.signal })
          return jsonResponse({
            ok: true,
            category,
            kind: 'skills',
            skills: items,
            ...(at === undefined ? {} : { current: true, at }),
          })
        }
        const header = latestHeader(until)
        return jsonResponse({ ok: true, category, kind: 'tools', tools: toolContent(header, category === 'mcpTools') })
      } catch {
        // Never echo internal error text (it can carry absolute host paths).
        return jsonResponse({ ok: false, error: 'context-read-failed' }, 500)
      }
    },
  }
}

function attachmentRoute(getSession, getAttachments) {
  return {
    path: '/api/context-bar.file',
    methods: ['GET'],
    requestBody: 'buffered',
    async fetch(request) {
      const url = new URL(request.url)
      const sessionId = url.searchParams.get('sessionId') ?? ''
      const attachmentId = url.searchParams.get('attachmentId') ?? ''
      if (sessionId === '') return jsonResponse({ ok: false, error: 'bad-session-id' }, 400)
      if (!isAttachmentId(attachmentId)) return jsonResponse({ ok: false, error: 'bad-attachment-id' }, 400)
      const session = getSession(sessionId)
      if (session === undefined) return jsonResponse({ ok: false, error: 'session-not-found' }, 404)
      let item
      try {
        // Look up the whole log, not the 60-item display window: the id is the
        // stable key, so a late event can never shift the preview to another file.
        item = allAttachmentItems(session.snapshotEvents()).find((entry) => entry.attachmentId === attachmentId)
      } catch {
        return jsonResponse({ ok: false, error: 'context-read-failed' }, 500)
      }
      if (item === undefined) return jsonResponse({ ok: false, error: 'attachment-not-found' }, 404)
      const result = await readAttachmentContent(item, getAttachments(), request.signal)
      if (!result.ok) {
        const status = result.error === 'attachment-too-large' ? 413
          : result.error === 'attachments-unavailable' ? 501
            : result.error === 'aborted' ? 499
              : 502
        return jsonResponse({ ok: false, error: result.error }, status)
      }
      return jsonResponse({ ok: true, ...result })
    },
  }
}

function isSurfaceEvent(event) {
  return SURFACE_EVENT_TYPES.has(event.type) && event.surfaceOp !== undefined
}

function withoutClaim(state) {
  if (state.claim === undefined) return state
  const { claim: _expired, ...rest } = state
  return rest
}

function withTotals(state, systems, attachments, surfaceTokens) {
  const total = Math.max(0, surfaceTokens)
  const systemTokens = systems.findLast((node) => node.tokens > 0)?.tokens ?? 0
  const attachmentTokens = attachments.reduce((sum, node) => sum + node.tokens, 0)
  const messageTokens = Math.max(0, total - systemTokens - attachmentTokens)
  const breakdown = state.breakdown.systemTokens === systemTokens
    && state.breakdown.attachmentTokens === attachmentTokens
    && state.breakdown.messageTokens === messageTokens
    ? state.breakdown
    : { ...state.breakdown, systemTokens, attachmentTokens, messageTokens }
  return { ...state, systems, attachments, surfaceTokens: total, breakdown }
}

/**
 * Place one priced surface node, mirroring the token-meter's bounded fold:
 * system prompts and attachment-bearing nodes are tracked by seq; everything
 * else is a running total. A compaction-armed replacement subtracts the
 * shadow price and drops the shadowed seqs from both tracked lists.
 */
function placeSurfaceEvent(state, claim, event, tokens, attachmentTokens) {
  const op = event.surfaceOp
  const isSystem = event.type === 'system/message'
  const node = { seq: event.seq, tokens }
  const attachmentNode = attachmentTokens > 0 ? { seq: event.seq, tokens: attachmentTokens } : null
  if (op === 'append') {
    return {
      systems: isSystem ? [...state.systems, node] : state.systems,
      attachments: attachmentNode === null ? state.attachments : [...state.attachments, attachmentNode],
      surfaceTokens: state.surfaceTokens + tokens,
    }
  }
  if (claim !== undefined) {
    if (claim.start !== op.startSeq || claim.end !== op.endSeq) {
      throw new Error(
        `context breakdown detailed: replace at seq ${event.seq} over range ${op.startSeq}-${op.endSeq}`
        + ` has no adjacent shadow price (armed claim covers ${claim.start}-${claim.end})`,
      )
    }
    if (isSystem) {
      throw new Error(
        `context breakdown detailed: replace at seq ${event.seq} puts a system message in place of a metered range`,
      )
    }
    const shadowed = new Set(claim.systemSeqs)
    const shadowedAll = new Set(claim.seqs)
    return {
      systems: state.systems.filter((system) => !shadowed.has(system.seq)),
      attachments: state.attachments.filter((item) => !shadowedAll.has(item.seq)),
      surfaceTokens: state.surfaceTokens + tokens - claim.tokens,
    }
  }
  const index = op.startSeq === op.endSeq ? state.systems.findIndex((system) => system.seq === op.startSeq) : -1
  const replaced = state.systems[index]
  if (replaced === undefined) {
    // Unmetered non-system replacement: fold at zero delta, same as token-meter.
    return { systems: state.systems, attachments: state.attachments, surfaceTokens: state.surfaceTokens }
  }
  return {
    systems: isSystem ? state.systems.with(index, node) : state.systems.toSpliced(index, 1),
    attachments: state.attachments,
    surfaceTokens: state.surfaceTokens + tokens - replaced.tokens,
  }
}

const tokenCount = (value) => Number.isInteger(value) && value >= 0
const seqList = (value) => Array.isArray(value) && value.every((seq) => tokenCount(seq))
const nodeList = (value) => Array.isArray(value)
  && value.every((node) => tokenCount(node?.seq) && tokenCount(node?.tokens))

function parseClaim(claim) {
  if (typeof claim !== 'object' || claim === null) throw new Error('contextBreakdownDetailed: bad claim')
  if (!tokenCount(claim.start) || !tokenCount(claim.end) || !tokenCount(claim.tokens)) {
    throw new Error('contextBreakdownDetailed: bad claim range')
  }
  if (!seqList(claim.systemSeqs) || !seqList(claim.seqs)) {
    throw new Error('contextBreakdownDetailed: bad claim sequences')
  }
  return claim
}

/** Minimal structural validator; the registry only requires `parse`. */
function parseState(value) {
  if (typeof value !== 'object' || value === null) throw new Error('contextBreakdownDetailed: state is not an object')
  if (!nodeList(value.systems) || !nodeList(value.attachments)) throw new Error('contextBreakdownDetailed: bad node lists')
  if (!tokenCount(value.surfaceTokens)) throw new Error('contextBreakdownDetailed: bad surface total')
  if (value.claim !== undefined) parseClaim(value.claim)
  const breakdown = value.breakdown
  if (typeof breakdown !== 'object' || breakdown === null) throw new Error('contextBreakdownDetailed: bad breakdown')
  for (const key of ['systemTokens', 'systemToolsTokens', 'mcpToolsTokens', 'systemToolsCount', 'mcpToolsCount', 'messageTokens', 'attachmentTokens']) {
    if (!tokenCount(breakdown[key])) throw new Error(`contextBreakdownDetailed: bad ${key}`)
  }
  return value
}

function parseView(value) {
  if (typeof value !== 'object' || value === null) throw new Error('contextBreakdownDetailed: view is not an object')
  return value
}

const EMPTY_BREAKDOWN = Object.freeze({
  systemTokens: 0,
  systemToolsTokens: 0,
  mcpToolsTokens: 0,
  systemToolsCount: 0,
  mcpToolsCount: 0,
  messageTokens: 0,
  attachmentTokens: 0,
})

export const contextBreakdownDetailedProjection = {
  key: 'contextBreakdownDetailed',
  stateVersion: 2,
  stateSchema: { parse: parseState },
  init: () => ({
    systems: [],
    attachments: [],
    surfaceTokens: 0,
    breakdown: { ...EMPTY_BREAKDOWN },
  }),
  apply: (state, event) => {
    if (event.type === 'compaction/summary' || event.type === 'compaction/prune') {
      const shadowed = new Set(event.data?.shadowedSeqs ?? [])
      return {
        ...state,
        claim: {
          start: event.data.shadowedRange.start,
          end: event.data.shadowedRange.end,
          tokens: event.data.shadowedTokenCount,
          systemSeqs: state.systems.filter((system) => shadowed.has(system.seq)).map((system) => system.seq),
          seqs: [...shadowed],
        },
      }
    }
    const unclaimed = withoutClaim(state)
    if (event.type === 'request/header') {
      const tools = estimateToolSplit(event.data?.header)
      return tools.system === unclaimed.breakdown.systemToolsTokens
        && tools.mcp === unclaimed.breakdown.mcpToolsTokens
        && tools.systemCount === unclaimed.breakdown.systemToolsCount
        && tools.mcpCount === unclaimed.breakdown.mcpToolsCount
        ? unclaimed
        : {
            ...unclaimed,
            breakdown: {
              ...unclaimed.breakdown,
              systemToolsTokens: tools.system,
              mcpToolsTokens: tools.mcp,
              systemToolsCount: tools.systemCount,
              mcpToolsCount: tools.mcpCount,
            },
          }
    }
    if (!isSurfaceEvent(event)) return unclaimed
    const message = eventMessage(event)
    const tokens = estimateMessage(message)
    const attachments = estimateAttachmentTokens(message?.content)
    const placed = placeSurfaceEvent(unclaimed, state.claim, event, tokens, attachments)
    return withTotals(unclaimed, placed.systems, placed.attachments, placed.surfaceTokens)
  },
  wire: {
    viewSchema: { parse: parseView },
    view: (state) => state.breakdown,
  },
}

const HISTORY_WINDOW = 500

function assistantPromptTokens(event) {
  if (event?.type !== 'assistant/message') return undefined
  const usage = event.data?.usage
  if (usage === undefined || usage === null) return undefined
  const prompt = Number(usage.inputTokens ?? 0)
    + Number(usage.cacheReadTokens ?? 0)
    + Number(usage.cacheWriteTokens ?? 0)
  return Number.isFinite(prompt) ? prompt : undefined
}

/**
 * Pair each `step/start` with the assistant settlement that answers it.
 * The settlement reports the real prompt usage; the snapshot cut sits just
 * before it, so the prompt content and any in-step `request/header` change are
 * included but the reply itself is not.
 */
export function historySteps(events) {
  const steps = []
  let current = -1
  let compacted = false
  let context
  for (const event of events) {
    const type = event.type
    if (type === 'compaction/summary' || type === 'compaction/prune') {
      compacted = true
      continue
    }
    if (type === 'request/context') {
      context = event.data ?? {}
      if (current >= 0) {
        steps[current].window = context.contextWindow
        steps[current].model = context.model
        steps[current].provider = context.provider
      }
      continue
    }
    if (type === 'step/start') {
      steps.push({
        at: Number(event.seq),
        turn: Number(event.data?.turn ?? 0),
        step: Number(event.data?.step ?? 0),
        time: Number(event.time ?? 0),
        compacted,
        window: context?.contextWindow,
        model: context?.model,
        provider: context?.provider,
        settlement: undefined,
      })
      current = steps.length - 1
      continue
    }
    if (current >= 0 && type === 'assistant/message' && steps[current].settlement === undefined) {
      steps[current].settlement = event
    }
  }
  const lastSeq = events.length === 0 ? 0 : Number(events[events.length - 1].seq ?? 0)
  return steps.map((entry, index) => {
    const settlement = entry.settlement
    const next = steps[index + 1]
    const cut = settlement !== undefined
      ? Number(settlement.seq) - 1
      : next !== undefined ? next.at - 1 : lastSeq
    const { settlement: _settlement, ...rest } = entry
    return {
      ...rest,
      cut,
      ...(settlement === undefined ? {} : { promptTokens: assistantPromptTokens(settlement) }),
    }
  })
}

/** Fold the detailed projection up to one historical cut (inclusive). */
export function foldDetailedUntil(events, cut) {
  let state = contextBreakdownDetailedProjection.init()
  for (const event of events) {
    if (Number(event.seq) > cut) break
    state = contextBreakdownDetailedProjection.apply(state, event)
  }
  return state
}

function eventsUntil(events, cut) {
  const shadowed = new Set()
  for (const event of events) {
    if (Number(event.seq) > cut) break
    if (event.type === 'compaction/summary' || event.type === 'compaction/prune') {
      for (const seq of event.data?.shadowedSeqs ?? []) shadowed.add(Number(seq))
    }
  }
  return events.filter((event) => Number(event.seq) <= cut && !shadowed.has(Number(event.seq)))
}

/** Effective tool names in one header, both built-in and MCP. */
function toolSchemaMap(header) {
  const tools = Array.isArray(header?.tools) ? header.tools : []
  const map = new Map()
  for (const tool of tools) {
    const name = String(tool?.function?.name ?? tool?.name ?? '')
    if (name !== '') map.set(name, JSON.stringify(tool))
  }
  return map
}

/** The step just before the most recent compaction at or before `target`. */
function compactionBefore(steps, events, target) {
  let boundary
  for (const event of events) {
    if (event.type !== 'compaction/summary' && event.type !== 'compaction/prune') continue
    const seq = Number(event.seq)
    if (!Number.isFinite(seq) || seq > target.cut) continue
    if (boundary === undefined || seq > boundary) boundary = seq
  }
  if (boundary === undefined) return undefined
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    if (steps[index].at < boundary) return steps[index].at
  }
  return undefined
}

/** All classified rows, used by the snapshot export. */
export function allMessages(events) {
  return buildMessageEntries(events)
}

/** Compact, display-safe shape for a message diff row. */
function clipPreview(value, limit = 160) {
  const raw = String(value ?? '').replace(/\s+/g, ' ').trim()
  return raw.length > limit ? `${raw.slice(0, limit)}…` : raw
}

function messageSummary(message) {
  const source = [message.text, message.reasoning, message.toolArguments]
    .find((value) => typeof value === 'string' && value.trim() !== '')
  const raw = String(source ?? '').replace(/\s+/g, ' ').trim()
  return {
    id: String(message.id ?? ''),
    seq: message.seq,
    role: message.role,
    ...(message.toolName === undefined ? {} : { toolName: message.toolName }),
    ...(message.status === undefined ? {} : { status: message.status }),
    tokens: Number(message.tokens ?? 0),
    preview: raw.length > 160 ? `${raw.slice(0, 160)}…` : raw,
  }
}

function messageSignature(message) {
  return [
    message.text ?? '',
    message.reasoning ?? '',
    message.toolArguments ?? '',
    message.status ?? '',
    message.tokens ?? '',
  ].join('\u0000')
}

export function apply(ctx) {
  ctx.sessionProjections.register(contextBreakdownDetailedProjection)
  ctx.inject?.(['connection'], (uiCtx) => {
    const connection = uiCtx?.connection
    if (!connection?.fetch?.register) return
    const getSession = (sessionId) => ctx.get?.('sessions')?.get?.(sessionId)
    const getSkills = () => ctx.get?.('skills')
    const getAttachments = () => ctx.get?.('attachments')
    uiCtx.effect(
      () => connection.fetch.register(contextRoute(getSession, getSkills)),
      'context-bar/route',
    )
    uiCtx.effect(
      () => connection.fetch.register(attachmentRoute(getSession, getAttachments)),
      'context-bar/file-route',
    )
  })
}
