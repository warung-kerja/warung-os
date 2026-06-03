#!/usr/bin/env node
/**
 * Warung OS — Hermes cron health adapter
 *
 * Reads sanitized cron metadata and actual run history from every discovered
 * Hermes profile. Safe to run standalone for debugging:
 *
 *   node scripts/adapters/hermes-cron.mjs
 *
 * SAFETY CONTRACT:
 * - Reads cron/jobs.json: job names, schedules, enabled flag, models, skills,
 *   last_run_at, next_run_at, last_status, repeat.completed. Prompts, delivery
 *   targets, chat IDs, and script contents are never read.
 * - Reads cron/output/ directory filenames only (YYYY-MM-DD_HH-MM-SS.md).
 *   File contents are never opened.
 * - Returns an empty array with a status:'bad' row if a profile is unreadable.
 *   Never fabricates data for missing profiles.
 *
 * Exports:
 *   collectCronJobs(profiles, nowISO) → CronJobSnapshot[]
 *
 * CronJobSnapshot shape matches src/types/warung-os.ts#CronJobSnapshot.
 */

import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Shared with generate-snapshot.mjs — pure transform, safe to duplicate.
function safeId(value) {
  return String(value ?? 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown'
}

// ---- Internal: cron job metadata ----
// Reads only safe non-secret fields from each profile's cron/jobs.json.
function _collectCronHealth(profiles, nowISO) {
  const rows = []

  for (const profile of profiles) {
    try {
      if (!existsSync(profile.cronFile)) continue

      const raw = readFileSync(profile.cronFile, 'utf8')
      const parsed = JSON.parse(raw)
      const jobs = Array.isArray(parsed.jobs) ? parsed.jobs : []

      rows.push(...jobs.map(job => {
        const lastStatus = job.last_status ?? null
        const status = job.enabled === false
          ? 'warn'
          : lastStatus === 'error' || job.last_error
            ? 'bad'
            : 'ok'

        return {
          id: `cj-${safeId(profile.name)}-${job.id ?? 'unknown'}`,
          agent: profile.name,
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
          // repeat.completed = total successful runs recorded in jobs.json (safe integer)
          completed_runs: typeof job.repeat?.completed === 'number' ? job.repeat.completed : null,
          // skills = list of Hermes skill names assigned to the job (non-secret strings)
          skills: Array.isArray(job.skills) && job.skills.length > 0
            ? job.skills
            : (job.skill ? [job.skill] : []),
          synced_at: nowISO,
        }
      }))
    } catch (err) {
      rows.push({
        id: `cj-${safeId(profile.name)}-cron-read-error`,
        agent: profile.name,
        name: `Hermes cron metadata (${profile.name})`,
        schedule: null,
        status: 'bad',
        enabled: false,
        model: null,
        model_source: null,
        last_run_at: null,
        next_run_at: null,
        duration_ms: null,
        error: `Unable to read sanitized Hermes cron metadata for profile ${profile.name}: ${String(err?.message ?? err)}`,
        synced_at: nowISO,
      })
    }
  }

  return rows
}

// ---- Internal: 30-day daily run histogram from parsed timestamps ----
// Buckets all timestamps into UTC calendar days; returns exactly windowDays entries.
function _buildDailyHistory(allTimestamps, windowDays) {
  const counts = {}
  const now = new Date()
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const cutoffUTC = new Date(todayUTC)
  cutoffUTC.setUTCDate(cutoffUTC.getUTCDate() - (windowDays - 1))
  const cutoffDateKey = cutoffUTC.toISOString().slice(0, 10)

  for (const ts of allTimestamps) {
    const dateKey = String(ts).slice(0, 10)
    // Compare YYYY-MM-DD strings so the oldest included day is a full UTC calendar day,
    // not "the last N*24 hours" from the current clock time.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || dateKey < cutoffDateKey) continue
    counts[dateKey] = (counts[dateKey] ?? 0) + 1
  }

  const result = []
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(todayUTC)
    d.setUTCDate(d.getUTCDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    result.push({ date: dateStr, count: counts[dateStr] ?? 0 })
  }
  return result
}

// ---- Internal: cron run history from output filenames ----
// Reads cron/output/<jobId>/ directory filenames only. File contents are never opened.
// Filename format: YYYY-MM-DD_HH-MM-SS.md
function _collectCronRunHistory(profiles) {
  const history = {}

  for (const profile of profiles) {
    const cronOutputDir = join(profile.dir, 'cron', 'output')
    if (!existsSync(cronOutputDir)) continue

    try {
      const jobDirs = readdirSync(cronOutputDir, { withFileTypes: true })
        .filter(e => e.isDirectory())

      for (const jobDir of jobDirs) {
        const jobId = jobDir.name
        const jobOutputPath = join(cronOutputDir, jobId)

        try {
          const files = readdirSync(jobOutputPath)
            .filter(f => f.endsWith('.md'))
            .sort()

          const runTimestamps = files.map(f => {
            const m = f.match(/^(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})\.md$/)
            if (!m) return null
            try {
              return new Date(`${m[1]}T${m[2]}:${m[3]}:${m[4]}`).toISOString()
            } catch { return null }
          }).filter(Boolean)

          const key = `${safeId(profile.name)}/${jobId}`
          history[key] = {
            job_id: jobId,
            profile: profile.name,
            run_count: files.length,
            recent_run_timestamps: runTimestamps.slice(-5),
            // All timestamps are kept here for daily histogram computation.
            // They are not written to the snapshot directly.
            _all_timestamps: runTimestamps,
          }
        } catch (_) {}
      }
    } catch (_) {}
  }

  return history
}

