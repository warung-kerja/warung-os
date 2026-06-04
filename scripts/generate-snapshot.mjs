#!/usr/bin/env node
/**
 * Warung OS — Hermes-safe local snapshot generator
 * Task 7: TickTick Warung OS board adapter
 *
 * Outputs: public/snapshots/latest.json
 * Run:     npm run snapshot:generate
 *
 * SAFETY CONTRACT:
 * - Reads only safe local sources: git log (read-only CLI), filesystem stat,
 *   sanitized Hermes cron metadata, non-secret Hermes model config, and the
 *   TickTick cache file written by scripts/collect-ticktick.py.
 * - Does NOT read session transcripts, token stores, API keys, .env files,
 *   OAuth tokens, raw memories, cron prompts, delivery targets, or credentials.
 * - source_scope: 'hermes-only' (Raz's Warung Kerja environment, warung-os repo).
 * - Token usage, wiki entries, dot delegation remain empty — adapters not yet connected.
 * - Provider health reflects configured model/provider metadata only; status is config_present,
 *   not live API latency/availability.
 *
 * REAL data collected by this generator:
 *   workspace_signal    — warung-os git log (branch, HEAD, commits, file churn, working tree)
 *   source_health       — filesystem checks (snapshot file, git repo, cron/config, Obsidian projects dir, TickTick cache)
 *   cron_jobs           — sanitized Hermes profile cron job metadata from cron/jobs.json; includes completed_runs + skills
 *   hermes_model_health — sanitized Hermes profile model config from config.yaml
 *   projects.items      — Obsidian 03_Active_Projects/ folder scan; YAML frontmatter only; folder paths redacted
 *   projects.kanban_boards — TickTick 'Warung OS' board cache (task titles, columns, priorities; no descriptions/comments)
 *   model_token_daily   — aggregate token totals from Hermes state.db (sessions table, SUM of integer columns only;
 *                         no message content, no system_prompt, no title read; grouped by day+model)
 *   agent_token_daily   — aggregate token totals by execution source (cron/telegram/cli) from Hermes state.db
 *
 * PLACEHOLDER / UNAVAILABLE:
 *   dot_delegation   — skeleton adapter in hermes-dot-delegation.mjs; no live source defined
 *   team_members     — static placeholder in hermes-team-members.mjs; no live agent status source
 *
 * TickTick note: run `npm run ticktick:collect` first to populate the cache.
 * The generator reads the cache file; it never handles TickTick credentials directly.
 */

import { writeFileSync, readFileSync, readdirSync, mkdirSync, existsSync, statSync, openSync, readSync, closeSync } from 'fs'
import { execSync } from 'child_process'
import { join, dirname, relative } from 'path'
import { fileURLToPath } from 'url'
import { collectCronJobs } from './adapters/hermes-cron.mjs'
import { collectProviderHealth } from './adapters/hermes-provider-health.mjs'
import { collectToolUsage } from './adapters/hermes-tool-usage.mjs'
import { collectSessionActivity } from './adapters/hermes-session-activity.mjs'
import { collectDotDelegation } from './adapters/hermes-dot-delegation.mjs'
import { collectTeamMembers } from './adapters/hermes-team-members.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT_DIR = join(ROOT, 'public', 'snapshots')
const OUT_FILE = join(OUT_DIR, 'latest.json')
const HERMES_HOME = '/Users/gabi/.hermes'
const HERMES_PROFILES_DIR = join(HERMES_HOME, 'profiles')
const HERMES_PROFILE_DIR = join(HERMES_PROFILES_DIR, 'tech-director')
const HERMES_CRON_JOBS_FILE = join(HERMES_PROFILE_DIR, 'cron', 'jobs.json')
const HERMES_CONFIG_FILE = join(HERMES_PROFILE_DIR, 'config.yaml')
const OBSIDIAN_PROJECTS_DIR = '/Users/gabi/Documents/Warung Kerja 1.0/03_Active_Projects'
const OBSIDIAN_WIKI_JOURNAL_DIR = '/Users/gabi/Documents/Warung Kerja 1.0/05_1%_Journal'
// TickTick cache written by scripts/collect-ticktick.py — never read directly by this generator.
const TICKTICK_CACHE_FILE = join(HERMES_PROFILE_DIR, 'cache', 'warung-os-ticktick-cache.json')
// Subfolders to skip when scanning Obsidian projects
const OBSIDIAN_SKIP_DIRS = new Set(['_archive', '_work queue', '_registry', '_work_queue'])

