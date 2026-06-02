// Single app-level data boundary.
// Components import useWarungData() instead of reaching into fixtures.ts directly.
// On mount the provider attempts to load /snapshots/latest.json;
// falls back to fixture data if the file is absent or malformed.

import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { WarungData } from '../types/snapshot'
import {
  projectFixtures,
  teamMemberFixtures,
  dailyBriefFixtures,
  approvalFixtures,
  agentTokenDailyFixtures,
  modelTokenDailyFixtures,
  toolUsageDailyFixtures,
  cronJobFixtures,
  sourceHealthFixtures,
  syncRunFixtures,
  syncRequestFixtures,
  workspaceSignalFixture,
  hermesModelHealthFixtures,
  gatewayStatusFixtures,
  providerCatalogFixtures,
  dotDelegationFixtures,
  wikiFixtures,
} from './fixtures'
import { loadSnapshot } from './snapshotLoader'
import type { SnapshotLoadResult } from './snapshotLoader'

function buildFixtureData(): WarungData {
  return {
    meta: {
      sourceMode: 'fixture',
      generatedAt: null,
      freshness: 'unavailable',
      runtimeSource: 'fixture',
      runtimeStatus: 'unavailable',
      snapshotUrl: null,
      profile: null,
      warnings: [],
      adapterWarnings: {},
      isHermesScoped: false,
    },
    projects: projectFixtures,
    teamMembers: teamMemberFixtures,
    kanbanBoards: [],
    dailyBrief: dailyBriefFixtures,
    approvals: approvalFixtures,
    agentTokenDaily: agentTokenDailyFixtures,
    modelTokenDaily: modelTokenDailyFixtures,
    toolUsageDaily: toolUsageDailyFixtures,
    cronJobs: cronJobFixtures,
    sourceHealth: sourceHealthFixtures,
    syncRuns: syncRunFixtures,
    syncRequests: syncRequestFixtures,
    workspaceSignal: workspaceSignalFixture,
    hermesModelHealth: hermesModelHealthFixtures,
    dotDelegation: dotDelegationFixtures,
    gatewayStatus: gatewayStatusFixtures,
    providerCatalog: providerCatalogFixtures,
    wiki: wikiFixtures,
  }
}

function snapshotToData(result: SnapshotLoadResult): WarungData {
  if (!result.snapshot) throw new Error('snapshotToData requires a loaded snapshot')
  const { meta, home, projects, operations, wiki } = result.snapshot
  const freshness = result.status === 'stale' ? 'stale' : 'fresh'
  return {
    meta: {
      sourceMode: meta.source_mode,
      generatedAt: meta.generated_at,
      freshness,
      runtimeSource: result.source.mode,
      runtimeStatus: result.status,
      snapshotUrl: result.source.url,
      profile: meta.profile,
      warnings: meta.warnings,
      adapterWarnings: meta.adapter_warnings,
      isHermesScoped: operations.source_scope === 'hermes-only',
    },
    projects: projects.items,
    teamMembers: projects.team_members,
    kanbanBoards: projects.kanban_boards ?? [],
    dailyBrief: home.daily_brief,
    approvals: home.approvals,
    agentTokenDaily: operations.agent_token_daily,
    modelTokenDaily: operations.model_token_daily,
    toolUsageDaily: operations.tool_usage_daily,
    cronJobs: operations.cron_jobs,
    sourceHealth: operations.source_health,
    syncRuns: operations.sync_runs,
    syncRequests: operations.sync_requests,
    workspaceSignal: operations.workspace_signal,
    hermesModelHealth: operations.hermes_model_health,
    dotDelegation: operations.dot_delegation,
    gatewayStatus: operations.gateway_status ?? [],
    providerCatalog: operations.provider_catalog ?? [],
    wiki: wiki.entries,
  }
}

interface WarungDataContextValue {
  data: WarungData
  isLoading: boolean
  loadError: string | null
}

const WarungDataContext = createContext<WarungDataContextValue | null>(null)

export function WarungDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WarungDataContextValue>({
    data: buildFixtureData(),
    isLoading: true,
    loadError: null,
  })

  useEffect(() => {
    loadSnapshot().then(result => {
      if (result.snapshot) {
        setState({
          data: snapshotToData(result),
          isLoading: false,
          loadError: null,
        })
      } else {
        setState(prev => ({
          ...prev,
          data: {
            ...prev.data,
            meta: {
              ...prev.data.meta,
              runtimeSource: result.source.mode,
              runtimeStatus: result.status,
              snapshotUrl: result.source.url || null,
              freshness: result.status === 'stale' ? 'stale' : 'unavailable',
            },
          },
          isLoading: false,
          loadError: result.error,
        }))
      }
    })
  }, [])

  return (
    <WarungDataContext.Provider value={state}>
      {children}
    </WarungDataContext.Provider>
  )
}

export function useWarungData(): WarungDataContextValue {
  const ctx = useContext(WarungDataContext)
  if (!ctx) throw new Error('useWarungData must be used inside WarungDataProvider')
  return ctx
}
