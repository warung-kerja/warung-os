#!/usr/bin/env node
/**
 * Warung OS — Phase 5 hosted mirror preflight check
 *
 * Reports local readiness for the hosted-mirror path without contacting
 * Supabase/Vercel, creating accounts, uploading, or deploying.
 *
 * Checks:
 *   1. Snapshot pipeline  — latest.json exists and is hermes-only + real
 *   2. Hosted export      — prepared export + manifest exist and hash verifies
 *   3. Env boundaries     — template shape correct, gitignore protects secrets
 *   4. P5.5 blockers      — what Raz must confirm before auth-wall implementation
 *
 * No network calls. No uploads. Reads local env state but never prints secret values.
 * Run standalone: node scripts/hosted-preflight.mjs
 * Run via npm:    npm run hosted:preflight
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const SNAPSHOT_FILE = join(ROOT, 'public', 'snapshots', 'latest.json')
const EXPORT_FILE = join(ROOT, 'hosted-export', 'latest.json')
const MANIFEST_FILE = join(ROOT, 'hosted-export', 'manifest.json')
const ENV_EXAMPLE = join(ROOT, '.env.example')
const ENV_PUBLISH_EXAMPLE = join(ROOT, '.env.publish.example')
const ENV_LOCAL = join(ROOT, '.env.local')
const ENV_PUBLISH = join(ROOT, '.env.publish')
const GITIGNORE = join(ROOT, '.gitignore')
const ARCH_DOC = join(ROOT, 'docs', 'hosted-mirror-architecture.md')
const CONFIG_TEMPLATE = join(ROOT, 'docs', 'supabase-vercel-config-template.md')

// ─── helpers ─────────────────────────────────────────────────────────────────

const PASS = '✓'
const FAIL = '✗'
const INFO = '·'

function sha256(text) {
  return createHash('sha256').update(text).digest('hex')
}

function kbStr(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`
}

function ageStr(isoTimestamp) {
  const ms = Date.now() - Date.parse(isoTimestamp)
  if (!Number.isFinite(ms)) return 'unknown age'
  const minutes = Math.floor(ms / 60000)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m ago`
}

function parseEnvFile(path) {
  if (!existsSync(path)) return {}
  const env = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
  }
  return env
}

function row(pass, label, detail) {
  const icon = pass === true ? PASS : pass === false ? FAIL : INFO
  const suffix = detail ? ` (${detail})` : ''
  console.log(`  ${icon} ${label}${suffix}`)
  return pass
}

function section(title) {
  console.log(`\n${title}`)
  console.log('─'.repeat(Math.min(title.length, 60)))
}

// ─── 1. snapshot pipeline ─────────────────────────────────────────────────────

function checkSnapshotPipeline() {
  section('SNAPSHOT PIPELINE')
  const checks = []

  if (!existsSync(SNAPSHOT_FILE)) {
    checks.push(row(false, 'public/snapshots/latest.json exists', 'run: npm run snapshot:generate'))
    return { pass: false, checks }
  }

  const stat = statSync(SNAPSHOT_FILE)
  let snapshot
  try {
    snapshot = JSON.parse(readFileSync(SNAPSHOT_FILE, 'utf8'))
  } catch {
    checks.push(row(false, 'public/snapshots/latest.json parseable', 'invalid JSON'))
    return { pass: false, checks }
  }

  checks.push(row(true, 'public/snapshots/latest.json exists', kbStr(stat.size)))

  const schemaOk = snapshot?.meta?.schema_version === '1'
  checks.push(row(schemaOk, 'schema_version: 1', schemaOk ? undefined : `got ${snapshot?.meta?.schema_version}`))

  const scopeOk =
    snapshot?.meta?.source_scope === 'hermes-only' &&
    snapshot?.operations?.source_scope === 'hermes-only'
  checks.push(row(scopeOk, 'source_scope: hermes-only', scopeOk ? undefined : 'scope mismatch'))

  const demoOk = snapshot?.meta?.is_demo === false
  checks.push(row(demoOk, 'is_demo: false (real snapshot)', demoOk ? undefined : 'snapshot is a demo fixture'))

  const ts = snapshot?.meta?.generated_at
  const ageMs = ts ? Date.now() - Date.parse(ts) : Infinity
  const ageOk = ageMs < 24 * 60 * 60 * 1000
  checks.push(row(ageOk, `generated_at: ${ts ?? 'missing'}`, ts ? ageStr(ts) : 'no timestamp'))

  return { pass: checks.every((c) => c !== false), checks }
}

// ─── 2. hosted export ─────────────────────────────────────────────────────────

function checkHostedExport() {
  section('HOSTED EXPORT')
  const checks = []

  const exportExists = existsSync(EXPORT_FILE)
  const manifestExists = existsSync(MANIFEST_FILE)

  checks.push(
    row(
      exportExists,
      'hosted-export/latest.json exists',
      exportExists ? kbStr(statSync(EXPORT_FILE).size) : 'run: npm run snapshot:prepare-hosted',
    ),
  )
  checks.push(
    row(
      manifestExists,
      'hosted-export/manifest.json exists',
      manifestExists ? undefined : 'run: npm run snapshot:prepare-hosted',
    ),
  )

  if (!exportExists || !manifestExists) {
    return { pass: false, checks }
  }

  const payload = readFileSync(EXPORT_FILE, 'utf8')
  const manifest = JSON.parse(readFileSync(MANIFEST_FILE, 'utf8'))
  const actualHash = sha256(payload)
  const hashOk = manifest.sha256 === actualHash
  checks.push(
    row(hashOk, 'sha256 hash verified', hashOk ? `${manifest.sha256.slice(0, 12)}…` : 'mismatch — re-run prepare-hosted'),
  )

  const uploadStateOk = manifest.upload_performed === false || manifest.upload_performed === true
  checks.push(
    row(
      uploadStateOk,
      `upload_performed: ${manifest.upload_performed}`,
      manifest.upload_performed === true ? 'published to configured remote target' : 'ready to publish',
    ),
  )

  const hostedSnapshot = JSON.parse(payload)
  const exportScopeOk = hostedSnapshot?.meta?.source_scope === 'hermes-only'
  checks.push(row(exportScopeOk, 'source_scope: hermes-only in export'))

  const maxAge = manifest.max_age_minutes ?? hostedSnapshot?.meta?.max_age_minutes
  checks.push(row(maxAge > 0, `max_age_minutes: ${maxAge ?? 'missing'}`))

  return { pass: checks.every((c) => c !== false), checks }
}

// ─── 3. env variable boundary ─────────────────────────────────────────────────
//
// Browser-safe (VITE_* — can be in Vercel env vars and frontend bundle):
//   VITE_WARUNG_*         — runtime modes, URLs, thresholds
//   VITE_SUPABASE_URL     — public Supabase project URL (P5.5)
//   VITE_SUPABASE_ANON_KEY — anon/public key (P5.5)
//
// Publisher-only (local .env.publish — NEVER in browser/Vercel/git):
//   SUPABASE_URL              — used only by publish-snapshot.mjs
//   SUPABASE_SERVICE_ROLE_KEY — upload credential; local Mac only
//   SUPABASE_STORAGE_BUCKET   — bucket name
//   SUPABASE_STORAGE_OBJECT   — object name

const BROWSER_SAFE_VARS = [
  { name: 'VITE_WARUNG_SNAPSHOT_MODE', note: 'snapshot source mode' },
  { name: 'VITE_WARUNG_LOCAL_SNAPSHOT_URL', note: 'local dev snapshot URL' },
  { name: 'VITE_WARUNG_PREPARED_SNAPSHOT_URL', note: 'prepared export URL' },
  { name: 'VITE_WARUNG_REMOTE_SNAPSHOT_URL', note: 'remote snapshot URL (P5.5)' },
  { name: 'VITE_WARUNG_REMOTE_AUTH_MODE', note: 'auth mode (P5.5: supabase-auth)' },
  { name: 'VITE_WARUNG_SNAPSHOT_MAX_AGE_MINUTES', note: 'stale threshold' },
  { name: 'VITE_SUPABASE_URL', note: 'P5.5 — public project URL, safe in bundle' },
  { name: 'VITE_SUPABASE_ANON_KEY', note: 'P5.5 — legacy anon/public key, safe in bundle' },
  { name: 'VITE_SUPABASE_PUBLISHABLE_KEY', note: 'P5.5 — current Supabase publishable key, safe in bundle' },
]

const PUBLISHER_ONLY_VARS = [
  { name: 'SUPABASE_URL', note: 'publisher upload target' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', note: 'upload credential — NEVER in browser/Vercel' },
  { name: 'SUPABASE_STORAGE_BUCKET', note: 'bucket name' },
  { name: 'SUPABASE_STORAGE_OBJECT', note: 'object path' },
  { name: 'WARUNG_OS_PUBLISH_MAX_AGE_MINUTES', note: 'override freshness threshold' },
]

function checkEnvBoundary() {
  section('ENV VARIABLE BOUNDARY')
  const checks = []

  const envExampleExists = existsSync(ENV_EXAMPLE)
  const publishExampleExists = existsSync(ENV_PUBLISH_EXAMPLE)
  checks.push(row(envExampleExists, '.env.example present (browser/Vercel template)'))
  checks.push(row(publishExampleExists, '.env.publish.example present (publisher template)'))

  const gitignoreContent = existsSync(GITIGNORE) ? readFileSync(GITIGNORE, 'utf8') : ''
  checks.push(
    row(
      gitignoreContent.includes('.env.*') || gitignoreContent.includes('.env.publish'),
      '.gitignore protects .env.publish',
    ),
  )
  checks.push(row(gitignoreContent.includes('hosted-export/'), '.gitignore protects hosted-export/'))
  checks.push(
    row(
      gitignoreContent.includes('public/snapshots/latest.json'),
      '.gitignore protects public/snapshots/latest.json',
    ),
  )

  const envExampleContent = envExampleExists ? readFileSync(ENV_EXAMPLE, 'utf8') : ''
  const publishExampleContent = publishExampleExists ? readFileSync(ENV_PUBLISH_EXAMPLE, 'utf8') : ''

  // Critical safety rule: service-role key must not leak into browser template
  const browserEnvRuntimeLines = envExampleContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .join('\n')
  const noServiceRoleInBrowser = !browserEnvRuntimeLines.includes('SUPABASE_SERVICE_ROLE_KEY')
  checks.push(
    row(
      noServiceRoleInBrowser,
      'SUPABASE_SERVICE_ROLE_KEY absent from .env.example (browser template)',
      noServiceRoleInBrowser ? 'boundary intact' : 'VIOLATION — remove from browser template',
    ),
  )

  // Publisher template must document the required vars
  for (const v of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_STORAGE_BUCKET']) {
    checks.push(row(publishExampleContent.includes(v), `.env.publish.example documents ${v}`))
  }

  // Print boundary reference table
  console.log(`\n  ${INFO} Browser-safe (VITE_* — safe in Vercel env vars and frontend bundle):`)
  for (const v of BROWSER_SAFE_VARS) {
    const inTemplate = envExampleContent.includes(v.name)
    const p55Missing = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY'].includes(v.name) && !inTemplate
    console.log(`    ${inTemplate ? PASS : INFO} ${v.name.padEnd(38)} ${p55Missing ? '[P5.5 — not yet in .env.example]' : v.note}`)
  }

  console.log(`\n  ${INFO} Publisher-only (local .env.publish — NEVER in browser bundle, Vercel, or git):`)
  for (const v of PUBLISHER_ONLY_VARS) {
    const inPublish = publishExampleContent.includes(v.name)
    console.log(`    ${inPublish ? PASS : INFO} ${v.name.padEnd(38)} ${v.note}`)
  }

  return { pass: checks.every((c) => c !== false), checks }
}

// ─── 4. Hosting & publishing status ──────────────────────────────────────────
// Vercel is live (public, no-auth). P5.5 auth-gate is deferred — Raz chose
// public/no-auth for now. This section tracks the snapshot publishing pipeline.

function checkPublishingStatus() {
  section('HOSTING & PUBLISHING STATUS')
  const publishEnv = parseEnvFile(ENV_PUBLISH)
  const manifest = existsSync(MANIFEST_FILE) ? JSON.parse(readFileSync(MANIFEST_FILE, 'utf8')) : null

  const confirmedProject = publishEnv.SUPABASE_URL === 'https://kqkjparpdgcmfkohmtgq.supabase.co'
  const hasPublisher = Boolean(
    publishEnv.SUPABASE_URL &&
      publishEnv.SUPABASE_SERVICE_ROLE_KEY &&
      publishEnv.SUPABASE_STORAGE_BUCKET &&
      publishEnv.SUPABASE_STORAGE_OBJECT,
  )
  const uploaded = manifest?.upload_performed === true

  // Vercel is live — informational only, no network check needed.
  console.log(`  ${PASS} Vercel deployment live: warung-os-online.vercel.app (public, no-auth)`)
  console.log(`    ${INFO} GitHub warung-kerja/warung-os auto-deploys main branch to Vercel.`)
  console.log(`    ${INFO} Auth gate (P5.5) is deferred — Raz chose public/no-auth for now.`)
  console.log('')

  console.log(`  Publishing pipeline — items needed to push snapshots to Supabase Storage:`)

  const publishingChecks = [
    {
      label: 'Supabase project configured in .env.publish',
      detail: confirmedProject
        ? 'warung-os Supabase project URL confirmed in .env.publish.'
        : 'Set SUPABASE_URL=https://kqkjparpdgcmfkohmtgq.supabase.co in .env.publish.',
      pass: confirmedProject,
    },
    {
      label: 'Full publisher credentials in .env.publish',
      detail: hasPublisher
        ? 'SUPABASE_URL, SERVICE_ROLE_KEY, bucket, and object path all present.'
        : 'Create .env.publish from .env.publish.example with all four required vars.',
      pass: hasPublisher,
    },
    {
      label: 'At least one snapshot uploaded to Supabase Storage',
      detail: uploaded
        ? 'upload_performed: true recorded in manifest — bucket is confirmed writable.'
        : 'Run npm run hosted:publish -- --upload once publisher credentials are set.',
      pass: uploaded,
    },
  ]

  for (const b of publishingChecks) {
    console.log(`  ${b.pass ? PASS : FAIL} ${b.label}`)
    console.log(`    ${INFO} ${b.detail}`)
  }

  const archDocOk = existsSync(ARCH_DOC)
  const configTemplateOk = existsSync(CONFIG_TEMPLATE)
  console.log(`\n  Implementation docs:`)
  console.log(`  ${archDocOk ? PASS : FAIL} docs/hosted-mirror-architecture.md`)
  console.log(`  ${configTemplateOk ? PASS : FAIL} docs/supabase-vercel-config-template.md`)

  const pendingCount = publishingChecks.filter((b) => !b.pass).length
  return { pass: pendingCount === 0, pendingCount }
}

// ─── summary ─────────────────────────────────────────────────────────────────

function main() {
  const now = new Date().toISOString()
  console.log(`[warung-os] Hosted Mirror Preflight — ${now}`)

  const snapshotResult = checkSnapshotPipeline()
  const exportResult = checkHostedExport()
  const envResult = checkEnvBoundary()
  const publishResult = checkPublishingStatus()

  section('PREFLIGHT SUMMARY')
  console.log(
    `  ${snapshotResult.pass ? PASS : FAIL} Snapshot pipeline:       ${snapshotResult.pass ? 'ready' : 'needs attention — run npm run snapshot:generate'}`,
  )
  console.log(
    `  ${exportResult.pass ? PASS : FAIL} Hosted export:           ${exportResult.pass ? 'prepared and verified' : 'not prepared — run npm run snapshot:prepare-hosted'}`,
  )
  console.log(
    `  ${envResult.pass ? PASS : FAIL} Env variable boundaries: ${envResult.pass ? 'correct — no secret leakage into browser templates' : 'needs attention'}`,
  )
  console.log(
    `  ${PASS} Vercel deployment:       live at warung-os-online.vercel.app (public, no-auth)`,
  )
  console.log(
    `  ${publishResult.pass ? PASS : INFO} Publishing pipeline:     ${
      publishResult.pass ? 'publisher configured and upload verified' : `${publishResult.pendingCount} item(s) pending before live Supabase publishing`
    }`,
  )
  console.log('')

  const locallyReady = snapshotResult.pass && exportResult.pass && envResult.pass

  if (locallyReady) {
    console.log('  RESULT: LOCAL SNAPSHOT PIPELINE READY')
    console.log('  The snapshot is prepared and passes all safety checks.')
    console.log('  Vercel is live (public, no-auth). Publishing pipeline items above are optional.')
    console.log('  Auth gate (P5.5) is deferred — Raz chose public/no-auth for now.')
  } else {
    console.log('  RESULT: LOCAL SETUP INCOMPLETE — fix the above items')
    if (!snapshotResult.pass) console.log('  → Run: npm run snapshot:generate')
    if (!exportResult.pass) console.log('  → Run: npm run snapshot:prepare-hosted')
  }

  console.log('')
  process.exit(locallyReady ? 0 : 1)
}

main()
