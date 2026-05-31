#!/usr/bin/env node
/**
 * Warung OS — local snapshot generator skeleton
 *
 * Outputs: public/snapshots/latest.json
 * Run:     npm run snapshot:generate
 *
 * SAFETY CONTRACT:
 * - This generator produces fixture-backed demo snapshots only.
 * - It does NOT read Hermes logs, session transcripts, token stores,
 *   raw memories, API keys, or any secrets.
 * - source_mode: 'snapshot', is_demo: true — static snapshot file, never live telemetry.
 * - source_scope is 'hermes-only' as required by the contract,
 *   but sensitive/unknown arrays stay empty until real Hermes adapters are wired in.
 *
 * Future: a trusted Hermes-side process will populate real-env data
 * after each session using safe read-only sources. This skeleton
 * establishes the output contract and directory structure only.
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT_DIR = join(ROOT, 'public', 'snapshots')
const OUT_FILE = join(OUT_DIR, 'latest.json')

const now = new Date().toISOString()

const snapshot = {
  meta: {
    schema_version: '1',
    source_mode: 'snapshot',
    generated_at: now,
    source_scope: 'hermes-only',
    profile: null,
    warnings: [
      'Demo snapshot — all data is fixture-backed, not live telemetry.',
      'Token usage, cron health, and agent status are illustrative only.',
      'Connect a Hermes adapter to replace this with real environment data.',
    ],
    redactions_applied: false,
    is_demo: true,
    adapter_warnings: {
      operations: 'Hermes operations adapter not yet connected — arrays are empty.',
      workspace: 'Git signals collector not yet connected — workspace_signal is null.',
      projects: 'Obsidian project adapter not yet connected — using stub entry only.',
      wiki: 'Obsidian wiki adapter not yet connected — entries array is empty.',
    },
  },

  home: {
    daily_brief: [
      {
        id: 'db-snap-1',
        type: 'info',
        title: 'Snapshot generated',
        body: `Demo snapshot generated at ${now}. All data is fixture-backed — not live telemetry.`,
        time: new Date(now).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
        project: 'warung-os',
      },
      {
        id: 'db-snap-2',
        type: 'next',
        title: 'Connect Hermes adapter',
        body: 'Wire a trusted Hermes-side process to populate real cron health, token usage, and provider status.',
        time: 'Phase 2',
        project: 'warung-os',
      },
    ],
    approvals: [],
  },

  projects: {
    items: [
      {
        id: 'warung-os',
        name: 'Warung OS',
        owner: 'Raz',
        team: ['Mia', 'Gabs', 'Baro'],
        status: 'review',
        priority: 'p0',
        current_phase: 'Phase 2 — Data Adapters',
        next_step: 'Wire Hermes adapter to replace fixture snapshot with real env data',
        project_kind: 'tooling',
        parent_project_id: null,
        visibility: 'private',
        source_root: 'warung-os/',
        folder_path: '/Users/gabi/Documents/warung-repo/warung-os',
        folder_status: 'active',
        registry_status: 'registered',
        source_updated_at: now,
        synced_at: now,
        blocker: null,
        last_movement_at: now,
      },
    ],
    team_members: [
      {
        id: 'baro',
        name: 'Baro',
        role: 'Orchestrator',
        model: 'claude-sonnet-4-6',
        agent_group: 'core',
        parent_agent: null,
        synced_at: now,
        status: 'active',
        current_task: 'Coordinating Phase 2 data adapters',
      },
      {
        id: 'mia',
        name: 'Mia',
        role: 'Tech Lead',
        model: 'claude-sonnet-4-6',
        agent_group: 'core',
        parent_agent: 'baro',
        synced_at: now,
        status: 'active',
        current_task: 'QA: Phase 2 data source boundary and snapshot contract',
      },
    ],
  },

  operations: {
    // MUST remain 'hermes-only' — never include OpenClaw agents or telemetry
    source_scope: 'hermes-only',

    // Token usage intentionally unavailable — requires Hermes log adapter.
    // Do not fabricate real-looking numbers here.
    agent_token_daily: [],
    model_token_daily: [],
    tool_usage_daily: [],

    cron_jobs: [
      {
        id: 'cj-snap-gen',
        agent: null,
        name: 'Snapshot Generator',
        schedule: 'manual',
        status: 'ok',
        enabled: true,
        model: null,
        model_source: null,
        last_run_at: now,
        next_run_at: null,
        duration_ms: null,
        error: null,
        synced_at: now,
      },
    ],

    source_health: [
      {
        id: 'sh-snap-file',
        label: 'Snapshot file',
        source_type: 'filesystem',
        exists: true,
        readable: true,
        modified_at: now,
        age_hours: 0,
        status: 'ok',
        error: null,
        synced_at: now,
      },
      {
        id: 'sh-hermes-adapter',
        label: 'Hermes adapter',
        source_type: 'adapter',
        exists: false,
        readable: false,
        modified_at: null,
        age_hours: null,
        status: 'bad',
        error: 'Hermes adapter not yet connected — Phase 2 skeleton only',
        synced_at: now,
      },
      {
        id: 'sh-token-store',
        label: 'Token usage store',
        source_type: 'filesystem',
        exists: false,
        readable: false,
        modified_at: null,
        age_hours: null,
        status: 'bad',
        error: 'Token usage adapter not yet connected — data unavailable',
        synced_at: now,
      },
    ],

    sync_runs: [
      {
        id: 'sr-snap-gen',
        started_at: now,
        finished_at: now,
        status: 'success',
        trigger: 'manual',
        source_host: 'local',
        summary: { type: 'fixture-snapshot', sources_checked: 0, live_adapters: 0 },
        error: null,
      },
    ],

    sync_requests: [],

    // Git signals require a read-only git adapter — unavailable in skeleton
    workspace_signal: null,

    hermes_model_health: [
      {
        id: 'hm-snap-primary',
        provider: 'Anthropic',
        model: 'claude-sonnet-4-6',
        status: 'ok',
        latency_ms: null,
        is_primary: true,
        is_fallback: false,
        last_checked_at: now,
      },
    ],

    dot_delegation: [],
  },

  wiki: {
    // Wiki entries require Obsidian adapter — unavailable in skeleton
    entries: [],
  },
}

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(OUT_FILE, JSON.stringify(snapshot, null, 2), 'utf8')

console.log(`[warung-os] Snapshot written → ${OUT_FILE}`)
console.log(`[warung-os] source_mode: ${snapshot.meta.source_mode} · source_scope: ${snapshot.meta.source_scope} · is_demo: ${snapshot.meta.is_demo}`)
console.log(`[warung-os] Warnings:`)
snapshot.meta.warnings.forEach(w => console.log(`  - ${w}`))
