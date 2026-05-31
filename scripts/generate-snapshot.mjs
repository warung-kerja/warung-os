#!/usr/bin/env node
/**
 * Warung OS — Hermes-safe local snapshot generator
 * Task 5: cron/provider health adapter
 *
 * Outputs: public/snapshots/latest.json
 * Run:     npm run snapshot:generate
 *
 * SAFETY CONTRACT:
 * - Reads only safe local sources: git log (read-only CLI), filesystem stat,
 *   sanitized Hermes cron metadata, and non-secret Hermes model config.
 * - Does NOT read session transcripts, token stores, API keys, .env files,
 *   OAuth tokens, raw memories, cron prompts, delivery targets, or credentials.
 * - source_scope: 'hermes-only' (Raz's Warung Kerja environment, warung-os repo).
 * - Token usage, wiki entries, dot delegation remain empty — adapters not yet connected.
 * - Provider health reflects configured model/provider metadata only; status is config_present,
 *   not live API latency/availability.
 *
 * REAL data collected by this generator:
 *   workspace_signal  — warung-os git log (branch, HEAD, commits, file churn, working tree)
 *   source_health     — filesystem checks (snapshot file, git repo, cron/config files)
 *   cron_jobs         — sanitized Hermes profile cron job metadata from cron/jobs.json
 *   hermes_model_health — sanitized Hermes profile model config from config.yaml
 *
 * PLACEHOLDER / UNAVAILABLE:
 *   agent_token_daily, model_token_daily, tool_usage_daily — requires Hermes log adapter
 *   dot_delegation  — requires live Hermes delegation tracker
 *   wiki.entries    — requires Obsidian adapter
 *   team_members    — static; requires live Hermes agent status adapter
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync, statSync } from 'fs'
import { execSync } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT_DIR = join(ROOT, 'public', 'snapshots')
const OUT_FILE = join(OUT_DIR, 'latest.json')
const HERMES_PROFILE_DIR = '/Users/gabi/.hermes/profiles/tech-director'
const HERMES_CRON_JOBS_FILE = join(HERMES_PROFILE_DIR, 'cron', 'jobs.json')
const HERMES_CONFIG_FILE = join(HERMES_PROFILE_DIR, 'config.yaml')

const now = new Date()
const nowISO = now.toISOString()
const startMs = Date.now()

// ---- Git signals collector ----
// Reads only: git log, git status --porcelain. No secrets accessed.
function collectGitSignals(repoPath) {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: repoPath, encoding: 'utf8', stdio: 'pipe',
    }).trim()

    const head = execSync('git rev-parse HEAD', {
      cwd: repoPath, encoding: 'utf8', stdio: 'pipe',
    }).trim().slice(0, 12)

    // Use ASCII unit separator (0x1f) to safely delimit fields regardless of commit message content.
    const SEP = '\x1f'
    const logRaw = execSync(
      `git log -20 --format=%H${SEP}%ai${SEP}%an${SEP}%s`,
      { cwd: repoPath, encoding: 'utf8', stdio: 'pipe' }
    ).trim()

    const allCommits = logRaw.split('\n').filter(Boolean).map(line => {
      const parts = line.split(SEP)
      const [hash, committed_at, author] = parts
      const subject = parts.slice(3).join(SEP)
      return {
        hash: (hash ?? '').trim().slice(0, 8),
        committed_at: (committed_at ?? '').trim(),
        author: (author ?? '').trim(),
        subject: (subject ?? '').trim(),
      }
    })

    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const since7d  = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const commits_24h = allCommits.filter(c => new Date(c.committed_at) >= since24h).length
    const commits_7d  = allCommits.filter(c => new Date(c.committed_at) >= since7d).length
    const recent_commits = allCommits.slice(0, 10)

    // File churn: how many times each file was touched in last 7 days.
    // --format="" emits an empty delimiter line per commit; --name-only adds file paths below.
    const churnRaw = execSync(
      'git log --name-only --since="7 days ago" --format=""',
      { cwd: repoPath, encoding: 'utf8', stdio: 'pipe' }
    ).trim()
    const fileCounts = {}
    for (const line of churnRaw.split('\n').filter(l => l.trim())) {
      fileCounts[line.trim()] = (fileCounts[line.trim()] ?? 0) + 1
    }
    const file_churn = Object.entries(fileCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([path, touches]) => ({ path, touches }))

    // Working tree cleanliness.
    const statusRaw = execSync('git status --porcelain', {
      cwd: repoPath, encoding: 'utf8', stdio: 'pipe',
    }).trim()
    const working_tree = statusRaw.length === 0 ? 'clean' : 'dirty'

    return {
      ok: true,
      signal: {
        id: 'ws-warung-os',
        branch,
        head,
        working_tree,
        commits_24h,
        commits_7d,
        latest_commit_at: allCommits[0]?.committed_at ?? null,
        recent_commits,
        file_churn,
        synced_at: nowISO,
      },
    }
  } catch (err) {
    return { ok: false, error: String(err?.message ?? err) }
  }
}

// ---- Hermes model/provider config ----
// Reads only non-secret model/provider names from the active Hermes profile config.
// No live API health check — latency and availability are not measured here.
function collectModelHealth() {
  try {
    const config = readFileSync(HERMES_CONFIG_FILE, 'utf8')
    const modelBlock = config.match(/^model:\n((?:\s+.*\n?)*)/m)?.[1] ?? ''
    const defaultModel = modelBlock.match(/^\s+default:\s*['"]?([^'"\n#]+)['"]?/m)?.[1]?.trim() || null
    const provider = modelBlock.match(/^\s+provider:\s*['"]?([^'"\n#]+)['"]?/m)?.[1]?.trim() || null
    const fallbackLine = config.match(/^fallback_providers:\s*(.*)$/m)?.[1]?.trim() ?? '[]'
    const hasFallback = fallbackLine !== '[]' && fallbackLine !== ''

    const rows = []
    if (defaultModel || provider) {
      rows.push({
        id: 'hm-config-primary',
        provider,
        model: defaultModel,
        status: defaultModel && provider ? 'config_present' : 'warn',
        latency_ms: null,
        is_primary: true,
        is_fallback: false,
        last_checked_at: nowISO,
      })
    }

    rows.push({
      id: 'hm-config-fallback',
      provider: null,
      model: null,
      status: hasFallback ? 'config_present' : 'unconfigured',
      latency_ms: null,
      is_primary: false,
      is_fallback: true,
      last_checked_at: nowISO,
    })

    return rows
  } catch (err) {
    return [{
      id: 'hm-config-error',
      provider: null,
      model: null,
      status: 'bad',
      latency_ms: null,
      is_primary: true,
      is_fallback: false,
      last_checked_at: nowISO,
      error: `Unable to read sanitized Hermes model config: ${String(err?.message ?? err)}`,
    }]
  }
}

// ---- Source health checks ----
// Checks known local sources; sets status 'bad' for disconnected adapters.
function collectSourceHealth() {
  const rows = []

  // warung-os git repo
  let gitRepoOk = false
  let gitRepoError = null
  try {
    execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' })
    gitRepoOk = true
  } catch (e) {
    gitRepoError = String(e?.message ?? e)
  }
  rows.push({
    id: 'sh-git-warung-os',
    label: 'warung-os git repo',
    source_type: 'git',
    exists: true,
    readable: gitRepoOk,
    modified_at: null,
    age_hours: null,
    status: gitRepoOk ? 'ok' : 'bad',
    error: gitRepoError,
    synced_at: nowISO,
  })

  // Snapshot file (previous run)
  const snapExists = existsSync(OUT_FILE)
  let snapModifiedAt = null
  let snapAgeHours = null
  if (snapExists) {
    const stat = statSync(OUT_FILE)
    snapModifiedAt = new Date(stat.mtimeMs).toISOString()
    snapAgeHours = parseFloat(((now.getTime() - stat.mtimeMs) / (1000 * 60 * 60)).toFixed(2))
  }
  rows.push({
    id: 'sh-snap-file',
    label: 'Snapshot file (latest.json)',
    source_type: 'filesystem',
    exists: snapExists,
    readable: snapExists,
    modified_at: snapModifiedAt,
    age_hours: snapAgeHours,
    status: snapExists ? 'ok' : 'warn',
    error: snapExists ? null : 'No previous snapshot found — this may be the first run',
    synced_at: nowISO,
  })

  // Sanitized Hermes cron/config sources
  for (const source of [
    { id: 'sh-hermes-cron-jobs', label: 'Hermes cron jobs metadata', path: HERMES_CRON_JOBS_FILE, type: 'filesystem' },
    { id: 'sh-hermes-config', label: 'Hermes model/provider config metadata', path: HERMES_CONFIG_FILE, type: 'filesystem' },
  ]) {
    const exists = existsSync(source.path)
    let modifiedAt = null
    let ageHours = null
    if (exists) {
      const stat = statSync(source.path)
      modifiedAt = new Date(stat.mtimeMs).toISOString()
      ageHours = parseFloat(((now.getTime() - stat.mtimeMs) / (1000 * 60 * 60)).toFixed(2))
    }
    rows.push({
      id: source.id,
      label: source.label,
      source_type: source.type,
      exists,
      readable: exists,
      modified_at: modifiedAt,
      age_hours: ageHours,
      status: exists ? 'ok' : 'warn',
      error: exists ? null : 'Expected Hermes profile metadata file not found',
      synced_at: nowISO,
    })
  }

  // Disconnected adapters — reported honestly as bad
  rows.push({
    id: 'sh-hermes-token-log',
    label: 'Hermes token/usage logs',
    source_type: 'adapter',
    exists: false,
    readable: false,
    modified_at: null,
    age_hours: null,
    status: 'bad',
    error: 'Token usage adapter not connected — Phase 2 adapter pending',
    synced_at: nowISO,
  })

  rows.push({
    id: 'sh-obsidian-vault',
    label: 'Obsidian vault (wiki/projects)',
    source_type: 'adapter',
    exists: false,
    readable: false,
    modified_at: null,
    age_hours: null,
    status: 'bad',
    error: 'Obsidian adapter not connected — wiki and project tracker adapter pending',
    synced_at: nowISO,
  })

  return rows
}

// ---- Cron health ----
// Reads sanitized Hermes cron metadata only. It deliberately excludes job prompts,
// delivery targets, chat IDs, and script contents.
function collectCronHealth() {
  try {
    const raw = readFileSync(HERMES_CRON_JOBS_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    const jobs = Array.isArray(parsed.jobs) ? parsed.jobs : []

    return jobs.map(job => {
      const lastStatus = job.last_status ?? null
      const status = job.enabled === false
        ? 'warn'
        : lastStatus === 'error' || job.last_error
          ? 'bad'
          : 'ok'

      return {
        id: `cj-${job.id ?? 'unknown'}`,
        agent: null,
        name: job.name ?? 'Unnamed Hermes cron job',
        schedule: job.schedule_display ?? job.schedule?.display ?? null,
        status,
        enabled: Boolean(job.enabled),
        model: job.model ?? null,
        model_source: job.provider ?? null,
        last_run_at: job.last_run_at ?? null,
        next_run_at: job.next_run_at ?? null,
        duration_ms: null,
        error: job.last_error ? 'last_error_present_redacted' : null,
        synced_at: nowISO,
      }
    })
  } catch (err) {
    return [{
      id: 'cj-hermes-cron-read-error',
      agent: null,
      name: 'Hermes cron metadata',
      schedule: null,
      status: 'bad',
      enabled: false,
      model: null,
      model_source: null,
      last_run_at: null,
      next_run_at: null,
      duration_ms: null,
      error: `Unable to read sanitized Hermes cron metadata: ${String(err?.message ?? err)}`,
      synced_at: nowISO,
    }]
  }
}

// ---- Run all collectors ----
const gitResult    = collectGitSignals(ROOT)
const modelHealth  = collectModelHealth()
const sourceHealth = collectSourceHealth()
const cronJobs     = collectCronHealth()
const durationMs   = Date.now() - startMs

const adapterWarnings = {
  workspace: gitResult.ok
    ? `Git signals collected from warung-os repo (real local data). Branch: ${gitResult.signal.branch}, HEAD: ${gitResult.signal.head}.`
    : `Git signals collection failed: ${gitResult.error}`,
  cron: `Hermes cron metadata read from active profile with prompts/delivery targets omitted. Jobs recorded: ${cronJobs.length}.`,
  provider_health: 'Model/provider rows are sanitized config metadata only — no live API health or latency check performed.',
  token_usage: 'Agent/model/tool token usage adapter not connected — arrays are empty until Hermes log adapter is wired in.',
  agent_status: 'Team member status is static placeholder — live Hermes agent status adapter not yet connected.',
  projects: 'Obsidian project adapter not connected — using warung-os stub entry only.',
  wiki: 'Obsidian wiki adapter not connected — entries array is empty.',
}

const warnings = [
  'Token usage (agent/model/tool), wiki entries, and dot delegation are unavailable — adapters not yet connected.',
  'Model/provider health is config metadata only — no live API health or latency check was performed.',
  gitResult.ok
    ? `Workspace git signals are real local data from warung-os repo (branch: ${gitResult.signal.branch}).`
    : `Workspace git signals unavailable — git collection failed: ${gitResult.error}`,
]

const snapshot = {
  meta: {
    schema_version: '1',
    source_mode: 'snapshot',
    generated_at: nowISO,
    source_scope: 'hermes-only',
    profile: 'tech-director',
    warnings,
    redactions_applied: false,
    // is_demo: false — this snapshot reads real local data (git signals, filesystem).
    // Token usage, wiki, and delegation are genuinely unavailable, not fabricated.
    is_demo: false,
    adapter_warnings: adapterWarnings,
  },

  home: {
    daily_brief: [
      {
        id: 'db-snap-1',
        type: 'info',
        title: 'Snapshot generated',
        body: `Snapshot generated at ${nowISO}. Git signals are real local data. Token usage, wiki, and dot delegation are unavailable until adapters are connected.`,
        time: now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
        project: 'warung-os',
      },
      {
        id: 'db-snap-2',
        type: 'next',
        title: 'Next: Hermes token adapter (Task 6)',
        body: 'Wire Hermes-side token/usage log reader to populate real Usage tab data. Then Obsidian adapter for wiki and project tracker.',
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
        next_step: 'Task 6: Obsidian project tracker adapter',
        project_kind: 'tooling',
        parent_project_id: null,
        visibility: 'private',
        source_root: 'warung-os/',
        folder_path: ROOT,
        folder_status: 'active',
        registry_status: 'registered',
        source_updated_at: gitResult.ok ? (gitResult.signal.latest_commit_at ?? nowISO) : nowISO,
        synced_at: nowISO,
        blocker: null,
        last_movement_at: gitResult.ok ? (gitResult.signal.latest_commit_at ?? nowISO) : nowISO,
      },
    ],
    // Static placeholder — live agent status adapter not yet connected.
    team_members: [
      {
        id: 'baro',
        name: 'Baro',
        role: 'Orchestrator',
        model: 'claude-sonnet-4-6',
        agent_group: 'core',
        parent_agent: null,
        synced_at: nowISO,
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
        synced_at: nowISO,
        status: 'active',
        current_task: 'Phase 2 Task 5 — Hermes cron/provider health adapter',
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
    ],
  },

  operations: {
    // MUST remain 'hermes-only' — never include OpenClaw agents or telemetry.
    source_scope: 'hermes-only',

    // Unavailable — requires Hermes log adapter. Do not fabricate numbers.
    agent_token_daily: [],
    model_token_daily: [],
    tool_usage_daily: [],

    cron_jobs: cronJobs,
    source_health: sourceHealth,

    sync_runs: [
      {
        id: `sr-${now.getTime()}`,
        started_at: new Date(now.getTime() - durationMs).toISOString(),
        finished_at: nowISO,
        status: 'success',
        trigger: 'manual',
        source_host: 'local',
        summary: {
          type: 'hermes-cron-provider-adapter',
          git_signals: gitResult.ok ? 'ok' : 'failed',
          cron_adapter: cronJobs.some(job => job.status === 'bad') ? 'failed' : 'ok',
          provider_health: modelHealth.some(model => model.status === 'bad') ? 'failed' : 'config_only',
          token_adapter: 'unavailable',
          obsidian_adapter: 'unavailable',
          duration_ms: durationMs,
        },
        error: gitResult.ok ? null : `git_signals_failed: ${gitResult.error}`,
      },
    ],

    sync_requests: [],

    workspace_signal: gitResult.ok ? gitResult.signal : null,

    hermes_model_health: modelHealth,

    dot_delegation: [],
  },

  wiki: {
    // Requires Obsidian adapter — unavailable.
    entries: [],
  },
}

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(OUT_FILE, JSON.stringify(snapshot, null, 2), 'utf8')

console.log(`\n[warung-os] Snapshot written → ${OUT_FILE}`)
console.log(`[warung-os] source_mode: ${snapshot.meta.source_mode} · scope: ${snapshot.meta.source_scope} · is_demo: ${snapshot.meta.is_demo} · profile: ${snapshot.meta.profile}`)
console.log(`[warung-os] Git signals:    ${gitResult.ok ? `ok  (branch: ${gitResult.signal.branch}, head: ${gitResult.signal.head}, commits_24h: ${gitResult.signal.commits_24h})` : `FAILED: ${gitResult.error}`}`)
console.log(`[warung-os] Cron jobs:      ${cronJobs.length} Hermes profile job(s) recorded (prompts/delivery targets omitted)`)
console.log(`[warung-os] Model health:   ${modelHealth.length} config row(s) listed (no live health check)`)
console.log(`[warung-os] Source health:  ${sourceHealth.filter(s => s.status === 'ok').length} ok / ${sourceHealth.length} total`)
console.log(`[warung-os] Duration:       ${durationMs}ms`)
console.log(`[warung-os] Warnings:`)
warnings.forEach(w => console.log(`  - ${w}`))
