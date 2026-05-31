// Warung OS type contracts — adapted from Mission Control Online

export type SyncStatus = 'running' | 'success' | 'failed'
export type SyncTrigger = 'scheduled' | 'manual' | 'dry_run'
export type SyncRequestStatus = 'pending' | 'running' | 'completed' | 'failed' | 'expired'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested' | 'blocked'

// MC Online preserved contracts

export interface CanonicalProject {
  id: string
  name: string
  owner: string | null
  team: string[] | null
  status: string | null
  priority: string | null
  current_phase: string | null
  next_step: string | null
  project_kind: string | null
  parent_project_id: string | null
  visibility: string | null
  source_root: string | null
  folder_path: string | null
  folder_status: string | null
  registry_status: string | null
  source_updated_at: string | null
  synced_at: string
  // Warung OS extensions
  blocker: string | null
  last_movement_at: string | null
}

export interface CanonicalTeamMember {
  id: string
  name: string
  role: string | null
  model: string | null
  agent_group: string | null
  parent_agent: string | null
  synced_at: string
  status: 'active' | 'idle' | 'blocked' | 'offline' | 'waiting'
  current_task: string | null
}

export interface SyncRun {
  id: string
  started_at: string
  finished_at: string | null
  status: SyncStatus
  trigger: SyncTrigger
  source_host: string | null
  summary: Record<string, unknown> | null
  error: string | null
}

export interface SyncRequest {
  id: string
  requested_by: string | null
  requested_at: string
  status: SyncRequestStatus
  started_at: string | null
  completed_at: string | null
  handled_by: string | null
  error: string | null
}

export interface SourceHealthSnapshot {
  id: string
  label: string
  source_type: string | null
  exists: boolean | null
  readable: boolean | null
  modified_at: string | null
  age_hours: number | null
  status: string | null
  error: string | null
  synced_at: string
}

export interface CronJobSnapshot {
  id: string
  agent: string | null
  name: string | null
  schedule: string | null
  status: string | null
  enabled: boolean | null
  model: string | null
  model_source: string | null
  last_run_at: string | null
  next_run_at: string | null
  duration_ms: number | null
  error: string | null
  synced_at: string
}

export interface AgentTokenUsageDaily {
  id: string
  agent: string
  parent_agent: string | null
  date: string
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  total_tokens: number
  turns: number
  synced_at: string
}

export interface ModelTokenUsageDaily {
  id: string
  model: string
  date: string
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  total_tokens: number
  turns: number
  synced_at: string
}

export interface ToolUsageDaily {
  id: string
  tool_name: string
  tool_category: string
  assigned_model: string | null
  date: string
  calls: number
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  total_tokens: number
  agents: string[]
  last_used_at: string | null
  synced_at: string
}

export interface WorkspaceSignalSnapshot {
  id: string
  branch: string | null
  head: string | null
  working_tree: string | null
  commits_24h: number | null
  commits_7d: number | null
  latest_commit_at: string | null
  recent_commits: Array<{
    hash: string
    committed_at: string
    author: string
    subject: string
  }> | null
  file_churn: Array<{
    path: string
    touches: number
  }> | null
  synced_at: string
}

// Warung OS additions

export interface DailyBriefItem {
  id: string
  type: 'win' | 'needs_raz' | 'blocked' | 'next' | 'info'
  title: string
  body: string
  time: string
  project?: string
}

export interface ApprovalItem {
  id: string
  title: string
  description: string
  status: ApprovalStatus
  requester: string
  project: string
  created_at: string
}

export interface WikiEntry {
  id: string
  title: string
  source_type: 'agent_diary' | 'journal' | 'project_note' | 'decision_log' | 'reference'
  author: string
  project: string | null
  tags: string[]
  excerpt: string
  body: string
  source_path: string
  date: string
  is_current?: boolean
}

export interface HermesModelHealth {
  id: string
  provider: string
  model: string
  status: 'ok' | 'degraded' | 'down'
  latency_ms: number | null
  is_primary: boolean
  is_fallback: boolean
  last_checked_at: string
}

export interface DotDelegationStatus {
  id: string
  dot_name: string
  agent: string
  task: string
  status: 'active' | 'waiting' | 'blocked' | 'done'
  started_at: string
  last_activity_at: string
}
