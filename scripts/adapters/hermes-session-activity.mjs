#!/usr/bin/env node
/**
 * Warung OS — Hermes session activity adapter
 *
 * Reads aggregate session metadata from each Hermes profile's state.db.
 * Groups by (day, source) across all profiles to produce SessionActivityDaily
 * rows for the last 30 days.
 *
 * Safe to run standalone for debugging:
 *
 *   node scripts/adapters/hermes-session-activity.mjs
 *
 * SAFETY CONTRACT:
 * - Reads from sessions table ONLY these fields:
 *     started_at  (REAL unix epoch — timestamp only, no content)
 *     ended_at    (REAL unix epoch — timestamp only; may be NULL)
 *     source      (TEXT NOT NULL — execution context: cron/cli/telegram/acp)
 *     model       (TEXT — model identifier string, non-secret)
 *     message_count    (INTEGER — aggregate count, non-sensitive)
 *     tool_call_count  (INTEGER — aggregate count, non-sensitive)
 *     input_tokens     (INTEGER — aggregate count)
 *     output_tokens    (INTEGER — aggregate count)
 * - NEVER reads: title, system_prompt, model_config, handoff_state, handoff_error,
 *   billing_base_url, billing_mode, estimated_cost_usd, actual_cost_usd, cost_status,
 *   cost_source, user_id, parent_session_id, end_reason, or any field that could
 *   contain credentials, session content, task titles, or private memory.
 * - Uses sqlite3 -readonly to avoid WAL conflicts with a running Hermes process.
 * - Returns empty array silently per profile if state.db is missing, locked,
 *   or does not have a compatible sessions table schema.
 * - Never fabricates session activity data.
 *
 * Exports:
 *   collectSessionActivity(profiles, nowISO) → { daily, profileCount, rowCount }
 *
 * Output shape matches src/types/warung-os.ts#SessionActivityDaily.
 */

import { existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SQLITE3 = '/usr/bin/sqlite3'

function safeId(value) {
  return String(value ?? 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown'
}

// ---- Safe SQL query ----
// Groups by (day, source, model) to allow picking primary_model per day/source.
// Reads only: started_at, ended_at, source, model, message_count, tool_call_count,
//             input_tokens, output_tokens.
// NEVER reads: title, system_prompt, model_config, handoff_state, billing_*, cost_*, user_id.
// avg_duration_s uses ended_at - started_at, guarded against NULL and negative values.
const QUERY = [
  'SELECT',
  "  date(started_at, 'unixepoch', 'localtime') AS day,",
  "  COALESCE(source, 'unknown') AS source,",
  "  COALESCE(model, 'unknown') AS model,",
  '  COUNT(*) AS session_count,',
  '  COALESCE(SUM(message_count), 0) AS message_total,',
  '  COALESCE(SUM(tool_call_count), 0) AS tool_call_total,',
  '  COALESCE(SUM(input_tokens), 0) + COALESCE(SUM(output_tokens), 0) AS total_tokens,',
  // Average only over sessions where ended_at is set and positive duration
  '  AVG(CASE WHEN ended_at IS NOT NULL AND ended_at > started_at THEN ended_at - started_at ELSE NULL END) AS avg_duration_s',
  'FROM sessions',
  "WHERE started_at >= unixepoch('now', '-30 days')",
  'GROUP BY day, source, model',
  'ORDER BY day DESC, session_count DESC',
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
 * Collect Hermes session activity from the sessions table across all profiles.
 * Groups by (day, source) and aggregates session_count, message_total,
 * tool_call_total, total_tokens, avg_duration_s, and primary_model.
 *
 * @param {Array<{name: string, dir: string}>} profiles
 * @param {string} nowISO — ISO timestamp for synced_at fields
 * @returns {{
 *   daily: import('../../src/types/warung-os.js').SessionActivityDaily[],
 *   profileCount: number,
 *   rowCount: number
 * }}
 */
export function collectSessionActivity(profiles, nowISO) {
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

  // Aggregate raw (day, source, model) rows into (day, source) map.
  // Track model → session_count to pick primary_model.
  // Track weighted sum of avg_duration_s to compute a cross-profile average.
  const dailyMap = {}

  for (const row of allRawRows) {
    const key = `${row.day}--${safeId(row.source)}`
    if (!dailyMap[key]) {
      dailyMap[key] = {
        day: row.day,
        source: row.source,
        session_count: 0,
        message_total: 0,
        tool_call_total: 0,
        total_tokens: 0,
        // Weighted avg duration: sum(avg_duration_s * session_count) / total sessions with duration
        duration_weighted_sum: 0,
        duration_count: 0,
        models: {},  // model → session_count, to pick primary_model
      }
    }

    const entry = dailyMap[key]
    const sc = row.session_count ?? 0

    entry.session_count   += sc
    entry.message_total   += (row.message_total   ?? 0)
    entry.tool_call_total += (row.tool_call_total ?? 0)
    entry.total_tokens    += (row.total_tokens    ?? 0)

    // Weighted avg: accumulate (avg_duration_s * session_count) for final division
    if (row.avg_duration_s != null && row.avg_duration_s > 0 && sc > 0) {
      entry.duration_weighted_sum += row.avg_duration_s * sc
      entry.duration_count        += sc
    }

    // Track model → session_count for primary_model election
    const model = row.model ?? 'unknown'
    entry.models[model] = (entry.models[model] ?? 0) + sc
  }

  const daily = Object.values(dailyMap).map(entry => {
    const avg_duration_s = entry.duration_count > 0
      ? parseFloat((entry.duration_weighted_sum / entry.duration_count).toFixed(1))
      : null

    // Primary model = model with highest session_count for this (day, source)
    const primaryModelEntry = Object.entries(entry.models)
      .filter(([m]) => m !== 'unknown')
      .sort((a, b) => b[1] - a[1])[0]
    const primary_model = primaryModelEntry?.[0] ?? null

    return {
      id: `sa-${safeId(entry.day)}-${safeId(entry.source)}`,
      date: entry.day,
      source: entry.source,
      session_count: entry.session_count,
      message_total: entry.message_total,
      tool_call_total: entry.tool_call_total,
      total_tokens: entry.total_tokens,
      avg_duration_s,
      primary_model,
      synced_at: nowISO,
    }
  }).sort((a, b) => b.date.localeCompare(a.date) || a.source.localeCompare(b.source))

  return { daily, profileCount, rowCount: allRawRows.length }
}

// ---- Standalone execution ----
// Run directly for debugging: node scripts/adapters/hermes-session-activity.mjs
if (process.argv[1] === __filename) {
  const HERMES_HOME = '/Users/gabi/.hermes'
  const HERMES_PROFILES_DIR = join(HERMES_HOME, 'profiles')

  const profiles = [{ name: 'default', dir: HERMES_HOME }]

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
  const result = collectSessionActivity(profiles, nowISO)

  console.log(JSON.stringify(result.daily, null, 2))
  process.stderr.write(
    `[hermes-session-activity] ${result.daily.length} day-source row(s) from ${result.profileCount} profile(s) (${result.rowCount} raw query rows)\n`
  )
}
