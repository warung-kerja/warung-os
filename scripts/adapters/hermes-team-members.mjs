#!/usr/bin/env node
/**
 * Warung OS — Hermes profiles/team status adapter
 *
 * ADAPTER STATUS: PARTIAL LIVE SOURCE.
 * Discovers Hermes profiles from local profile directories and reads only safe
 * config metadata needed for display: profile name, configured provider/model,
 * and whether the profile has a config file. It does not read conversations,
 * prompts, memories, OAuth tokens, credential pools, .env files, or secrets.
 *
 * Important: Hermes currently has no canonical live per-profile presence source
 * for "active/idle/current task". Until that exists, discovered profiles are
 * marked `waiting` and current_task stays null rather than fabricating status.
 *
 * Export: collectTeamMembers(profiles, nowISO) → { members, note }
 * Run standalone: node scripts/adapters/hermes-team-members.mjs
 */

import { dirname, basename } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)

function readSafeModelConfig(profileDir) {
  const configPath = `${profileDir}/config.yaml`
  if (!existsSync(configPath)) {
    return { provider: null, model: null, hasConfig: false }
  }

  const lines = readFileSync(configPath, 'utf8').split(/\r?\n/)
  let inModel = false
  let provider = null
  let model = null
  for (const line of lines) {
    if (line.startsWith('model:')) {
      inModel = true
      continue
    }
    if (!inModel) continue
    if (line && !line.startsWith(' ')) break
    const defaultMatch = line.match(/^\s*default:\s*([^#\n]+)/)
    const providerMatch = line.match(/^\s*provider:\s*([^#\n]+)/)
    if (defaultMatch) model = defaultMatch[1].trim()
    if (providerMatch) provider = providerMatch[1].trim()
  }
  return { provider, model, hasConfig: true }
}

function profileId(name) {
  return `hermes-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

function profileDisplayName(name) {
  if (name === 'default') return 'Hermes Default'
  return name
    .split(/[-_]+/g)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function profileRole(name) {
  if (name === 'tech-director') return 'Mia / Tech Director profile'
  if (name === 'general-assistant') return 'General Assistant profile'
  if (name === 'default') return 'Default Hermes profile'
  return 'Hermes profile'
}

/**
 * @param {{ name: string, dir: string }[]} profiles
 * @param {string} nowISO
 * @returns {{ members: object[], note: string }}
 */
export function collectTeamMembers(profiles, nowISO) {
  const usableProfiles = (profiles ?? [])
    .filter(profile => profile?.name && profile?.dir)
    .filter(profile => existsSync(`${profile.dir}/config.yaml`))

  const members = usableProfiles.map(profile => {
    const cfg = readSafeModelConfig(profile.dir)
    return {
      id: profileId(profile.name),
      name: profileDisplayName(profile.name),
      role: profileRole(profile.name),
      model: cfg.model && cfg.provider ? `${cfg.provider}/${cfg.model}` : (cfg.model ?? cfg.provider ?? null),
      agent_group: 'hermes-profile',
      parent_agent: null,
      synced_at: nowISO,
      status: 'waiting',
      current_task: null,
    }
  })

  return {
    members,
    note: 'team_members is now profile-discovered from Hermes config metadata only. Presence/current-task is not live yet, so profiles are marked waiting instead of fabricated active/idle states.',
  }
}

// Standalone execution for debugging
if (process.argv[1] === __filename) {
  const nowISO = new Date().toISOString()
  const hermesRoot = '/Users/gabi/.hermes'
  const profilesRoot = `${hermesRoot}/profiles`
  const profiles = [{ name: 'default', dir: hermesRoot }]
  try {
    const { readdirSync, statSync } = await import('node:fs')
    for (const entry of readdirSync(profilesRoot)) {
      const dir = `${profilesRoot}/${entry}`
      if (statSync(dir).isDirectory()) profiles.push({ name: basename(dir), dir })
    }
  } catch {
    // Ignore missing profiles directory in standalone mode.
  }
  const result = collectTeamMembers(profiles, nowISO)
  console.log('[hermes-team-members] Status: partial live source (profile discovery)')
  console.log(`[hermes-team-members] Note: ${result.note}`)
  console.log(`[hermes-team-members] ${result.members.length} member(s):`)
  for (const m of result.members) {
    console.log(`  ${m.id}: ${m.name} (${m.model ?? 'model unset'}) — ${m.status}`)
  }
}