// ---- Internal: enrich cron jobs with run history ----
function _enrichCronJobsWithRunHistory(cronJobsRaw, runHistory) {
  return cronJobsRaw.map(job => {
    const profileSafe = safeId(job.agent ?? '')
    const rawJobId = job.id.replace(new RegExp(`^cj-${profileSafe}-`), '')
    const historyKey = `${profileSafe}/${rawJobId}`
    const hist = runHistory[historyKey]
    if (!hist) return job
    return {
      ...job,
      run_count: hist.run_count,
      recent_run_timestamps: hist.recent_run_timestamps,
      run_history_daily: _buildDailyHistory(hist._all_timestamps ?? [], 30),
    }
  })
}

/**
 * Collect Hermes cron job health, including run history from output filenames.
 *
 * @param {Array<{name: string, dir: string, cronFile: string}>} profiles
 * @param {string} nowISO — ISO timestamp for synced_at fields
 * @returns {import('../../src/types/warung-os.js').CronJobSnapshot[]}
 */
export function collectCronJobs(profiles, nowISO) {
  const cronJobsRaw = _collectCronHealth(profiles, nowISO)
  const runHistory  = _collectCronRunHistory(profiles)
  return _enrichCronJobsWithRunHistory(cronJobsRaw, runHistory)
}

// ---- Standalone execution ----
// Run directly for debugging: node scripts/adapters/hermes-cron.mjs
if (process.argv[1] === __filename) {
  const HERMES_HOME = '/Users/gabi/.hermes'
  const HERMES_PROFILES_DIR = join(HERMES_HOME, 'profiles')

  const profiles = [{
    name: 'default',
    dir: HERMES_HOME,
    cronFile: join(HERMES_HOME, 'cron', 'jobs.json'),
    configFile: join(HERMES_HOME, 'config.yaml'),
  }]

  try {
    if (existsSync(HERMES_PROFILES_DIR)) {
      const entries = readdirSync(HERMES_PROFILES_DIR, { withFileTypes: true })
        .filter(e => e.isDirectory() && !e.name.startsWith('.'))
        .map(e => e.name)
        .sort()
      for (const name of entries) {
        const dir = join(HERMES_PROFILES_DIR, name)
        profiles.push({ name, dir, cronFile: join(dir, 'cron', 'jobs.json'), configFile: join(dir, 'config.yaml') })
      }
    }
  } catch (_) {}

  const nowISO = new Date().toISOString()
  const result = collectCronJobs(profiles, nowISO)

  console.log(JSON.stringify(result, null, 2))
  process.stderr.write(
    `[hermes-cron] ${result.length} job(s) across ${new Set(result.map(j => j.agent)).size} profile(s)\n`
  )
}
