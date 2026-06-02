// Warung OS snapshot loading boundary.
//
// The browser app never executes shell commands. It only reads JSON snapshots
// from an explicit source: local dev snapshot, prepared hosted export, or a
// future remote authenticated snapshot endpoint.

import type { WarungSnapshot } from '../types/snapshot'

export type SnapshotSourceMode = 'local' | 'prepared' | 'remote'
export type SnapshotLoadStatus = 'fresh' | 'stale' | 'unavailable' | 'auth_required' | 'error'

export interface SnapshotSourceConfig {
  mode: SnapshotSourceMode
  url: string
  authMode: 'none' | 'supabase-auth-placeholder'
  maxAgeMinutes: number
}

export interface SnapshotLoadResult {
  snapshot: WarungSnapshot | null
  error: string | null
  attempted: boolean
  status: SnapshotLoadStatus
  source: SnapshotSourceConfig
}

function readEnv(key: string): string | undefined {
  return import.meta.env?.[key] as string | undefined
}

function numberEnv(key: string, fallback: number): number {
  const raw = readEnv(key)
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function getSnapshotSourceConfig(): SnapshotSourceConfig {
  const requestedMode = readEnv('VITE_WARUNG_SNAPSHOT_MODE')
  const mode: SnapshotSourceMode = requestedMode === 'prepared' || requestedMode === 'remote' ? requestedMode : 'local'
  const maxAgeMinutes = numberEnv('VITE_WARUNG_SNAPSHOT_MAX_AGE_MINUTES', 60)

  if (mode === 'remote') {
    return {
      mode,
      url: readEnv('VITE_WARUNG_REMOTE_SNAPSHOT_URL') ?? '',
      authMode: readEnv('VITE_WARUNG_REMOTE_AUTH_MODE') === 'supabase-auth-placeholder' ? 'supabase-auth-placeholder' : 'none',
      maxAgeMinutes,
    }
  }

  if (mode === 'prepared') {
    return {
      mode,
      url: readEnv('VITE_WARUNG_PREPARED_SNAPSHOT_URL') ?? '/hosted-export/latest.json',
      authMode: 'none',
      maxAgeMinutes,
    }
  }

  return {
    mode: 'local',
    url: readEnv('VITE_WARUNG_LOCAL_SNAPSHOT_URL') ?? '/snapshots/latest.json',
    authMode: 'none',
    maxAgeMinutes,
  }
}

function validateSnapshot(data: WarungSnapshot): string | null {
  if (!data?.meta?.schema_version) return 'Invalid snapshot schema — missing meta.schema_version'
  if (data.meta.schema_version !== '1') return `Unsupported schema_version: ${data.meta.schema_version}`
  if (data.meta.source_scope !== 'hermes-only') return `Unsupported source_scope: ${data.meta.source_scope}`
  if (data.operations?.source_scope !== 'hermes-only') return 'operations.source_scope must be hermes-only'
  return null
}

function isSnapshotStale(snapshot: WarungSnapshot, config: SnapshotSourceConfig): boolean {
  const timestamp = snapshot.meta.published_at ?? snapshot.meta.generated_at
  const maxAgeMinutes = snapshot.meta.max_age_minutes ?? config.maxAgeMinutes
  const parsed = Date.parse(timestamp)
  if (!Number.isFinite(parsed)) return false
  return Date.now() - parsed > maxAgeMinutes * 60 * 1000
}

export async function loadSnapshot(config = getSnapshotSourceConfig()): Promise<SnapshotLoadResult> {
  if (config.mode === 'remote' && !config.url) {
    return { snapshot: null, error: 'Remote snapshot URL is not configured.', attempted: false, status: 'unavailable', source: config }
  }

  if (config.mode === 'remote' && config.authMode === 'supabase-auth-placeholder') {
    return { snapshot: null, error: 'Remote snapshot requires Supabase auth. Auth wall is scheduled for Phase 5.5.', attempted: false, status: 'auth_required', source: config }
  }

  try {
    const res = await fetch(config.url, { cache: 'no-store' })
    if (res.status === 401 || res.status === 403) {
      return { snapshot: null, error: `Auth required: HTTP ${res.status}`, attempted: true, status: 'auth_required', source: config }
    }
    if (res.status === 404) {
      return { snapshot: null, error: null, attempted: true, status: 'unavailable', source: config }
    }
    if (!res.ok) {
      return { snapshot: null, error: `HTTP ${res.status}`, attempted: true, status: 'error', source: config }
    }

    const data = await res.json() as WarungSnapshot
    const validationError = validateSnapshot(data)
    if (validationError) {
      return { snapshot: null, error: validationError, attempted: true, status: 'error', source: config }
    }

    const status: SnapshotLoadStatus = isSnapshotStale(data, config) ? 'stale' : 'fresh'
    return { snapshot: data, error: null, attempted: true, status, source: config }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { snapshot: null, error: msg, attempted: true, status: 'error', source: config }
  }
}
