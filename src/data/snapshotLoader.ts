// Loads /snapshots/latest.json if present; returns null on 404 or parse failure.
// The browser app never executes shell commands — it only reads a static JSON file
// written by the local snapshot generator (scripts/generate-snapshot.mjs).

import type { WarungSnapshot } from '../types/snapshot'

export interface SnapshotLoadResult {
  snapshot: WarungSnapshot | null
  error: string | null
  attempted: boolean
}

export async function loadSnapshot(): Promise<SnapshotLoadResult> {
  try {
    const res = await fetch('/snapshots/latest.json', { cache: 'no-store' })
    if (res.status === 404) {
      return { snapshot: null, error: null, attempted: true }
    }
    if (!res.ok) {
      return { snapshot: null, error: `HTTP ${res.status}`, attempted: true }
    }
    const data = await res.json() as WarungSnapshot
    if (!data?.meta?.schema_version) {
      return { snapshot: null, error: 'Invalid snapshot schema — missing meta.schema_version', attempted: true }
    }
    if (data.meta.schema_version !== '1') {
      return { snapshot: null, error: `Unsupported schema_version: ${data.meta.schema_version}`, attempted: true }
    }
    return { snapshot: data, error: null, attempted: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { snapshot: null, error: msg, attempted: true }
  }
}
