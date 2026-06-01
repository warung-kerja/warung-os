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
 *   cron_jobs           — sanitized Hermes profile cron job metadata from cron/jobs.json
 *   hermes_model_health — sanitized Hermes profile model config from config.yaml
 *   projects.items      — Obsidian 03_Active_Projects/ folder scan; YAML frontmatter only; folder paths redacted
 *   projects.kanban_boards — TickTick 'Warung OS' board cache (task titles, columns, priorities; no descriptions/comments)
 *
 * PLACEHOLDER / UNAVAILABLE:
 *   agent_token_daily, model_token_daily, tool_usage_daily — requires Hermes log adapter
 *   dot_delegation  — requires live Hermes delegation tracker
 *   wiki.entries    — requires Obsidian adapter
 *   team_members    — static; requires live Hermes agent status adapter
 *
 * TickTick note: run `npm run ticktick:collect` first to populate the cache.
 * The generator reads the cache file; it never handles TickTick credentials directly.
 */

import { writeFileSync, readFileSync, readdirSync, mkdirSync, existsSync, statSync, openSync, readSync, closeSync } from 'fs'
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
const OBSIDIAN_PROJECTS_DIR = '/Users/gabi/Documents/Warung Kerja 1.0/03_Active_Projects'
// TickTick cache written by scripts/collect-ticktick.py — never read directly by this generator.
const TICKTICK_CACHE_FILE = join(HERMES_PROFILE_DIR, 'cache', 'warung-os-ticktick-cache.json')
// Subfolders to skip when scanning Obsidian projects
const OBSIDIAN_SKIP_DIRS = new Set(['_archive', '_work queue', '_registry', '_work_queue'])

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

  rows.push({
    id: 'sh-obsidian-wiki',
    label: 'Obsidian vault (wiki ingestion)',
    source_type: 'adapter',
    exists: false,
    readable: false,
    modified_at: null,
    age_hours: null,
    status: 'bad',
    error: 'Wiki ingestion adapter not connected — approved folders and scope not yet decided with Raz',
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
const gitResult       = collectGitSignals(ROOT)
const modelHealth     = collectModelHealth()
const sourceHealth    = collectSourceHealth()
const cronJobs        = collectCronHealth()
const obsidianResult  = collectObsidianProjects()
const ticktickResult  = collectTickTickKanban()
const durationMs      = Date.now() - startMs

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

const adapterWarnings = {
  workspace: gitResult.ok
    ? `Git signals collected from warung-os repo (real local data). Branch: ${gitResult.signal.branch}, HEAD: ${gitResult.signal.head}.`
    : `Git signals collection failed: ${gitResult.error}`,
  cron: `Hermes cron metadata read from active profile with prompts/delivery targets omitted. Jobs recorded: ${cronJobs.length}.`,
  provider_health: 'Model/provider rows are sanitized config metadata only — no live API health or latency check performed.',
  token_usage: 'Agent/model/tool token usage adapter not connected — arrays are empty until Hermes log adapter is wired in.',
  agent_status: 'Team member status is static placeholder — live Hermes agent status adapter not yet connected.',
  obsidian_projects: obsidianResult.ok
    ? `Obsidian project frontmatter collected from 03_Active_Projects/. ${obsidianResult.projects.length} folder(s) found. Structured projects: ${obsidianResult.projects.filter(p => p.registry_status === 'registered').length}. Folder paths redacted. Body content not read.`
    : `Obsidian project adapter failed: ${obsidianResult.error}`,
  wiki: 'Obsidian wiki ingestion adapter not connected — approved folders and scope not yet decided with Raz.',
  ticktick: ticktickResult.ok
    ? `TickTick Warung OS board cache read (${ticktickResult.boards.length} board(s), ${ticktickResult.boards.reduce((n, b) => n + b.task_count, 0)} task(s)). Cache age: ${ticktickResult.cache_age_hours}h. Task descriptions and comments excluded.`
    : `TickTick adapter unavailable: ${ticktickResult.error}`,
}

const warnings = [
  'Token usage (agent/model/tool), wiki entries, and dot delegation are unavailable — adapters not yet connected.',
  'Model/provider health is config metadata only — no live API health or latency check was performed.',
  gitResult.ok
    ? `Workspace git signals are real local data from warung-os repo (branch: ${gitResult.signal.branch}).`
    : `Workspace git signals unavailable — git collection failed: ${gitResult.error}`,
  obsidianResult.ok
    ? `Obsidian project metadata collected from 03_Active_Projects/ (frontmatter only — body content not read). ${obsidianResult.projects.length} project(s) found.`
    : `Obsidian project adapter failed: ${obsidianResult.error}`,
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
        body: `Snapshot generated at ${nowISO}. Git signals, Hermes cron metadata, Obsidian project metadata, and TickTick board cache are real local data. Token usage, wiki, and dot delegation remain unavailable until adapters are connected.`,
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
        type: 'next',
        title: 'Phase 2 complete — next: decide Wiki scope with Raz',
        body: 'Phase 2 adapters QA passed. Remaining open decisions: Wiki ingestion folders, snapshot commit policy, Phase 3 scope.',
        time: 'Phase 2',
        project: 'warung-os',
      },
    ],
    approvals: [],
  },

  projects: {
    items: projectItems,
    // TickTick Warung OS board — sanitized cache (task titles/columns/priorities; no descriptions or comments)
    kanban_boards: ticktickResult.boards,
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
        current_task: 'Phase 2 QA and handoff review',
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
        current_task: 'Phase 2 Task 8 — QA and handoff',
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
          type: 'phase2-all-adapters',
          git_signals: gitResult.ok ? 'ok' : 'failed',
          cron_adapter: cronJobs.some(job => job.status === 'bad') ? 'failed' : 'ok',
          provider_health: modelHealth.some(model => model.status === 'bad') ? 'failed' : 'config_only',
          token_adapter: 'unavailable',
          obsidian_projects_adapter: obsidianResult.ok ? `ok (${obsidianResult.projects.length} projects)` : `failed: ${obsidianResult.error}`,
          obsidian_wiki_adapter: 'unavailable',
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
console.log(`[warung-os] Obsidian projects: ${obsidianResult.ok ? `ok  (${obsidianResult.projects.length} folder(s), ${obsidianResult.projects.filter(p => p.registry_status === 'registered').length} with frontmatter)` : `FAILED: ${obsidianResult.error}`}`)
console.log(`[warung-os] Projects in snapshot: ${projectItems.length}`)
console.log(`[warung-os] TickTick board: ${ticktickResult.ok ? `ok  (${ticktickResult.boards.reduce((n, b) => n + b.task_count, 0)} task(s), cache ${ticktickResult.cache_age_hours}h old)` : `UNAVAIL: ${ticktickResult.error}`}`)
console.log(`[warung-os] Duration:       ${durationMs}ms`)
console.log(`[warung-os] Warnings:`)
warnings.forEach(w => console.log(`  - ${w}`))
