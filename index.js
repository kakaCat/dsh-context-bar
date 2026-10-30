/** Host half: detailed context-composition projection.
 *
 * Folds the same durable surface events as the token-meter's 3-bucket
 * `contextBreakdown`, but keeps Claude Code v2-style categories:
 * system prompt, system tools, MCP tools (`mcp__*` schemas), message text,
 * and file/image attachments. Heuristic prices mirror the token-meter's
 * fixed density estimator (chars/4 + block overheads), so figures are
 * display estimates, never billing data. No LLM calls, no polling: the
 * session-projection drive folds every committed event once.
 */

import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { extname, join } from 'node:path'

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
  if (!Array.isArray(tools) || tools.length === 0) return { system: 0, mcp: 0 }
  let systemChars = 0
  let mcpChars = 0
  for (const tool of tools) {
    const name = String(tool?.function?.name ?? tool?.name ?? '')
    const chars = JSON.stringify(tool).length
    if (name.startsWith(MCP_TOOL_PREFIX)) mcpChars += chars
    else systemChars += chars
  }
  return {
    system: systemChars === 0 ? 0 : Math.ceil(systemChars / CHARS_PER_TOKEN) + BLOCK_OVERHEAD,
    mcp: mcpChars === 0 ? 0 : Math.ceil(mcpChars / CHARS_PER_TOKEN) + BLOCK_OVERHEAD,
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
      parts.push(`[file] ${String(file.path ?? file.name ?? file.mimeType ?? '')}`)
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

export function recentMessages(events) {
  const items = []
  const callNames = new Map()
  for (const event of events) {
    for (const block of eventMessage(event)?.content ?? []) {
      if (block?.type === 'tool-call' && block.id !== undefined) callNames.set(String(block.id), String(block.name ?? ''))
    }
  }
  for (let i = events.length - 1; i >= 0 && items.length < 40; i -= 1) {
    const event = events[i]
    const role = event.type === 'user/message' ? 'user'
      : event.type === 'assistant/message' ? 'assistant'
        : event.type === 'tool/result' ? 'tool'
          : event.type === 'developer/message' ? 'system' : null
    if (role === null) continue
    const message = eventMessage(event)
    // Tool calls render as collapsible blocks; keep them out of the flat text.
    const text = messageText({ content: (message?.content ?? []).filter((block) => block?.type !== 'tool-call') })
    const toolCalls = (message?.content ?? [])
      .filter((block) => block?.type === 'tool-call')
      .map((block) => ({
        id: String(block.id ?? ''),
        name: String(block.name ?? ''),
        arguments: String(block.arguments ?? ''),
      }))
    const toolName = role === 'tool' ? callNames.get(String(message?.toolCallId ?? '')) : undefined
    if (text === '' && toolCalls.length === 0) continue
    items.push({
      role,
      text: text.slice(0, 6000),
      tokens: estimateMessage(message),
      ...(toolCalls.length === 0 ? {} : { toolCalls }),
      ...(toolName === undefined ? {} : { toolName }),
      ...(message?.isError === true ? { isError: true } : {}),
    })
  }
  return items.reverse()
}

export function attachmentItems(events) {
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
        items.push({
          kind: 'file',
          tokens: estimateStructuralBlock(block),
          name: String(file.name ?? file.path?.split('/').pop() ?? 'file'),
          path: String(file.path ?? ''),
          mimeType: String(file.mimeType ?? ''),
          bytes: Number(file.bytes ?? 0),
          attachmentId: String(file.attachmentId ?? ''),
        })
      }
    }
  }
  return items.slice(-60).map((item, index) => ({ ...item, index }))
}