function safeId(value) {
  return String(value ?? 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown'
}

function collectHermesProfiles() {
  const profiles = []
  // Default/root Hermes profile, retained for read-only future compatibility.
  profiles.push({
    name: 'default',
    dir: HERMES_HOME,
    cronFile: join(HERMES_HOME, 'cron', 'jobs.json'),
    configFile: join(HERMES_HOME, 'config.yaml'),
  })

  try {
    if (existsSync(HERMES_PROFILES_DIR)) {
      const profileDirs = readdirSync(HERMES_PROFILES_DIR, { withFileTypes: true })
        .filter(e => e.isDirectory() && !e.name.startsWith('.'))
        .map(e => e.name)
        .sort((a, b) => a.localeCompare(b))

      for (const name of profileDirs) {
        const dir = join(HERMES_PROFILES_DIR, name)
        profiles.push({
          name,
          dir,
          cronFile: join(dir, 'cron', 'jobs.json'),
          configFile: join(dir, 'config.yaml'),
        })
      }
    }
  } catch (_) {}

  return profiles
}

const HERMES_PROFILES = collectHermesProfiles()

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
      // Normalize git date (%ai = "ISO 8601") to UTC ISO 8601 string.
      const rawDate = (committed_at ?? '').trim()
      let dateISO = rawDate
      try { dateISO = new Date(rawDate).toISOString() } catch (_) {}
      return {
        hash: (hash ?? '').trim().slice(0, 8),
        committed_at: dateISO,
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

// collectModelHealth, collectGatewayStatus, collectProviderCatalog extracted to
// scripts/adapters/hermes-provider-health.mjs — imported above as collectProviderHealth.

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

  // Sanitized Hermes cron/config sources for every discovered profile.
  const hermesSources = HERMES_PROFILES.flatMap(profile => [
    { id: `sh-hermes-${safeId(profile.name)}-cron-jobs`, label: `Hermes cron jobs metadata (${profile.name})`, path: profile.cronFile, type: 'filesystem' },
    { id: `sh-hermes-${safeId(profile.name)}-config`, label: `Hermes model/provider config metadata (${profile.name})`, path: profile.configFile, type: 'filesystem' },
  ])

  for (const source of hermesSources) {
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

  // Gateway state files and provider caches per profile (Phase 3)
  const phase3Sources = HERMES_PROFILES.flatMap(profile => [
    {
      id: `sh-hermes-${safeId(profile.name)}-gateway-state`,
      label: `Hermes gateway state (${profile.name})`,
      path: join(profile.dir, 'gateway_state.json'),
      type: 'filesystem',
    },
    {
      id: `sh-hermes-${safeId(profile.name)}-provider-cache`,
      label: `Hermes provider models cache (${profile.name})`,
      path: join(profile.dir, 'provider_models_cache.json'),
      type: 'filesystem',
    },
  ])

  for (const source of phase3Sources) {
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
      error: exists ? null : `Expected Hermes profile metadata file not found`,
      synced_at: nowISO,
    })
  }

  // state.db per profile — sessions (token usage) + messages (tool usage)
  for (const profile of HERMES_PROFILES) {
    const dbPath = join(profile.dir, 'state.db')
    const exists = existsSync(dbPath)
    let modifiedAt = null, ageHours = null
    if (exists) {
      const stat = statSync(dbPath)
      modifiedAt = new Date(stat.mtimeMs).toISOString()
      ageHours = parseFloat(((now.getTime() - stat.mtimeMs) / (1000 * 60 * 60)).toFixed(2))
    }
    rows.push({
      id: `sh-hermes-${safeId(profile.name)}-state-db`,
      label: `Hermes state.db — sessions + tool usage (${profile.name})`,
      source_type: 'filesystem',
      exists,
      readable: exists,
      modified_at: modifiedAt,
      age_hours: ageHours,
      status: exists ? 'ok' : 'warn',
      error: exists ? null : `Hermes state.db not found for profile ${profile.name} — token and tool usage unavailable`,
      synced_at: nowISO,
    })
  }

  // Obsidian active projects folder (real check — project adapter now connected)
  const obsidianProjExists = existsSync(OBSIDIAN_PROJECTS_DIR)
  let obsidianProjModifiedAt = null
  let obsidianProjAgeHours = null
  if (obsidianProjExists) {
    const stat = statSync(OBSIDIAN_PROJECTS_DIR)
    obsidianProjModifiedAt = new Date(stat.mtimeMs).toISOString()
    obsidianProjAgeHours = parseFloat(((now.getTime() - stat.mtimeMs) / (1000 * 60 * 60)).toFixed(2))
  }
  rows.push({
    id: 'sh-obsidian-projects',
    label: 'Obsidian active projects folder',
    source_type: 'filesystem',
    exists: obsidianProjExists,
    readable: obsidianProjExists,
    modified_at: obsidianProjModifiedAt,
    age_hours: obsidianProjAgeHours,
    status: obsidianProjExists ? 'ok' : 'warn',
    error: obsidianProjExists ? null : 'Obsidian projects folder not found at expected path',
    synced_at: nowISO,
  })

  const wikiExists = existsSync(OBSIDIAN_WIKI_JOURNAL_DIR)
  let wikiModifiedAt = null
  let wikiAgeHours = null
  if (wikiExists) {
    const stat = statSync(OBSIDIAN_WIKI_JOURNAL_DIR)
    wikiModifiedAt = new Date(stat.mtimeMs).toISOString()
    wikiAgeHours = parseFloat(((now.getTime() - stat.mtimeMs) / (1000 * 60 * 60)).toFixed(2))
  }
  rows.push({
    id: 'sh-obsidian-wiki',
    label: 'Obsidian journal folder (wiki ingestion)',
    source_type: 'filesystem',
    exists: wikiExists,
    readable: wikiExists,
    modified_at: wikiModifiedAt,
    age_hours: wikiAgeHours,
    status: wikiExists ? 'ok' : 'bad',
    error: wikiExists ? null : 'Approved wiki source folder not found: 05_1%_Journal',
    synced_at: nowISO,
  })

  // TickTick cache file (written by collect-ticktick.py)
  const ttCacheExists = existsSync(TICKTICK_CACHE_FILE)
  let ttCacheModifiedAt = null
  let ttCacheAgeHours = null
  let ttCacheStale = false
  if (ttCacheExists) {
    const stat = statSync(TICKTICK_CACHE_FILE)
    ttCacheModifiedAt = new Date(stat.mtimeMs).toISOString()
    ttCacheAgeHours = parseFloat(((now.getTime() - stat.mtimeMs) / (1000 * 60 * 60)).toFixed(2))
    ttCacheStale = ttCacheAgeHours > 24
  }
  rows.push({
    id: 'sh-ticktick-cache',
    label: 'TickTick Warung OS board cache',
    source_type: 'cache',
    exists: ttCacheExists,
    readable: ttCacheExists,
    modified_at: ttCacheModifiedAt,
    age_hours: ttCacheAgeHours,
    status: ttCacheExists ? (ttCacheStale ? 'warn' : 'ok') : 'bad',
    error: ttCacheExists
      ? (ttCacheStale ? `Cache is ${ttCacheAgeHours}h old — run npm run ticktick:collect to refresh` : null)
      : 'TickTick cache not found — run npm run ticktick:collect to populate',
    synced_at: nowISO,
  })

  rows.push({
    id: 'sh-hermes-dot-delegation-adapter',
    label: 'Hermes Dot delegation adapter source',
    source_type: 'adapter',
    exists: false,
    readable: false,
    modified_at: null,
    age_hours: null,
    status: 'warn',
    error: 'Adapter skeleton present, but no live Hermes delegation source is defined yet',
    synced_at: nowISO,
  })

  rows.push({
    id: 'sh-hermes-team-members-adapter',
    label: 'Hermes profile roster adapter source',
    source_type: 'adapter',
    exists: true,
    readable: true,
    modified_at: null,
    age_hours: null,
    status: 'ok',
    error: 'Profile roster is discovered from safe Hermes config metadata. Live presence/current-task is not available yet, so statuses are marked waiting.',
    synced_at: nowISO,
  })

  return rows
}

