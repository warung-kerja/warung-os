#!/usr/bin/env node
/**
 * Warung OS — Phase 5 local publisher bridge
 *
 * Default mode is dry-run: validate hosted-export/latest.json + manifest.json,
 * check that publisher config exists, and print the target without uploading.
 * Real upload requires `--upload` plus local .env.publish credentials.
 *
 * Service-role credentials must stay on Raz's Mac only. They are never exposed
 * to Vite, Vercel, browser bundles, committed files, or docs with real values.
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const EXPORT_FILE = join(ROOT, 'hosted-export', 'latest.json')
const MANIFEST_FILE = join(ROOT, 'hosted-export', 'manifest.json')
const ENV_FILE = join(ROOT, '.env.publish')

function sha256(text) {
  return createHash('sha256').update(text).digest('hex')
}

function parseEnvFile(path) {
  if (!existsSync(path)) return {}
  const env = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '')
    env[key] = value
  }
  return env
}

function readConfig() {
  const fileEnv = parseEnvFile(ENV_FILE)
  const merged = { ...fileEnv, ...process.env }
  return {
    supabaseUrl: merged.SUPABASE_URL ?? '',
    serviceRoleKey: merged.SUPABASE_SERVICE_ROLE_KEY ?? '',
    bucket: merged.SUPABASE_STORAGE_BUCKET ?? 'warung-os-snapshots',
    objectName: merged.SUPABASE_STORAGE_OBJECT ?? 'latest.json',
  }
}

function assertPreparedExport() {
  if (!existsSync(EXPORT_FILE)) {
    throw new Error(`Missing ${EXPORT_FILE}. Run npm run snapshot:prepare-hosted first.`)
  }
  if (!existsSync(MANIFEST_FILE)) {
    throw new Error(`Missing ${MANIFEST_FILE}. Run npm run snapshot:prepare-hosted first.`)
  }

  const payload = readFileSync(EXPORT_FILE, 'utf8')
  const manifest = JSON.parse(readFileSync(MANIFEST_FILE, 'utf8'))
  const snapshot = JSON.parse(payload)
  const actualHash = sha256(payload)

  if (manifest.sha256 !== actualHash) {
    throw new Error(`Manifest sha256 mismatch. manifest=${manifest.sha256} actual=${actualHash}`)
  }
  if (manifest.upload_performed !== false) {
    throw new Error('Prepared manifest must have upload_performed=false before publishing.')
  }
  if (snapshot.meta?.source_scope !== 'hermes-only' || snapshot.operations?.source_scope !== 'hermes-only') {
    throw new Error('Prepared export must remain hermes-only scoped.')
  }
  if (snapshot.meta?.hosted_export?.upload_performed !== false) {
    throw new Error('Prepared snapshot must have hosted_export.upload_performed=false before publishing.')
  }

  return { payload, manifest, snapshot, sha256: actualHash }
}

function assertUploadConfig(config) {
  if (!config.supabaseUrl.startsWith('https://') || !config.supabaseUrl.includes('.supabase.co')) {
    throw new Error('SUPABASE_URL must be a Supabase project URL, e.g. https://PROJECT_REF.supabase.co')
  }
  if (!config.serviceRoleKey || config.serviceRoleKey.includes('YOUR_') || config.serviceRoleKey.length < 40) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing or still a placeholder in .env.publish.')
  }
  if (!config.bucket) throw new Error('SUPABASE_STORAGE_BUCKET is required.')
  if (!config.objectName.endsWith('.json')) throw new Error('SUPABASE_STORAGE_OBJECT must be a .json object name.')
}

async function uploadToSupabase(config, payload) {
  const baseUrl = config.supabaseUrl.replace(/\/$/, '')
  const objectPath = encodeURIComponent(config.objectName).replace(/%2F/g, '/')
  const url = `${baseUrl}/storage/v1/object/${encodeURIComponent(config.bucket)}/${objectPath}`

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${config.serviceRoleKey}`,
      apikey: config.serviceRoleKey,
      'Content-Type': 'application/json',
      'x-upsert': 'true',
    },
    body: payload,
  })

  const body = await res.text()
  if (!res.ok) {
    throw new Error(`Supabase upload failed: HTTP ${res.status} ${body}`)
  }

  return { url, status: res.status, body }
}

async function main() {
  const upload = process.argv.includes('--upload')
  const dryRun = !upload || process.argv.includes('--dry-run')
  const prepared = assertPreparedExport()
  const config = readConfig()
  const target = `${config.supabaseUrl || 'SUPABASE_URL_UNSET'}/storage/v1/object/${config.bucket}/${config.objectName}`

  console.log(`[warung-os] Prepared export verified: ${EXPORT_FILE}`)
  console.log(`[warung-os] sha256: ${prepared.sha256}`)
  console.log(`[warung-os] target: ${target}`)

  if (dryRun) {
    console.log('[warung-os] dry_run: true — no upload performed')
    console.log('[warung-os] upload command: npm run hosted:publish -- --upload')
    return
  }

  assertUploadConfig(config)
  const result = await uploadToSupabase(config, prepared.payload)
  const publishedAt = new Date().toISOString()
  const publishedManifest = {
    ...prepared.manifest,
    upload_performed: true,
    published_at: publishedAt,
    published_target: {
      storage_strategy: 'supabase-storage',
      bucket: config.bucket,
      object: config.objectName,
      url: result.url,
      status: result.status,
    },
  }
  writeFileSync(MANIFEST_FILE, JSON.stringify(publishedManifest, null, 2), 'utf8')

  console.log(`[warung-os] upload_performed: true · status: ${result.status}`)
  console.log(`[warung-os] manifest updated → ${MANIFEST_FILE}`)
}

main().catch((error) => {
  console.error(`[warung-os] Publish failed: ${error.message}`)
  process.exit(1)
})
