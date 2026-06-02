#!/usr/bin/env node
/**
 * Warung OS — Hermes tool usage adapter
 *
 * Reads tool call counts from the messages table of each Hermes profile's state.db.
 * Groups by (day, tool_name) across all profiles to produce ToolUsageDaily rows
 * for the last 7 days.
 *
 * Safe to run standalone for debugging:
 *
 *   node scripts/adapters/hermes-tool-usage.mjs
 *
 * SAFETY CONTRACT:
 * - Reads from messages table: tool_name (non-secret string), timestamp (real epoch),
 *   token_count (integer). These three fields only.
 * - Reads from sessions table (JOIN): model (non-secret string), source (non-secret string),
 *   started_at (real epoch for the WHERE filter). These three fields only.
 * - NEVER reads: content, tool_calls (contains tool arguments), reasoning,
 *   reasoning_content, reasoning_details, codex_reasoning_items, codex_message_items,
 *   system_prompt, title, model_config, handoff_state, billing_base_url, billing_mode,
 *   estimated_cost_usd, or any field that could contain credentials, prompts,
 *   transcripts, memories, or personal data.
 * - Query joins sessions → messages using idx_sessions_started (sessions table index)
 *   then idx_messages_session (messages table index), avoiding full-table scans.
 * - Uses sqlite3 -readonly to avoid WAL conflicts with a running Hermes process.
 * - Returns empty array silently per profile if state.db is missing, locked,
 *   or does not have a compatible messages table schema.
 * - Never fabricates tool usage data.
 *
 * Notes on token fields:
 *   The messages table stores a single token_count per message, not split into
 *   input/output/cache. Therefore input_tokens, output_tokens, cache_read_tokens,
 *   and cache_write_tokens are always 0 in the output. total_tokens = SUM(token_count).
 *
 * Exports:
 *   collectToolUsage(profiles, nowISO) → { daily, profileCount, rowCount }
 *
 * Output shape matches src/types/warung-os.ts#ToolUsageDaily.
 */

import { existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SQLITE3 = '/usr/bin/sqlite3'

// ---- Tool category lookup ----
// Covers both Hermes native snake_case names and Claude Code CamelCase names.
// MCP tools match by prefix ('mcp_' or 'mcp__'). Browser tools match by prefix.
// Anything unlisted falls back to 'other'.
const TOOL_CATEGORIES = {
  // Filesystem — Hermes snake_case
  read_file: 'filesystem', write_file: 'filesystem', patch: 'filesystem',
  // Filesystem — Claude Code CamelCase
  Read: 'filesystem', Write: 'filesystem', Edit: 'filesystem',
  MultiEdit: 'filesystem', NotebookEdit: 'filesystem',
  // Search — Hermes
  search_files: 'search', session_search: 'search',
  // Search — Claude Code
  Glob: 'search', Grep: 'search', Search: 'search',
  // Shell / execution — Hermes
  terminal: 'shell', process: 'shell', execute_code: 'shell',
  // Shell — Claude Code
  Bash: 'shell', Execute: 'shell', Shell: 'shell',
  // Agent / orchestration — Hermes
  delegate_task: 'agent', todo: 'agent',
  // Agent — Claude Code
  Agent: 'agent', SubAgent: 'agent', Task: 'agent',
  TaskCreate: 'agent', TaskUpdate: 'agent', TaskGet: 'agent',
  TaskList: 'agent', TaskOutput: 'agent', TaskStop: 'agent',
  // Skill — Hermes
  skill_manage: 'skill', skill_view: 'skill', skills_list: 'skill',
  // Skill — Claude Code
  Skill: 'skill',
  // Scheduling — Hermes
  cronjob: 'scheduling',
  // Scheduling — Claude Code
  PushNotification: 'notification',
  ScheduleWakeup: 'scheduling',
  CronCreate: 'scheduling', CronDelete: 'scheduling', CronList: 'scheduling',
  // Memory
  memory: 'memory',
  // Web / browser — Hermes
  x_search: 'web',
  // Web — Claude Code
  WebFetch: 'web', WebSearch: 'web', Browser: 'web',
  // Vision / generation — Hermes
  image_generate: 'vision', vision_analyze: 'vision',
  // UI — Hermes
  clarify: 'ui',
  // UI — Claude Code
  AskUserQuestion: 'ui',
  // Monitoring — Claude Code
  Monitor: 'monitoring',
  // Git / worktree — Claude Code
  EnterWorktree: 'git', ExitWorktree: 'git',
  // Planning — Claude Code
  EnterPlanMode: 'planning', ExitPlanMode: 'planning',
  // Remote — Claude Code
  RemoteTrigger: 'remote',
  // Meta — Claude Code
  ToolSearch: 'meta',
}

function toolCategory(name) {
  if (!name) return 'other'
  const exact = TOOL_CATEGORIES[name]
  if (exact) return exact
  // MCP tools: 'mcp__server__tool' (Claude Code) or 'mcp_server_tool' (Hermes)
  if (name.startsWith('mcp__') || name.startsWith('mcp_')) return 'mcp'
  // browser_* prefix covers all Hermes browser interaction tools
  if (name.startsWith('browser_')) return 'browser'
  return 'other'
}

function safeId(value) {
  return String(value ?? 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown'
}

// ---- Safe SQL query ----
// Joins sessions (indexed by started_at) → messages (indexed by session_id + timestamp).
// Reads only: tool_name, timestamp, token_count from messages; model, source from sessions.
// Never reads: content, tool_calls, reasoning*, codex_*, system_prompt, title.
const QUERY = [
  'SELECT',
  "  date(m.timestamp, 'unixepoch', 'localtime') AS day,",
  '  m.tool_name,',
  "  COALESCE(s.model, 'unknown') AS model,",
  "  COALESCE(s.source, 'unknown') AS source,",
  '  COUNT(*) AS calls,',
  '  COALESCE(SUM(m.token_count), 0) AS total_tokens,',
  '  MAX(m.timestamp) AS last_used_ts',
  'FROM sessions s',
  'JOIN messages m ON m.session_id = s.id',
  "WHERE s.started_at >= unixepoch('now', '-7 days')",
  '  AND m.tool_name IS NOT NULL',
  "  AND m.tool_name != ''",
  'GROUP BY day, m.tool_name, s.model, s.source',
  'ORDER BY day DESC, calls DESC',
].join(' ')

function queryProfile(dbPath) {
  try {
    const raw = execSync(`"${SQLITE3}" -readonly -json "${dbPath}"`, {
      input: QUERY,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10000,
    })
    return JSON.parse(raw || '[]')
  } catch (_) {
    return []
  }
}

/**
 * Collect Hermes tool usage from the messages table across all profiles.
 * Groups by (day, tool_name) and aggregates calls, tokens, model, and agents.
 *
 * @param {Array<{name: string, dir: string}>} profiles
 * @param {string} nowISO — ISO timestamp for synced_at fields
 * @returns {{
 *   daily: import('../../src/types/warung-os.js').ToolUsageDaily[],
 *   profileCount: number,
 *   rowCount: number
 * }}
 */
export function collectToolUsage(profiles, nowISO) {
  if (!existsSync(SQLITE3)) {
    return { daily: [], profileCount: 0, rowCount: 0 }
  }

  const allRawRows = []
  let profileCount = 0

  for (const profile of profiles) {
    const dbPath = join(profile.dir, 'state.db')
    if (!existsSync(dbPath)) continue
    profileCount++
    const rows = queryProfile(dbPath)
    for (const row of rows) allRawRows.push({ ...row, profile: profile.name })
  }

  // Aggregate raw (day, tool_name, model, source) rows by (day, tool_name) across profiles.
  const dailyMap = {}
  for (const row of allRawRows) {
    const key = `${row.day}-${safeId(row.tool_name)}`
    if (!dailyMap[key]) {
      dailyMap[key] = {
        day: row.day,
        tool_name: row.tool_name,
        calls: 0,
        total_tokens: 0,
        last_used_ts: 0,
        models: {},   // model → call count, to pick the most-used model
        sources: new Set(),
      }
    }
    const entry = dailyMap[key]
    entry.calls         += (row.calls ?? 0)
    entry.total_tokens  += (row.total_tokens ?? 0)
    if ((row.last_used_ts ?? 0) > entry.last_used_ts) entry.last_used_ts = row.last_used_ts
    entry.models[row.model] = (entry.models[row.model] ?? 0) + (row.calls ?? 0)
    if (row.source) entry.sources.add(row.source)
  }

  const daily = Object.values(dailyMap).map(entry => {
    const assignedModel = Object.entries(entry.models)
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

    return {
      id: `tu-${safeId(entry.day)}-${safeId(entry.tool_name)}`,
      tool_name: entry.tool_name,
      tool_category: toolCategory(entry.tool_name),
      // Most-used model for this tool on this day; null if indeterminate.
      assigned_model: assignedModel === 'unknown' ? null : assignedModel,
      date: entry.day,
      calls: entry.calls,
      // messages.token_count is not split into input/output/cache — always 0 for those fields.
      input_tokens:       0,
      output_tokens:      0,
      cache_read_tokens:  0,
      cache_write_tokens: 0,
      total_tokens: entry.total_tokens,
      agents: [...entry.sources].sort(),
      last_used_at: entry.last_used_ts > 0
        ? new Date(entry.last_used_ts * 1000).toISOString()
        : null,
      synced_at: nowISO,
    }
  }).sort((a, b) => b.date.localeCompare(a.date) || b.calls - a.calls)

  return { daily, profileCount, rowCount: allRawRows.length }
}

// ---- Standalone execution ----
// Run directly for debugging: node scripts/adapters/hermes-tool-usage.mjs
if (process.argv[1] === __filename) {
  const HERMES_HOME = '/Users/gabi/.hermes'
  const HERMES_PROFILES_DIR = join(HERMES_HOME, 'profiles')

  const profiles = [{
    name: 'default',
    dir: HERMES_HOME,
  }]

  try {
    if (existsSync(HERMES_PROFILES_DIR)) {
      const entries = readdirSync(HERMES_PROFILES_DIR, { withFileTypes: true })
        .filter(e => e.isDirectory() && !e.name.startsWith('.'))
        .map(e => e.name)
        .sort()
      for (const name of entries) {
        profiles.push({ name, dir: join(HERMES_PROFILES_DIR, name) })
      }
    }
  } catch (_) {}

  const nowISO = new Date().toISOString()
  const result = collectToolUsage(profiles, nowISO)

  console.log(JSON.stringify(result.daily, null, 2))
  process.stderr.write(
    `[hermes-tool-usage] ${result.daily.length} tool-day row(s) from ${result.profileCount} profile(s) (${result.rowCount} raw query rows)\n`
  )
}