// ---- Session token usage ----
// Reads aggregate token totals from Hermes state.db (one per profile).
// SAFETY: queries only numeric SUM fields and non-secret string columns (model, source) from
// the sessions table. No system_prompt, title, content, reasoning, or message content is read.
// source values are safe platform identifiers: cli, cron, telegram, acp.
// Uses sqlite3 -readonly to avoid WAL conflicts with a running Hermes process.
function collectSessionTokenUsage() {
  const allRows = []

  const SQLITE3 = '/usr/bin/sqlite3'
  if (!existsSync(SQLITE3)) return { ok: false, error: 'sqlite3 CLI not found', modelDaily: [], agentDaily: [] }

  const QUERY = [
    "SELECT",
    "  date(started_at, 'unixepoch', 'localtime') as day,",
    "  model,",
    "  COALESCE(source, 'unknown') as source,",
    "  SUM(input_tokens) as input_tokens,",
    "  SUM(output_tokens) as output_tokens,",
    "  SUM(cache_read_tokens) as cache_read_tokens,",
    "  SUM(cache_write_tokens) as cache_write_tokens,",
    "  COUNT(*) as sessions,",
    "  SUM(tool_call_count) as tool_calls",
    "FROM sessions",
    "WHERE model IS NOT NULL",
    "  AND started_at >= unixepoch('now', '-7 days')",
    "GROUP BY day, model, source",
    "ORDER BY day DESC, input_tokens DESC",
  ].join(' ')

  for (const profile of HERMES_PROFILES) {
    const dbPath = join(profile.dir, 'state.db')
    if (!existsSync(dbPath)) continue
    try {
      const raw = execSync(`"${SQLITE3}" -readonly -json "${dbPath}"`, {
        input: QUERY,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 8000,
      })
      const rows = JSON.parse(raw || '[]')
      for (const row of rows) allRows.push({ ...row, profile: profile.name })
    } catch (_) {
      // Fail silently per profile — locked DB or missing sqlite3 should not break the snapshot.
    }
  }

  // Aggregate to ModelTokenUsageDaily (by date + model, across all profiles)
  const modelMap = {}
  for (const row of allRows) {
    const key = `${row.day}-${safeId(row.model)}`
    if (!modelMap[key]) {
      modelMap[key] = {
        id: `mtd-${safeId(row.day)}-${safeId(row.model)}`,
        model: row.model,
        date: row.day,
        input_tokens: 0,
        output_tokens: 0,
        cache_read_tokens: 0,
        cache_write_tokens: 0,
        total_tokens: 0,
        turns: 0,
        synced_at: nowISO,
      }
    }
    modelMap[key].input_tokens    += (row.input_tokens    ?? 0)
    modelMap[key].output_tokens   += (row.output_tokens   ?? 0)
    modelMap[key].cache_read_tokens  += (row.cache_read_tokens  ?? 0)
    modelMap[key].cache_write_tokens += (row.cache_write_tokens ?? 0)
    modelMap[key].total_tokens += (row.input_tokens ?? 0) + (row.output_tokens ?? 0)
    modelMap[key].turns += (row.sessions ?? 0)
  }

  // Aggregate to AgentTokenUsageDaily (by date + source/context, across all profiles)
  const agentMap = {}
  for (const row of allRows) {
    const key = `${row.day}-${safeId(row.source)}`
    if (!agentMap[key]) {
      agentMap[key] = {
        id: `atd-${safeId(row.day)}-${safeId(row.source)}`,
        agent: row.source,   // execution context: cron, telegram, cli, acp
        parent_agent: null,
        date: row.day,
        input_tokens: 0,
        output_tokens: 0,
        cache_read_tokens: 0,
        cache_write_tokens: 0,
        total_tokens: 0,
        turns: 0,
        synced_at: nowISO,
      }
    }
    agentMap[key].input_tokens    += (row.input_tokens    ?? 0)
    agentMap[key].output_tokens   += (row.output_tokens   ?? 0)
    agentMap[key].cache_read_tokens  += (row.cache_read_tokens  ?? 0)
    agentMap[key].cache_write_tokens += (row.cache_write_tokens ?? 0)
    agentMap[key].total_tokens += (row.input_tokens ?? 0) + (row.output_tokens ?? 0)
    agentMap[key].turns += (row.sessions ?? 0)
  }

  const modelDaily = Object.values(modelMap).sort((a, b) => b.date.localeCompare(a.date) || b.total_tokens - a.total_tokens)
  const agentDaily = Object.values(agentMap).sort((a, b) => b.date.localeCompare(a.date) || b.total_tokens - a.total_tokens)
  const totalRows = allRows.length
  const profileCount = new Set(allRows.map(r => r.profile)).size

  return { ok: true, modelDaily, agentDaily, rawRowCount: totalRows, profileCount }
}

