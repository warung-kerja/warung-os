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
  // Phase 3: enriched from cron output directory (filenames only — no content read)
  run_count?: number | null
  recent_run_timestamps?: string[] | null
  // Phase 5: total successful runs from jobs.json repeat.completed (safe integer)
  completed_runs?: number | null
  // Phase 5: Hermes skill names assigned to this job (non-secret strings)
  skills?: string[] | null
  // Phase 5.1: 30-day daily run histogram (UTC day buckets from output dir filenames)
  run_history_daily?: Array<{date: string; count: number}> | null
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
  profile: string
  provider: string | null
  model: string | null
  status: 'ok' | 'config_present' | 'degraded' | 'down' | 'warn' | 'unconfigured' | 'bad'
  latency_ms: number | null
  is_primary: boolean
  is_fallback: boolean
  last_checked_at: string
  error?: string
}

export interface HermesGatewayPlatform {
  name: string
  state: 'connected' | 'retrying' | 'paused' | 'disconnected' | string
  error_message: string | null
  updated_at: string | null
}

export interface HermesGatewayStatus {
  id: string
  profile: string
  gateway_state: 'running' | 'stopped' | 'unknown' | string
  active_agents: number
  platforms: HermesGatewayPlatform[]
  updated_at: string | null
  synced_at: string
  error?: string
}

export interface HermesProviderCatalogEntry {
  id: string
  profile: string
  provider: string
  model_count: number
  cached_at: string | null
  synced_at: string
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

export interface TickTickTask {
  id: string
  title: string
  column: string | null
  column_id: string | null
  priority: 'none' | 'low' | 'medium' | 'high' | string
  status: number | null
  updated_at: string | null
}

export interface TickTickKanbanBoard {
  board_id: string
  board_name: string
  task_count: number
  column_counts: Array<{ column: string; count: number }>
  tasks: TickTickTask[]
  collected_at: string
  cache_age_hours: number | null
}

// Hourly session distribution over the collection window (30 days).
// Aggregated by local hour-of-day (0–23) across all profiles and sources.
// Privacy boundary: aggregate integer counts only — no content, titles, prompts, or secrets.
export interface SessionActivityHourly {
  hour: number            // 0-23, local time (strftime '%H')
  session_count: number   // sessions that started in this hour, across the window
  message_total: number
  tool_call_total: number
  total_tokens: number
}

// Per-profile session summary over the collection window (30 days).
// Privacy boundary: aggregate integer counts only — no content, titles, prompts, or secrets.
// Profile names are non-secret (they are folder names under ~/.hermes/profiles/).
export interface SessionActivityByProfile {
  id: string
  profile: string               // Hermes profile name (e.g. 'tech-director', 'default')
  session_count: number         // total sessions in window
  message_total: number
  tool_call_total: number
  total_tokens: number
  primary_source: string | null  // source with the highest session count
  primary_model: string | null   // model with the highest session count
  active_days: number            // distinct calendar days with at least one session
  first_active_day: string | null
  last_active_day: string | null
  synced_at: string
}

// Agent activity feed — per (day, source) session aggregate from Hermes state.db.
// Privacy boundary: aggregate metadata only — no titles, prompts, content, or secrets.
export interface SessionActivityDaily {
  id: string
  date: string                  // YYYY-MM-DD local day
  source: string                // execution context: cron | cli | telegram | acp | unknown
  session_count: number         // sessions started on this day/source
  message_total: number         // total messages across sessions (integer count only)
  tool_call_total: number       // total tool calls across sessions (integer count only)
  total_tokens: number          // input + output tokens summed (no cache split in this view)
  avg_duration_s: number | null // average session duration in seconds; null if ended_at not set
  primary_model: string | null  // most-used model for this day/source; null if indeterminate
  synced_at: string
}

// ---- AUDIT LOG ----

export type AuditAction =
  | 'approval_granted'
  | 'approval_rejected'
  | 'changes_requested'
  | 'approval_blocked'
  | 'manual_refresh_requested'
  | 'view_run_log'
  | 'view_source_notes'
  | 'focus_approved'
  | 'sync_obsidian_requested'
  | 'review_queue_requested'

export interface AuditLogEntry {
  id: string
  action: AuditAction
  target_id: string
  target_title: string
  actor: string
  timestamp: string
  note: string | null
}
