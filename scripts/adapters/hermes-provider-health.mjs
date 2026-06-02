#!/usr/bin/env node
/**
 * Warung OS — Hermes provider health adapter
 *
 * Reads sanitized provider/model config, gateway state, and provider model catalog
 * from every discovered Hermes profile. Safe to run standalone for debugging:
 *
 *   node scripts/adapters/hermes-provider-health.mjs
 *
 * SAFETY CONTRACT:
 * - Reads config.yaml: model.default, model.provider, fallback_providers names only.
 *   No API keys, OAuth tokens, or credentials are read or emitted.
 * - Reads gateway_state.json: gateway_state, active_agents, platform names + states.
 *   No session transcripts, prompts, or delivery targets.
 * - Reads provider_models_cache.json: provider names, model counts, cache timestamps.
 *   Model names are extracted for count only; no credentials.
 * - Status reflects config metadata only — no live API health check or latency
 *   measurement is performed.
 * - Returns empty arrays with status:'bad'/'unconfigured' rows for missing files.
 *   Never fabricates live health data.
 *
 * Exports:
 *   collectProviderHealth(profiles, nowISO) → { modelHealth, gatewayStatus, providerCatalog }
 *
 * Output shapes match src/types/warung-os.ts:
 *   HermesModelHealth[], HermesGatewayStatus[], HermesProviderCatalogEntry[]
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

// ---- Internal: model/provider config health ----
// Reads only non-secret model/provider names from each profile's config.yaml.
// No live API health check — status is config_present, not live availability.
function _collectModelHealth(profiles, nowISO) {
  const rows = []

  for (const profile of profiles) {
    try {
      if (!existsSync(profile.configFile)) {
        rows.push({
          id: `hm-${safeId(profile.name)}-config-missing`,
          provider: null,
          model: null,
          status: 'unconfigured',
          latency_ms: null,
          is_primary: true,
          is_fallback: false,
          last_checked_at: nowISO,
          profile: profile.name,
        })
        continue
      }

      const config = readFileSync(profile.configFile, 'utf8')
      const modelBlock = config.match(/^model:\n((?:\s+.*\n?)*)/m)?.[1] ?? ''
      const defaultModel = modelBlock.match(/^\s+default:\s*['"]?([^'"\n#]+)['"]?/m)?.[1]?.trim() || null
      const provider = modelBlock.match(/^\s+provider:\s*['"]?([^'"\n#]+)['"]?/m)?.[1]?.trim() || null
      const fallbackLine = config.match(/^fallback_providers:\s*(.*)$/m)?.[1]?.trim() ?? '[]'
      const hasFallback = fallbackLine !== '[]' && fallbackLine !== ''

      // Extract actual fallback provider names (safe non-secret strings).
      // Handles both inline list and multiline YAML list formats.
      const fallbackInline = fallbackLine.match(/^\[(.+)\]$/)?.[1]
      let fallbackProviders = []
      if (fallbackInline) {
        // Inline array: [anthropic, openai]
        fallbackProviders = fallbackInline.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
      } else if (hasFallback) {
        // Multiline YAML list starting on next lines
        const multiBlock = config.match(/^fallback_providers:\s*\n((?:\s+-\s+.*\n?)+)/m)?.[1] ?? ''
        fallbackProviders = multiBlock.split('\n')
          .map(l => l.match(/^\s+-\s+['"]?([^'"\n#]+)['"]?/)?.[1]?.trim())
          .filter(Boolean)
      }

      if (defaultModel || provider) {
        rows.push({
          id: `hm-${safeId(profile.name)}-config-primary`,
          provider,
          model: defaultModel,
          status: defaultModel && provider ? 'config_present' : 'warn',
          latency_ms: null,
          is_primary: true,
          is_fallback: false,
          last_checked_at: nowISO,
          profile: profile.name,
        })
      }

      rows.push({
        id: `hm-${safeId(profile.name)}-config-fallback`,
        provider: fallbackProviders.length > 0 ? fallbackProviders.join(', ') : null,
        model: null,
        status: hasFallback ? 'config_present' : 'unconfigured',
        latency_ms: null,
        is_primary: false,
        is_fallback: true,
        last_checked_at: nowISO,
        profile: profile.name,
      })
    } catch (err) {
      rows.push({
        id: `hm-${safeId(profile.name)}-config-error`,
        provider: null,
        model: null,
        status: 'bad',
        latency_ms: null,
        is_primary: true,
        is_fallback: false,
        last_checked_at: nowISO,
        profile: profile.name,
        error: `Unable to read sanitized Hermes model config for profile ${profile.name}: ${String(err?.message ?? err)}`,
      })
    }
  }

  return rows
}

// ---- Internal: gateway state ----
// Reads gateway_state.json per profile: gateway_state, active_agents, platform connectivity.
// Does NOT read session transcripts, API keys, cron prompts, or credentials.
function _collectGatewayStatus(profiles, nowISO) {
  const rows = []

  for (const profile of profiles) {
    const stateFile = join(profile.dir, 'gateway_state.json')
    try {
      if (!existsSync(stateFile)) continue

      const raw = readFileSync(stateFile, 'utf8')
      const state = JSON.parse(raw)

      const platforms = Object.entries(state.platforms ?? {}).map(([name, info]) => ({
        name,
        state: info?.state ?? 'unknown',
        error_message: info?.error_message ?? null,
        updated_at: info?.updated_at ?? null,
      }))

      rows.push({
        id: `gw-${safeId(profile.name)}`,
        profile: profile.name,
        gateway_state: state.gateway_state ?? 'unknown',
        active_agents: typeof state.active_agents === 'number' ? state.active_agents : 0,
        platforms,
        updated_at: state.updated_at ?? null,
        synced_at: nowISO,
      })
    } catch (err) {
      rows.push({
        id: `gw-${safeId(profile.name)}-error`,
        profile: profile.name,
        gateway_state: 'unknown',
        active_agents: 0,
        platforms: [],
        updated_at: null,
        synced_at: nowISO,
        error: `Failed to read gateway_state.json for profile ${profile.name}: ${String(err?.message ?? err)}`,
      })
    }
  }

  return rows
}

// ---- Internal: provider models catalog ----
// Reads provider_models_cache.json per profile: provider names, model counts, cache age.
// No credentials, no API keys. Model names contribute to count only; not emitted.
function _collectProviderCatalog(profiles, nowISO) {
  const rows = []

  for (const profile of profiles) {
    const catalogFile = join(profile.dir, 'provider_models_cache.json')
    try {
      if (!existsSync(catalogFile)) continue

      const raw = readFileSync(catalogFile, 'utf8')
      const cache = JSON.parse(raw)

      for (const [providerName, info] of Object.entries(cache)) {
        const models = Array.isArray(info?.models) ? info.models : []
        // 'at' is a Unix epoch float timestamp
        const cachedAt = typeof info?.at === 'number'
          ? new Date(info.at * 1000).toISOString()
          : null

        rows.push({
          id: `pc-${safeId(profile.name)}-${safeId(providerName)}`,
          profile: profile.name,
          provider: providerName,
          model_count: models.length,
          cached_at: cachedAt,
          synced_at: nowISO,
        })
      }
    } catch (_) {}
  }

  return rows
}

/**
 * Collect Hermes provider health data: model/provider config, gateway state,
 * and provider model catalog.
 *
 * @param {Array<{name: string, dir: string, configFile: string}>} profiles
 * @param {string} nowISO — ISO timestamp for synced_at fields
 * @returns {{
 *   modelHealth: import('../../src/types/warung-os.js').HermesModelHealth[],
 *   gatewayStatus: import('../../src/types/warung-os.js').HermesGatewayStatus[],
 *   providerCatalog: import('../../src/types/warung-os.js').HermesProviderCatalogEntry[]
 * }}
 */
export function collectProviderHealth(profiles, nowISO) {
  return {
    modelHealth:    _collectModelHealth(profiles, nowISO),
    gatewayStatus:  _collectGatewayStatus(profiles, nowISO),
    providerCatalog: _collectProviderCatalog(profiles, nowISO),
  }
}

// ---- Standalone execution ----
// Run directly for debugging: node scripts/adapters/hermes-provider-health.mjs
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
  const result = collectProviderHealth(profiles, nowISO)

  console.log(JSON.stringify(result, null, 2))
  process.stderr.write(
    `[hermes-provider-health] modelHealth: ${result.modelHealth.length}, gatewayStatus: ${result.gatewayStatus.length}, providerCatalog: ${result.providerCatalog.length}\n`
  )
}