/** Resolve one attachment object to its bytes on disk (content-addressed sha256). */
export function attachmentPath(attachmentId) {
  const hex = String(attachmentId).replace(/^sha256:/, '')
  if (!/^[0-9a-f]{64}$/i.test(hex)) return undefined
  const home = process.env.DSH_HOME ?? join(homedir(), '.dsh')
  return join(home, 'attachments', 'v1', 'objects', hex.slice(0, 2), hex)
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

export async function readAttachmentContent(item) {
  const path = item.path ? item.path : attachmentPath(item.attachmentId)
  if (path === undefined || path === '') return { ok: false, error: 'no-attachment-path' }
  let buffer
  try {
    buffer = await readFile(path)
  } catch (error) {
    return { ok: false, error: `read-failed: ${error?.code ?? error}` }
  }
  if (buffer.byteLength > MAX_PREVIEW_BYTES) return { ok: false, error: 'too-large' }
  const mime = item.mimeType !== '' ? item.mimeType : mimeOf(item.name)
  const base = {
    name: item.name,
    mimeType: mime,
    bytes: buffer.byteLength,
    width: item.width,
    height: item.height,
  }
  if (mime.startsWith('image/')) {
    return { ok: true, kind: 'image', ...base, dataUrl: `data:${mime};base64,${buffer.toString('base64')}` }
  }
  const ext = extname(String(item.name)).toLowerCase()
  if (mime.startsWith('text/') || TEXT_EXTENSIONS.has(ext) || mime === 'application/json') {
    return { ok: true, kind: 'text', ...base, text: buffer.toString('utf8') }
  }
  return { ok: true, kind: 'binary', ...base }
}

/** Skills injected into this workspace, with their full body for inspection. */
export async function skillsContent(skills, cwd) {
  if (skills?.list === undefined || skills?.get === undefined) return []
  const summaries = await skills.list({ cwd })
  const items = []
  for (const summary of summaries.slice(0, 40)) {
    let content = ''
    try {
      const full = await skills.get(summary.name, { cwd })
      content = String(full?.content ?? '')
    } catch {
      content = ''
    }
    items.push({
      name: summary.name,
      description: String(summary.description ?? ''),
      source: String(summary.source ?? ''),
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
  return {
    path: '/api/context-bar.ui',
    methods: ['GET'],
    requestBody: 'buffered',
    async fetch(request) {
      const url = new URL(request.url)
      const sessionId = url.searchParams.get('sessionId') ?? ''
      const category = url.searchParams.get('category') ?? ''
      if (!CATEGORIES.has(category)) return jsonResponse({ ok: false, error: 'bad-category' }, 400)
      const session = getSession(sessionId)
      if (session === undefined) return jsonResponse({ ok: false, error: 'session-not-found' }, 404)
      const events = session.snapshotEvents()
      try {
        if (category === 'system') {
          return jsonResponse({ ok: true, category, kind: 'text', text: latestSystemPrompt(events) })
        }
        if (category === 'messages') {
          return jsonResponse({ ok: true, category, kind: 'messages', messages: recentMessages(events) })
        }
        if (category === 'attachments') {
          return jsonResponse({ ok: true, category, kind: 'attachments', attachments: attachmentItems(events) })
        }
        if (category === 'skills') {
          const cwd = session.header?.cwd
          const items = await skillsContent(getSkills(), cwd)
          return jsonResponse({ ok: true, category, kind: 'skills', skills: items })
        }
        const header = latestHeader(events)
        return jsonResponse({ ok: true, category, kind: 'tools', tools: toolContent(header, category === 'mcpTools') })
      } catch (error) {
        return jsonResponse({ ok: false, error: String(error?.message ?? error) }, 500)
      }
    },
  }
}

function attachmentRoute(getSession) {
  return {
    path: '/api/context-bar.file',
    methods: ['GET'],
    requestBody: 'buffered',
    async fetch(request) {
      const url = new URL(request.url)
      const sessionId = url.searchParams.get('sessionId') ?? ''
      const index = Number(url.searchParams.get('index') ?? '-1')
      const session = getSession(sessionId)
      if (session === undefined) return jsonResponse({ ok: false, error: 'session-not-found' }, 404)
      const items = attachmentItems(session.snapshotEvents())
      const item = items[index]
      if (item === undefined) return jsonResponse({ ok: false, error: 'attachment-not-found' }, 404)
      try {
        const result = await readAttachmentContent(item)
        return jsonResponse({ ok: result.ok, index, ...result }, result.ok ? 200 : 500)
      } catch (error) {
        return jsonResponse({ ok: false, error: String(error?.message ?? error) }, 500)
      }
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
const nodeList = (value) => Array.isArray(value)
  && value.every((node) => tokenCount(node?.seq) && tokenCount(node?.tokens))

/** Minimal structural validator; the registry only requires `parse`. */
function parseState(value) {
  if (typeof value !== 'object' || value === null) throw new Error('contextBreakdownDetailed: state is not an object')
  if (!nodeList(value.systems) || !nodeList(value.attachments)) throw new Error('contextBreakdownDetailed: bad node lists')
  if (!tokenCount(value.surfaceTokens)) throw new Error('contextBreakdownDetailed: bad surface total')
  const breakdown = value.breakdown
  if (typeof breakdown !== 'object' || breakdown === null) throw new Error('contextBreakdownDetailed: bad breakdown')
  for (const key of ['systemTokens', 'systemToolsTokens', 'mcpToolsTokens', 'messageTokens', 'attachmentTokens']) {
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
  messageTokens: 0,
  attachmentTokens: 0,
})

export const contextBreakdownDetailedProjection = {
  key: 'contextBreakdownDetailed',
  stateVersion: 1,
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
      return tools.system === unclaimed.breakdown.systemToolsTokens && tools.mcp === unclaimed.breakdown.mcpToolsTokens
        ? unclaimed
        : { ...unclaimed, breakdown: { ...unclaimed.breakdown, systemToolsTokens: tools.system, mcpToolsTokens: tools.mcp } }
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

export function apply(ctx) {
  ctx.sessionProjections.register(contextBreakdownDetailedProjection)
  ctx.inject?.(['connection'], (uiCtx) => {
    const connection = uiCtx?.connection
    if (!connection?.fetch?.register) return
    const getSession = (sessionId) => ctx.get?.('sessions')?.get?.(sessionId)
    const getSkills = () => ctx.get?.('skills')
    uiCtx.effect(
      () => connection.fetch.register(contextRoute(getSession, getSkills)),
      'context-bar/route',
    )
    uiCtx.effect(
      () => connection.fetch.register(attachmentRoute(getSession)),
      'context-bar/file-route',
    )
  })
}