// collectCronHealth, collectCronRunHistory, enrichment extracted to
// scripts/adapters/hermes-cron.mjs — imported above as collectCronJobs.

// ---- Obsidian status map ----
// Maps Obsidian frontmatter status values to CanonicalProject status strings.
const OBSIDIAN_STATUS_MAP = {
  'active': 'active',
  'phase-2-ready': 'review',
  'review': 'review',
  'moving': 'moving',
  'paused': 'paused',
  'blocked': 'blocked',
  'done': 'completed',
  'completed': 'completed',
  'not-started': 'planned',
  'planned': 'planned',
  'archived': 'archived',
}

// Read only the YAML frontmatter block from a markdown file.
// Safety: stops as soon as the closing --- delimiter is reached or after 60 lines.
// This avoids loading note body content into memory.
function readFrontmatterBlock(filePath) {
  let fd = null
  try {
    fd = openSync(filePath, 'r')
    const buffer = Buffer.alloc(1)
    const lines = []
    let current = ''
    let bytesRead = 0

    while (lines.length < 60 && (bytesRead = readSync(fd, buffer, 0, 1, null)) > 0) {
      const char = buffer.toString('utf8', 0, bytesRead)
      if (char === '\n') {
        const line = current.replace(/\r$/, '')
        lines.push(line)
        current = ''

        if (lines.length === 1 && line.trim() !== '---') return null
        if (lines.length > 1 && line.trim() === '---') break
      } else {
        current += char
      }
    }

    if (current && lines.length < 60) lines.push(current.replace(/\r$/, ''))
    if (lines[0]?.trim() !== '---') return null
    return lines.join('\n')
  } catch (_) {
    return null
  } finally {
    if (fd !== null) {
      try { closeSync(fd) } catch (_) {}
    }
  }
}

function parseFrontmatter(text) {
  if (!text) return null
  const lines = text.split('\n')
  if (lines[0]?.trim() !== '---') return null
  const fields = {}
  for (let i = 1; i < lines.length && i < 60; i++) {
    if (lines[i]?.trim() === '---') break
    const m = lines[i].match(/^([a-zA-Z_]\w*)\s*:\s*(.*)$/)
    if (m) fields[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '')
  }
  return Object.keys(fields).length > 0 ? fields : null
}

// ---- Obsidian project tracker adapter ----
// Scans ~/Documents/Warung Kerja 1.0/03_Active_Projects/ for project folders.
// For each folder, reads ONLY the YAML frontmatter of a Project Home markdown file.
// Does NOT read body content, agent diaries, journals, or credential stores.
// Folder paths are redacted — never included in snapshot output.
function collectObsidianProjects() {
  try {
    if (!existsSync(OBSIDIAN_PROJECTS_DIR)) {
      return { ok: false, error: 'Obsidian projects directory not found', projects: [] }
    }

    const entries = readdirSync(OBSIDIAN_PROJECTS_DIR, { withFileTypes: true })
    const projectDirs = entries
      .filter(e => e.isDirectory() && !OBSIDIAN_SKIP_DIRS.has(e.name.toLowerCase()) && !e.name.startsWith('_'))
      .sort((a, b) => a.name.localeCompare(b.name))

    const projects = []

    for (const dirEntry of projectDirs) {
      const dirPath = join(OBSIDIAN_PROJECTS_DIR, dirEntry.name)

      // Only look at .md files in the root of the project folder — skip subdirectories
      let mdFiles = []
      try {
        mdFiles = readdirSync(dirPath, { withFileTypes: true })
          .filter(f => f.isFile() && f.name.endsWith('.md') && !f.name.startsWith('.'))
          .map(f => f.name)
          .sort()
      } catch (_) {}

      // Prefer a file named "Project Home"; otherwise use the first .md file
      const homeFileName = mdFiles.find(f => f.toLowerCase().includes('project home')) ?? mdFiles[0] ?? null

      let frontmatter = null
      let fileModifiedAt = null

      if (homeFileName) {
        const filePath = join(dirPath, homeFileName)
        try {
          const stat = statSync(filePath)
          fileModifiedAt = new Date(stat.mtimeMs).toISOString()
          const frontmatterText = readFrontmatterBlock(filePath)
          frontmatter = parseFrontmatter(frontmatterText)
        } catch (_) {}
      }

      // Derive stable ID from folder name
      const id = dirEntry.name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      const rawStatus = frontmatter?.status ?? null
      const status = rawStatus ? (OBSIDIAN_STATUS_MAP[rawStatus] ?? rawStatus) : 'unknown'

      // Safe date parsing for frontmatter date strings (YYYY-MM-DD format)
      function safeDateISO(dateStr) {
        if (!dateStr) return null
        try {
          const d = new Date(dateStr + 'T00:00:00Z')
          return isNaN(d.getTime()) ? null : d.toISOString()
        } catch (_) { return null }
      }

      projects.push({
        id,
        name: frontmatter?.project ?? dirEntry.name.replace(/[_-]+/g, ' '),
        owner: frontmatter?.owner ?? null,
        team: null,
        status,
        priority: null,
        current_phase: null,
        next_step: null,
        project_kind: null,
        parent_project_id: null,
        visibility: 'private',
        source_root: null,
        folder_path: null,   // Redacted — do not expose Obsidian vault paths
        folder_status: 'obsidian',
        registry_status: frontmatter ? 'registered' : 'unstructured',
        source_updated_at: safeDateISO(frontmatter?.updated) ?? fileModifiedAt,
        synced_at: nowISO,
        blocker: null,
        last_movement_at: safeDateISO(frontmatter?.updated) ?? fileModifiedAt,
      })
    }

    return { ok: true, projects }
  } catch (err) {
    return { ok: false, error: String(err?.message ?? err), projects: [] }
  }
}

