// Warung OS Phase 2 — snapshot contract + runtime data bundle
//
// WarungSnapshot is the shape of /snapshots/latest.json.
// WarungData is the runtime bundle consumed by React components.
// Operations source_scope must be 'hermes-only' — never OpenClaw.

import type {
  CanonicalProject,
  CanonicalTeamMember,
  SyncRun,
  SyncRequest,
  SourceHealthSnapshot,
  CronJobSnapshot,
  AgentTokenUsageDaily,
  ModelTokenUsageDaily,
  ToolUsageDaily,
  WorkspaceSignalSnapshot,
  DailyBriefItem,
  ApprovalItem,
  WikiEntry,
  HermesModelHealth,
  HermesGatewayStatus,
  HermesProviderCatalogEntry,
  DotDelegationStatus,
  TickTickKanbanBoard,
} from './warung-os'

export type SourceMode = 'fixture' | 'snapshot'
export type FreshnessState = 'fresh' | 'stale' | 'unavailable'
export type RuntimeSnapshotSourceMode = 'fixture' | 'local' | 'prepared' | 'remote'
export type RuntimeSnapshotStatus = FreshnessState | 'auth_required' | 'error'

// ---- JSON snapshot contract (shape of latest.json) ----

export interface SnapshotMeta {
  schema_version: '1'
  source_mode: SourceMode
  generated_at: string
  // 'hermes-only' = scoped to Raz's Hermes env. 'fixture' = demo-safe placeholder.
  source_scope: 'hermes-only' | 'fixture'
  profile: string | null
  warnings: string[]
  redactions_applied: boolean
  is_demo: boolean
  adapter_warnings: Record<string, string>
  // Phase 5 hosted-mirror metadata. The local generator may omit these;
  // prepare-hosted-snapshot adds them to the local export package.
  max_age_minutes?: number
  published_at?: string
  hosted_export?: {
    prepared_at: string
    mode: 'local-export-only' | 'uploaded'
    storage_strategy: 'supabase-storage' | 'supabase-db'
    upload_performed: boolean
  }
}

export interface OperationsSnapshot {
  // MUST be 'hermes-only' — never include OpenClaw agents or OpenClaw telemetry.
  source_scope: 'hermes-only'
  agent_token_daily: AgentTokenUsageDaily[]
  model_token_daily: ModelTokenUsageDaily[]
  tool_usage_daily: ToolUsageDaily[]
  cron_jobs: CronJobSnapshot[]
  source_health: SourceHealthSnapshot[]
  sync_runs: SyncRun[]
  sync_requests: SyncRequest[]
  workspace_signal: WorkspaceSignalSnapshot | null
  hermes_model_health: HermesModelHealth[]
  dot_delegation: DotDelegationStatus[]
  // Phase 3: gateway connectivity and provider catalog
  gateway_status: HermesGatewayStatus[]
  provider_catalog: HermesProviderCatalogEntry[]
}

export interface WarungSnapshot {
  meta: SnapshotMeta
  home: {
    daily_brief: DailyBriefItem[]
    approvals: ApprovalItem[]
  }
  projects: {
    items: CanonicalProject[]
    team_members: CanonicalTeamMember[]
    kanban_boards: TickTickKanbanBoard[]
  }
  operations: OperationsSnapshot
  wiki: {
    entries: WikiEntry[]
  }
}

// ---- Runtime data bundle (consumed by React components) ----

export interface DataSourceMeta {
  sourceMode: SourceMode
  generatedAt: string | null
  freshness: FreshnessState
  runtimeSource: RuntimeSnapshotSourceMode
  runtimeStatus: RuntimeSnapshotStatus
  snapshotUrl: string | null
  profile: string | null
  warnings: string[]
  adapterWarnings: Record<string, string>
  // True only when Operations data is confirmed Hermes-only scope.
  isHermesScoped: boolean
}

export interface WarungData {
  meta: DataSourceMeta
  // Projects
  projects: CanonicalProject[]
  teamMembers: CanonicalTeamMember[]
  kanbanBoards: TickTickKanbanBoard[]
  // Home
  dailyBrief: DailyBriefItem[]
  approvals: ApprovalItem[]
  // Operations (always Hermes-scoped when source_mode = snapshot)
  agentTokenDaily: AgentTokenUsageDaily[]
  modelTokenDaily: ModelTokenUsageDaily[]
  toolUsageDaily: ToolUsageDaily[]
  cronJobs: CronJobSnapshot[]
  sourceHealth: SourceHealthSnapshot[]
  syncRuns: SyncRun[]
  syncRequests: SyncRequest[]
  workspaceSignal: WorkspaceSignalSnapshot | null
  hermesModelHealth: HermesModelHealth[]
  dotDelegation: DotDelegationStatus[]
  // Phase 3: gateway connectivity and provider catalog
  gatewayStatus: HermesGatewayStatus[]
  providerCatalog: HermesProviderCatalogEntry[]
  // Wiki
  wiki: WikiEntry[]
}
