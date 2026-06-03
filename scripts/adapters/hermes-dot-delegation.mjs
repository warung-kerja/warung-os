#!/usr/bin/env node
/**
 * Warung OS — Hermes dot delegation adapter skeleton
 *
 * ADAPTER STATUS: UNAVAILABLE — no live Hermes delegation source defined.
 * Returns an empty array and a documented warning. No data is fabricated.
 *
 * What would be needed to connect this adapter:
 *   - A live Hermes source file that records delegation events between agents
 *     (e.g. delegation_log.json or a state.db table for agent-to-agent tasks).
 *   - Fields needed per entry: delegating agent, receiving agent/dot, task description,
 *     status (active/waiting/blocked/done), and timestamps.
 *   - Once the source is defined, implement safe reads here following the same
 *     pattern as hermes-cron.mjs: no prompts, no message content, no transcripts.
 *   - Add a source_health row in generate-snapshot.mjs collectSourceHealth().
 *
 * Safety contract (for when this is connected):
 *   - Never read: session transcripts, prompts, message content, OAuth tokens,
 *     delivery targets, raw memory dumps, or credential stores.
 *   - Redact any value matching API key patterns before emitting.
 *   - Return empty array with status:'unavailable' for any missing/unreadable source.
 *
 * Export: collectDotDelegation(profiles, nowISO) → { items: DotDelegationStatus[], warning: string }
 *
 * Run standalone: node scripts/adapters/hermes-dot-delegation.mjs
 */

import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * @param {{ name: string, dir: string }[]} profiles
 * @param {string} _nowISO
 * @returns {{ items: object[], warning: string }}
 */
export function collectDotDelegation(profiles, _nowISO) {
  return {
    items: [],
    warning: `dot_delegation unavailable — no live Hermes delegation source defined. ${profiles.length} profile(s) scanned; adapter skeleton in place. Connect a source file once available.`,
  }
}

// Standalone execution for debugging
if (process.argv[1] === __filename) {
  const result = collectDotDelegation([], new Date().toISOString())
  console.log('[hermes-dot-delegation] Status: unavailable (no live source defined)')
  console.log(`[hermes-dot-delegation] Warning: ${result.warning}`)
  console.log(`[hermes-dot-delegation] Items: ${result.items.length}`)
}