function readMarkdownFrontmatterAndBody(filePath) {
  const raw = readFileSync(filePath, 'utf8')
  if (!raw.startsWith('---\n')) return { frontmatter: null, body: raw }
  const end = raw.indexOf('\n---', 4)
  if (end === -1) return { frontmatter: null, body: raw }
  const frontmatterText = raw.slice(0, end + 5)
  const body = raw.slice(end + 5).replace(/^\s+/, '')
  return { frontmatter: parseFrontmatter(frontmatterText), body }
}

function walkMarkdownFiles(dirPath) {
  const files = []
  function walk(current) {
    let entries = []
    try { entries = readdirSync(current, { withFileTypes: true }) } catch (_) { return }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const next = join(current, entry.name)
      if (entry.isDirectory()) walk(next)
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) files.push(next)
    }
  }
  walk(dirPath)
  return files.sort((a, b) => a.localeCompare(b))
}

// ---- Obsidian wiki adapter ----
// Raz-approved scope: everything inside 05_1%_Journal. Paths are emitted relative to
// that folder only; no absolute vault path is exposed in the snapshot.
function collectWikiEntries() {
  try {
    if (!existsSync(OBSIDIAN_WIKI_JOURNAL_DIR)) {
      return { ok: false, entries: [], error: 'Approved wiki source folder not found: 05_1%_Journal' }
    }

    const mdFiles = walkMarkdownFiles(OBSIDIAN_WIKI_JOURNAL_DIR)
    const entries = []

    for (const filePath of mdFiles) {
      try {
        const relPath = relative(OBSIDIAN_WIKI_JOURNAL_DIR, filePath)
        const stat = statSync(filePath)
        const { frontmatter, body } = readMarkdownFrontmatterAndBody(filePath)
        const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim()
        const fileTitle = relPath.split('/').pop()?.replace(/\.md$/i, '') ?? 'Untitled'
        const title = frontmatter?.title ?? heading ?? fileTitle
        const tagString = frontmatter?.tags ?? ''
        const tags = tagString
          .replace(/^\[|\]$/g, '')
          .split(',')
          .map(t => t.trim().replace(/^['\"]|['\"]$/g, ''))
          .filter(Boolean)
        const cleanBody = body.trim()

        entries.push({
          id: `wiki-${safeId(relPath.replace(/\.md$/i, ''))}`,
          title,
          source_type: 'journal',
          author: frontmatter?.author ?? 'Raz / Warung Kerja',
          project: frontmatter?.project ?? null,
          tags,
          excerpt: cleanBody.slice(0, 280),
          body: cleanBody,
          source_path: `05_1%_Journal/${relPath}`,
          date: frontmatter?.date ?? frontmatter?.created ?? new Date(stat.mtimeMs).toISOString().slice(0, 10),
          is_current: true,
        })
      } catch (_) {}
    }

    return { ok: true, entries }
  } catch (err) {
    return { ok: false, entries: [], error: String(err?.message ?? err) }
  }
}

// ---- TickTick kanban cache reader ----
// Reads the local cache file written by scripts/collect-ticktick.py.
// Never reads credentials, API keys, or the Hermes .env file.
// Returns unavailable state if cache is absent or unreadable.
function collectTickTickKanban() {
  try {
    if (!existsSync(TICKTICK_CACHE_FILE)) {
      return {
        ok: false,
        boards: [],
        error: 'TickTick cache not found — run npm run ticktick:collect to populate',
        cache_age_hours: null,
      }
    }

    const stat = statSync(TICKTICK_CACHE_FILE)
    const cacheAgeHours = parseFloat(((now.getTime() - stat.mtimeMs) / (1000 * 60 * 60)).toFixed(2))

    const raw = readFileSync(TICKTICK_CACHE_FILE, 'utf8')
    const cache = JSON.parse(raw)

    // Annotate boards with observed cache age (cache file was written by collect-ticktick.py)
    const boards = (cache.boards ?? []).map(board => ({
      ...board,
      cache_age_hours: cacheAgeHours,
    }))

    return {
      ok: Boolean(cache.ok),
      boards,
      error: cache.error ?? null,
      cache_age_hours: cacheAgeHours,
    }
  } catch (err) {
    return {
      ok: false,
      boards: [],
      error: `TickTick cache read failed: ${String(err?.message ?? err)}`,
      cache_age_hours: null,
    }
  }
}

// ---- Run all collectors ----
const gitResult        = collectGitSignals(ROOT)
const { modelHealth, gatewayStatus, providerCatalog } = collectProviderHealth(HERMES_PROFILES, nowISO)
const cronJobs         = collectCronJobs(HERMES_PROFILES, nowISO)
const obsidianResult   = collectObsidianProjects()
const wikiResult       = collectWikiEntries()
const ticktickResult   = collectTickTickKanban()
const tokenResult           = collectSessionTokenUsage()
const toolUsageResult       = collectToolUsage(HERMES_PROFILES, nowISO)
const sessionActivityResult = collectSessionActivity(HERMES_PROFILES, nowISO)
const dotDelegResult        = collectDotDelegation(HERMES_PROFILES, nowISO)
const teamMembersResult = collectTeamMembers(HERMES_PROFILES, nowISO)
// sourceHealth runs after other collectors so it can reflect live state.db presence
const sourceHealth     = collectSourceHealth()
const durationMs       = Date.now() - startMs

// Enrich the warung-os project entry with git-derived timing (real local data).
const enrichedProjects = obsidianResult.projects.map(p => {
  if (p.id === 'warung-os' && gitResult.ok) {
    return {
      ...p,
      source_root: 'warung-os/',
      source_updated_at: gitResult.signal.latest_commit_at ?? p.source_updated_at,
      last_movement_at: gitResult.signal.latest_commit_at ?? p.last_movement_at,
    }
  }
  return p
})

// Fall back to the stub warung-os entry if Obsidian collection failed
const projectItems = obsidianResult.ok && enrichedProjects.length > 0
  ? enrichedProjects
  : [{
      id: 'warung-os',
      name: 'Warung OS',
      owner: 'Raz',
      team: ['Mia', 'Gabs', 'Baro'],
      status: 'review',
      priority: 'p0',
      current_phase: 'Phase 2 — Data Adapters',
      next_step: 'Task 7: Obsidian wiki adapter or TickTick board adapter',
      project_kind: 'tooling',
      parent_project_id: null,
      visibility: 'private',
      source_root: 'warung-os/',
      folder_path: null,   // Redacted — do not expose Obsidian vault or local repo paths
      folder_status: 'active',
      registry_status: 'registered',
      source_updated_at: gitResult.ok ? (gitResult.signal.latest_commit_at ?? nowISO) : nowISO,
      synced_at: nowISO,
      blocker: null,
      last_movement_at: gitResult.ok ? (gitResult.signal.latest_commit_at ?? nowISO) : nowISO,
    }]

const gatewayRunning = gatewayStatus.filter(g => g.gateway_state === 'running').length
const gatewayPlatformsSummary = gatewayStatus.flatMap(g => g.platforms).map(p => `${p.name}:${p.state}`).join(', ')

const adapterWarnings = {
  workspace: gitResult.ok
    ? `Git signals collected from warung-os repo (real local data). Branch: ${gitResult.signal.branch}, HEAD: ${gitResult.signal.head}.`
    : `Git signals collection failed: ${gitResult.error}`,
  cron: `Hermes cron metadata read from all discovered profiles with prompts/delivery targets omitted. Profiles discovered: ${HERMES_PROFILES.length}. Jobs recorded: ${cronJobs.length}. completed_runs and skills fields included. Run history enriched from output directory filenames (no content read).`,
  provider_health: `Model/provider rows are sanitized config metadata only — no live API health or latency check performed. Profiles discovered: ${HERMES_PROFILES.length}.`,
  gateway_status: gatewayStatus.length > 0
    ? `Hermes gateway state read from gateway_state.json for ${gatewayStatus.length} profile(s). Running: ${gatewayRunning}. Platforms: ${gatewayPlatformsSummary || 'none'}.`
    : 'Hermes gateway_state.json not found in any profile — gateway status unavailable.',
  provider_catalog: providerCatalog.length > 0
    ? `Provider models catalog read from provider_models_cache.json for ${new Set(providerCatalog.map(p => p.profile)).size} profile(s). ${new Set(providerCatalog.map(p => p.provider)).size} provider(s). Total models: ${providerCatalog.reduce((n, p) => n + p.model_count, 0)}.`
    : 'Provider models cache not found in any profile.',
  token_usage: tokenResult.ok
    ? `Session token usage (state.db sessions) connected. ${tokenResult.profileCount} profile(s). model_token_daily: ${tokenResult.modelDaily.length} row(s). agent_token_daily: ${tokenResult.agentDaily.length} row(s). Tool usage (state.db messages) connected: ${toolUsageResult.daily.length} tool-day row(s) from ${toolUsageResult.profileCount} profile(s) (${toolUsageResult.rowCount} raw query rows). input/output/cache token split unavailable — messages table stores a single token_count per message.`
    : `Session token usage unavailable: ${tokenResult.error}. Tool usage: ${toolUsageResult.daily.length > 0 ? `${toolUsageResult.daily.length} tool-day row(s) from ${toolUsageResult.profileCount} profile(s)` : 'no data'}.`,
  session_activity: sessionActivityResult.daily.length > 0
    ? `Session activity feed connected (state.db sessions). ${sessionActivityResult.profileCount} profile(s). ${sessionActivityResult.daily.length} day-source row(s) (${sessionActivityResult.rowCount} raw query rows). 30-day window. Reads: started_at, ended_at, source, model, message_count, tool_call_count, input_tokens, output_tokens. Never reads: title, system_prompt, model_config, handoff_state, billing/cost fields, user_id.`
    : `Session activity feed: no data found in sessions table across ${sessionActivityResult.profileCount} profile(s) — state.db may be absent or schema incompatible.`,
  agent_status: teamMembersResult.note,
  dot_delegation: dotDelegResult.warning,
  obsidian_projects: obsidianResult.ok
    ? `Obsidian project frontmatter collected from 03_Active_Projects/. ${obsidianResult.projects.length} folder(s) found. Structured projects: ${obsidianResult.projects.filter(p => p.registry_status === 'registered').length}. Folder paths redacted. Body content not read.`
    : `Obsidian project adapter failed: ${obsidianResult.error}`,
  wiki: wikiResult.ok
    ? `Obsidian wiki entries collected from 05_1%_Journal/. ${wikiResult.entries.length} markdown file(s) ingested. Source paths are relative; absolute vault path omitted.`
    : `Obsidian wiki adapter failed: ${wikiResult.error}`,
  ticktick: ticktickResult.ok
    ? `TickTick Warung OS board cache read (${ticktickResult.boards.length} board(s), ${ticktickResult.boards.reduce((n, b) => n + b.task_count, 0)} task(s)). Cache age: ${ticktickResult.cache_age_hours}h. Task descriptions and comments excluded.`
    : `TickTick adapter unavailable: ${ticktickResult.error}`,
}

const warnings = [
  tokenResult.ok
    ? `Session token usage connected (state.db sessions): ${tokenResult.profileCount} profile(s), ${tokenResult.modelDaily.length} model-day, ${tokenResult.agentDaily.length} source-day row(s). Tool usage connected (state.db messages): ${toolUsageResult.daily.length} tool-day row(s) from ${toolUsageResult.profileCount} profile(s). dot_delegation unavailable.`
    : `Token usage unavailable: ${tokenResult.error}. Tool usage: ${toolUsageResult.daily.length} tool-day row(s). dot_delegation unavailable.`,
  'Model/provider health is config metadata only — no live API health or latency check was performed.',
  gitResult.ok
    ? `Workspace git signals are real local data from warung-os repo (branch: ${gitResult.signal.branch}).`
    : `Workspace git signals unavailable — git collection failed: ${gitResult.error}`,
  gatewayStatus.length > 0
    ? `Hermes gateway status: ${gatewayRunning}/${gatewayStatus.length} profile(s) running. Platforms: ${gatewayPlatformsSummary || 'none'}.`
    : 'Hermes gateway status unavailable — gateway_state.json not found.',
  providerCatalog.length > 0
    ? `Provider catalog: ${new Set(providerCatalog.map(p => p.provider)).size} provider(s) across ${new Set(providerCatalog.map(p => p.profile)).size} profile(s). Total available models: ${providerCatalog.reduce((n, p) => n + p.model_count, 0)}.`
    : 'Provider catalog unavailable.',
  obsidianResult.ok
    ? `Obsidian project metadata collected from 03_Active_Projects/ (frontmatter only — body content not read). ${obsidianResult.projects.length} project(s) found.`
    : `Obsidian project adapter failed: ${obsidianResult.error}`,
  wikiResult.ok
    ? `Wiki entries collected from approved Obsidian folder 05_1%_Journal/ (${wikiResult.entries.length} markdown file(s)).`
    : `Wiki adapter unavailable: ${wikiResult.error}`,
  ticktickResult.ok
    ? `TickTick Warung OS board: ${ticktickResult.boards.reduce((n, b) => n + b.task_count, 0)} undone task(s). Cache age: ${ticktickResult.cache_age_hours}h.`
    : `TickTick board adapter unavailable: ${ticktickResult.error}`,
]

const snapshot = {
  meta: {
    schema_version: '1',
    source_mode: 'snapshot',
    generated_at: nowISO,
    source_scope: 'hermes-only',
    profile: 'all-hermes-profiles',
    warnings,
    redactions_applied: false,
    // is_demo: false — this snapshot reads real local data (git signals, filesystem).
    // Token usage and delegation are genuinely unavailable, not fabricated.
    is_demo: false,
    adapter_warnings: adapterWarnings,
  },

  home: {
    daily_brief: [
      {
        id: 'db-snap-1',
        type: 'info',
        title: 'Snapshot generated',
        body: `Snapshot generated at ${nowISO}. Git signals, all-profile Hermes cron/model/gateway/provider metadata, Obsidian project metadata, approved journal wiki entries, TickTick board cache, and tool usage from Hermes state.db messages table are real local data. Dot delegation remains unavailable.`,
        time: now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
        project: 'warung-os',
      },
      ...(ticktickResult.ok && ticktickResult.boards.length > 0
        ? ticktickResult.boards.map(board => {
            const colSummary = board.column_counts
              .slice(0, 5)
              .map(c => `${c.column}: ${c.count}`)
              .join(' · ')
            return {
              id: `db-ticktick-${board.board_id}`,
              type: 'info',
              title: `${board.board_name}: ${board.task_count} undone task(s)`,
              body: colSummary || 'No tasks in board.',
              time: `Cache ${ticktickResult.cache_age_hours}h ago`,
              project: 'warung-os',
            }
          })
        : [{
            id: 'db-ticktick-unavail',
            type: 'info',
            title: 'Warung OS board: unavailable',
            body: `TickTick cache not populated — run npm run ticktick:collect to fetch board state.`,
            time: 'TickTick',
            project: 'warung-os',
          }]
      ),
      {
        id: 'db-snap-2',
        type: 'info',
        title: 'Phase 5 — live at warung-os-online.vercel.app (public, no-auth)',
        body: 'GitHub warung-kerja/warung-os auto-deploys main to Vercel. Supabase snapshot publishing pipeline configured. Auth gate (P5.5) deferred — Raz chose public/no-auth for now.',
        time: 'Phase 5',
        project: 'warung-os',
      },
    ],
    approvals: [],
  },

  projects: {
    items: projectItems,
    // TickTick Warung OS board — sanitized cache (task titles/columns/priorities; no descriptions or comments)
    kanban_boards: ticktickResult.boards,
    // Static placeholder via hermes-team-members.mjs — no live agent status source.
    team_members: teamMembersResult.members,
  },

  operations: {
    // MUST remain 'hermes-only' — never include OpenClaw agents or telemetry.
    source_scope: 'hermes-only',

    // Session token usage — read from Hermes state.db (SUM of integer fields only; no content).
    // agent = execution source context (cron, telegram, cli, acp).
    agent_token_daily: tokenResult.ok ? tokenResult.agentDaily : [],
    model_token_daily: tokenResult.ok ? tokenResult.modelDaily : [],
    // Tool usage — read from Hermes state.db messages table (tool_name + token_count only; no content).
    // input/output/cache token split is 0 — messages table stores a single token_count per message.
    tool_usage_daily: toolUsageResult.daily,
    // Session activity feed — per (day, source) aggregate from sessions table, 30-day window.
    // Aggregate metadata only: no titles, prompts, content, or credential fields.
    session_activity_daily: sessionActivityResult.daily,
    session_activity_by_profile: sessionActivityResult.byProfile ?? [],
    session_activity_hourly: sessionActivityResult.hourly ?? [],

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
          type: 'phase3-all-adapters',
          git_signals: gitResult.ok ? 'ok' : 'failed',
          cron_adapter: cronJobs.some(job => job.status === 'bad') ? 'failed' : `ok (${cronJobs.length} job(s), run history enriched)`,
          provider_health: modelHealth.some(model => model.status === 'bad') ? 'failed' : 'config_only',
          gateway_status: gatewayStatus.length > 0 ? `ok (${gatewayRunning}/${gatewayStatus.length} running, platforms: ${gatewayPlatformsSummary || 'none'})` : 'unavailable',
          provider_catalog: providerCatalog.length > 0 ? `ok (${new Set(providerCatalog.map(p => p.provider)).size} providers, ${providerCatalog.reduce((n, p) => n + p.model_count, 0)} models)` : 'unavailable',
          token_adapter: tokenResult.ok
            ? `ok (${tokenResult.profileCount} profiles, ${tokenResult.modelDaily.length} model-day, ${tokenResult.agentDaily.length} source-day rows)`
            : `unavailable: ${tokenResult.error}`,
          tool_usage_adapter: toolUsageResult.daily.length > 0
            ? `ok (${toolUsageResult.daily.length} tool-day rows, ${toolUsageResult.profileCount} profile(s), ${toolUsageResult.rowCount} raw rows)`
            : 'no tool usage data found in messages table',
          session_activity_adapter: sessionActivityResult.daily.length > 0
            ? `ok (${sessionActivityResult.daily.length} day-source rows, ${(sessionActivityResult.hourly ?? []).length} hourly buckets, ${(sessionActivityResult.byProfile ?? []).length} profile summaries, ${sessionActivityResult.profileCount} profile(s), ${sessionActivityResult.rowCount} raw rows)`
            : 'no session activity data found in sessions table',
          obsidian_projects_adapter: obsidianResult.ok ? `ok (${obsidianResult.projects.length} projects)` : `failed: ${obsidianResult.error}`,
          obsidian_wiki_adapter: wikiResult.ok ? `ok (${wikiResult.entries.length} entries)` : `failed: ${wikiResult.error}`,
          ticktick_board_adapter: ticktickResult.ok
            ? `ok (cache ${ticktickResult.cache_age_hours}h old, ${ticktickResult.boards.reduce((n, b) => n + b.task_count, 0)} tasks)`
            : `unavailable: ${ticktickResult.error}`,
          duration_ms: durationMs,
        },
        error: gitResult.ok ? null : `git_signals_failed: ${gitResult.error}`,
      },
    ],

    sync_requests: [],

    workspace_signal: gitResult.ok ? gitResult.signal : null,

    hermes_model_health: modelHealth,

    dot_delegation: dotDelegResult.items,

    // Phase 3: gateway connectivity and provider catalog
    gateway_status: gatewayStatus,
    provider_catalog: providerCatalog,
  },

  wiki: {
    entries: wikiResult.entries,
  },
}

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(OUT_FILE, JSON.stringify(snapshot, null, 2), 'utf8')

