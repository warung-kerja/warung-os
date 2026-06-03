#!/usr/bin/env node
/**
 * Warung OS — Hermes team members adapter (static placeholder)
 *
 * ADAPTER STATUS: STATIC PLACEHOLDER — no live Hermes agent status source defined.
 * Returns the known Warung Kerja core agent roster with fixed role/model metadata.
 * Status and current_task fields are not live; they reflect documented defaults.
 *
 * What would be needed to connect this adapter:
 *   - A live Hermes source that records per-agent status (active/idle/busy, current task).
 *   - Possibly an agent_registry.json or a state file per agent in the Hermes profile dir.
 *   - Once available, read agent names, roles, statuses, and current task summaries.
 *   - Never read: session transcripts, prompts, memory dumps, OAuth tokens, credentials.
 *   - current_task should be a sanitized task label only — not a transcript excerpt.
 *
 * Safety contract (for when this is connected):
 *   - Read only: agent name, role, model identifier, status, and a short task label.
 *   - Omit: prompt content, conversation history, memory entries, credentials.
 *   - Return status: 'offline' for any agent entry that cannot be verified as live.
 *
 * Export: collectTeamMembers(profiles, nowISO) → { members: CanonicalTeamMember[], note: string }
 *
 * Run standalone: node scripts/adapters/hermes-team-members.mjs
 */

import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * @param {{ name: string, dir: string }[]} _profiles
 * @param {string} nowISO
 * @returns {{ members: object[], note: string }}
 */
export function collectTeamMembers(_profiles, nowISO) {
  const members = [
    {
      id: 'baro',
      name: 'Baro',
      role: 'Orchestrator',
      model: 'claude-sonnet-4-6',
      agent_group: 'core',
      parent_agent: null,
      synced_at: nowISO,
      status: 'active',
      current_task: null,
    },
    {
      id: 'mia',
      name: 'Mia',
      role: 'Tech Director',
      model: 'claude-sonnet-4-6',
      agent_group: 'core',
      parent_agent: 'baro',
      synced_at: nowISO,
      status: 'active',
      current_task: 'Phase 5 — hosted mirror & adapter work',
    },
    {
      id: 'gabs',
      name: 'Gabs',
      role: 'Art Director',
      model: 'claude-sonnet-4-6',
      agent_group: 'core',
      parent_agent: 'baro',
      synced_at: nowISO,
      status: 'idle',
      current_task: null,
    },
    {
      id: 'obey',
      name: 'Obey',
      role: 'General Operator',
      model: 'claude-sonnet-4-6',
      agent_group: 'core',
      parent_agent: 'baro',
      synced_at: nowISO,
      status: 'idle',
      current_task: null,
    },
  ]

  return {
    members,
    note: 'team_members is a static placeholder — live Hermes agent status adapter not yet connected. Status and current_task fields reflect last known state, not live data.',
  }
}

// Standalone execution for debugging
if (process.argv[1] === __filename) {
  const nowISO = new Date().toISOString()
  const result = collectTeamMembers([], nowISO)
  console.log('[hermes-team-members] Status: static placeholder (no live source)')
  console.log(`[hermes-team-members] Note: ${result.note}`)
  console.log(`[hermes-team-members] ${result.members.length} member(s):`)
  for (const m of result.members) {
    console.log(`  ${m.id}: ${m.name} (${m.role}) — ${m.status}`)
  }
}