console.log(`\n[warung-os] Snapshot written → ${OUT_FILE}`)
console.log(`[warung-os] source_mode: ${snapshot.meta.source_mode} · scope: ${snapshot.meta.source_scope} · is_demo: ${snapshot.meta.is_demo} · profile: ${snapshot.meta.profile}`)
console.log(`[warung-os] Git signals:    ${gitResult.ok ? `ok  (branch: ${gitResult.signal.branch}, head: ${gitResult.signal.head}, commits_24h: ${gitResult.signal.commits_24h})` : `FAILED: ${gitResult.error}`}`)
console.log(`[warung-os] Hermes profiles: ${HERMES_PROFILES.map(p => p.name).join(', ')}`)
console.log(`[warung-os] Cron jobs:      ${cronJobs.length} Hermes job(s) recorded across discovered profiles (prompts/delivery targets omitted)`)
console.log(`[warung-os] Model health:   ${modelHealth.length} config row(s) listed across discovered profiles (no live health check)`)
console.log(`[warung-os] Source health:  ${sourceHealth.filter(s => s.status === 'ok').length} ok / ${sourceHealth.length} total`)
console.log(`[warung-os] Obsidian projects: ${obsidianResult.ok ? `ok  (${obsidianResult.projects.length} folder(s), ${obsidianResult.projects.filter(p => p.registry_status === 'registered').length} with frontmatter)` : `FAILED: ${obsidianResult.error}`}`)
console.log(`[warung-os] Wiki entries:   ${wikiResult.ok ? `ok  (${wikiResult.entries.length} markdown file(s) from 05_1%_Journal)` : `FAILED: ${wikiResult.error}`}`)
console.log(`[warung-os] Projects in snapshot: ${projectItems.length}`)
console.log(`[warung-os] TickTick board: ${ticktickResult.ok ? `ok  (${ticktickResult.boards.reduce((n, b) => n + b.task_count, 0)} task(s), cache ${ticktickResult.cache_age_hours}h old)` : `UNAVAIL: ${ticktickResult.error}`}`)
console.log(`[warung-os] Token usage:    ${tokenResult.ok ? `ok  (${tokenResult.profileCount} profile(s), ${tokenResult.modelDaily.length} model-day, ${tokenResult.agentDaily.length} source-day rows)` : `UNAVAIL: ${tokenResult.error}`}`)
console.log(`[warung-os] Tool usage:    ${toolUsageResult.daily.length > 0 ? `ok  (${toolUsageResult.daily.length} tool-day row(s), ${toolUsageResult.profileCount} profile(s), ${toolUsageResult.rowCount} raw rows)` : 'UNAVAIL: no tool usage data in messages table'}`)
console.log(`[warung-os] Session activity: ${sessionActivityResult.daily.length > 0 ? `ok  (${sessionActivityResult.daily.length} day-source row(s), ${(sessionActivityResult.hourly ?? []).length} hourly bucket(s), ${sessionActivityResult.profileCount} profile(s), ${sessionActivityResult.rowCount} raw rows, 30d)` : 'UNAVAIL: no session activity data'}`)
console.log(`[warung-os] Duration:       ${durationMs}ms`)
console.log(`[warung-os] Warnings:`)
warnings.forEach(w => console.log(`  - ${w}`))
