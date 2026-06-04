import { useState } from 'react'
import type { WarungData } from '../types/snapshot'
import type { AuditLogEntry } from '../types/warung-os'
import { useWarungData } from '../data/dataSource'
import { useLocalState } from '../data/localState'

type OpsTab = 'overview' | 'usage' | 'automation' | 'sources' | 'workspace' | 'agents' | 'audit'

const opsTabs: { id: OpsTab; label: string }[] = [
  { id: 'overview',   label: 'Overview' },
  { id: 'usage',      label: 'Usage' },
  { id: 'automation', label: 'Automation' },
  { id: 'sources',    label: 'Sources' },
  { id: 'workspace',  label: 'Workspace' },
  { id: 'agents',     label: 'Agents' },
  { id: 'audit',      label: 'Audit' },
]

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return n.toString()
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function fmtTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function auditActionLabel(action: AuditLogEntry['action']): string {
  switch (action) {
    case 'approval_granted':         return 'Approved'
    case 'approval_rejected':        return 'Rejected'
    case 'changes_requested':        return 'Changes requested'
    case 'approval_blocked':         return 'Blocked'
    case 'manual_refresh_requested': return 'Manual refresh'
    case 'view_run_log':             return 'Opened run log'
    case 'view_source_notes':        return 'Viewed source notes'
    case 'focus_approved':           return 'Focus approved'
    case 'sync_obsidian_requested':  return 'Obsidian sync requested'
    case 'review_queue_requested':   return 'Review queue requested'
  }
}

function auditActionTagClass(action: AuditLogEntry['action']): string {
  switch (action) {
    case 'approval_granted':         return 'tag--ok'
    case 'approval_rejected':        return 'tag--bad'
    case 'changes_requested':        return 'tag--warn'
    case 'approval_blocked':         return 'tag--warn'
    case 'manual_refresh_requested': return 'tag--signal'
    case 'view_run_log':             return 'tag--blue'
    case 'view_source_notes':        return 'tag--blue'
    case 'focus_approved':           return 'tag--ok'
    case 'sync_obsidian_requested':  return 'tag--signal'
    case 'review_queue_requested':   return 'tag--signal'
  }
}

function VertBarChart({ values, labels, maxValue, colorClass }: {
  values: number[]
  labels: string[]
  maxValue: number
  colorClass?: string
}) {
  return (
    <>
      <div className="bar-chart">
        {values.map((v, i) => (
          <div key={i} className="bar-col" title={`${labels[i]}: ${fmtTokens(v)}`}>
            <span
              className={`bar-col-fill${colorClass ? ` ${colorClass}` : ''}`}
              style={{ height: `${Math.max(2, Math.round((v / maxValue) * 100))}%` }}
            />
          </div>
        ))}
      </div>
      <div className="chart-labels">
        {labels.map((l, i) => <span key={i} className="chart-label">{l}</span>)}
      </div>
    </>
  )
}

function HBarRow({ label, value, max, colorClass }: { label: string; value: number; max: number; colorClass?: string }) {
  return (
    <div className="h-bar-row">
      <span className="h-bar-label">{label}</span>
      <div className="h-bar-track">
        <div className={`h-bar-fill${colorClass ? ` ${colorClass}` : ''}`} style={{ width: `${Math.max(1, (value / max) * 100)}%` }} />
      </div>
      <span className="h-bar-value">{fmtTokens(value)}</span>
    </div>
  )
}

// Derive last n calendar days ending on a given ISO date string (or today).
function buildLast7Days(anchorISO?: string | null, n = 7): { short: string; full: string }[] {
  const anchor = anchorISO ? new Date(anchorISO) : new Date()
  const result: { short: string; full: string }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(anchor)
    d.setDate(d.getDate() - i)
    const full = d.toISOString().slice(0, 10)
    result.push({ short: full.slice(5), full })
  }
  return result
}

function UnavailableNote({ label }: { label: string }) {
  return (
    <div style={{ padding: '12px 0', color: 'var(--muted)', fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '0.04em' }}>
      —{label} unavailable—
    </div>
  )
}

function OverviewTab({ data }: { data: WarungData }) {
  const { cronJobs, agentTokenDaily, hermesModelHealth, syncRuns, gatewayStatus } = data
  const { localSyncRequests, requestManualRefresh } = useLocalState()
  const syncRequests = [...localSyncRequests, ...data.syncRequests]

  const cronOk    = cronJobs.filter(c => c.enabled && c.status === 'ok').length
  const cronTotal = cronJobs.filter(c => c.enabled).length
  const warnCrons = cronJobs.filter(c => c.status === 'warn' || c.status === 'bad')

  const latestDate = agentTokenDaily.reduce((max, r) => r.date > max ? r.date : max, '')
  const todayTotal = agentTokenDaily
    .filter(r => r.date === latestDate)
    .reduce((s, r) => s + r.total_tokens, 0)

  const primaryModel = hermesModelHealth.find(h => h.is_primary)
  const gatewayRunning = gatewayStatus.filter(g => g.gateway_state === 'running').length

  const recentEvents = syncRuns.length > 0
    ? syncRuns.slice(0, 6).map(sr => ({
        time: sr.finished_at ? fmtTime(sr.finished_at) : fmtTime(sr.started_at),
        text: `${sr.status.toUpperCase()} sync · ${sr.trigger} · ${typeof sr.summary === 'object' && sr.summary ? JSON.stringify(sr.summary) : 'no summary'}`,
      }))
    : [{ time: '—', text: 'Automation timeline unavailable until Hermes sync adapter is connected.' }]

  return (
    <>
      <div className="grid grid--3" style={{ marginBottom: 20 }}>
        <div className="panel panel--min">
          <div className="mono">Cron health</div>
          <div className="metric-value" style={{ color: warnCrons.length ? 'var(--warn)' : 'var(--ok)' }}>
            {cronTotal > 0 ? `${cronOk}/${cronTotal}` : '—'}
          </div>
          <div className="metric-note">
            {cronTotal === 0
              ? 'No cron data — adapter not connected'
              : warnCrons.length
                ? `${warnCrons.length} job${warnCrons.length > 1 ? 's' : ''} need inspection`
                : 'All enabled jobs OK'}
          </div>
          {cronTotal > 0 && (
            <div className="cron-pips" style={{ marginTop: 10 }}>
              {cronJobs.filter(c => c.enabled).map(c => (
                <span key={c.id} className={`cron-pip ${c.status === 'warn' ? 'warn' : c.status === 'bad' ? 'bad' : ''}`} title={c.name ?? ''} />
              ))}
            </div>
          )}
        </div>
        <div className="panel panel--min">
          <div className="mono">Token burn today</div>
          {todayTotal > 0
            ? <><div className="metric-value">{fmtTokens(todayTotal)}</div><div className="metric-note">All agents combined · {latestDate}</div></>
            : <UnavailableNote label="token usage" />
          }
        </div>
        <div className="panel panel--min">
          <div className="mono">Gateway / Hermes</div>
          {gatewayStatus.length > 0
            ? <>
                <div className="metric-value" style={{ color: gatewayRunning === gatewayStatus.length ? 'var(--ok)' : gatewayRunning > 0 ? 'var(--warn)' : 'var(--bad)' }}>
                  {gatewayRunning}/{gatewayStatus.length}
                </div>
                <div className="metric-note">profile{gatewayStatus.length !== 1 ? 's' : ''} running</div>
                {primaryModel && <div className="metric-note" style={{ marginTop: 4 }}>{primaryModel.provider} · {primaryModel.model}</div>}
              </>
            : <>
                <div className="metric-value" style={{ color: primaryModel?.status === 'ok' ? 'var(--ok)' : primaryModel ? 'var(--warn)' : 'var(--muted)', fontSize: 28 }}>
                  {primaryModel?.status === 'ok' ? 'OK' : primaryModel ? 'DEGRADED' : '—'}
                </div>
                <div className="metric-note">
                  {primaryModel ? `${primaryModel.model}` : 'Model health unavailable'}
                </div>
              </>
          }
        </div>
      </div>

      <div className="grid grid--2">
        <div className="panel">
          <div className="mono" style={{ marginBottom: 12 }}>Automation timeline</div>
          <div className="timeline-list">
            {recentEvents.map((ev, i) => (
              <div key={i} className="timeline-tick">
                <span className="mono" style={{ fontSize: 10, paddingTop: 2 }}>{ev.time}</span>
                <p>{ev.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="panel panel--alt">
          <div className="mono" style={{ marginBottom: 12 }}>Latest sync run</div>
          {syncRuns.length > 0 ? syncRuns.slice(0, 1).map(sr => (
            <div key={sr.id}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <span className={`tag ${sr.status === 'success' ? 'tag--ok' : 'tag--bad'}`}>{sr.status}</span>
                <span className="mono" style={{ fontSize: 10 }}>{sr.trigger}</span>
              </div>
              <table style={{ width: '100%', fontSize: 11 }}>
                <tbody>
                  <tr><td style={{ color: 'var(--muted)', paddingBottom: 4, width: 80 }}>Started</td><td style={{ color: 'var(--soft)', paddingBottom: 4 }}>{fmtTime(sr.started_at)}</td></tr>
                  <tr><td style={{ color: 'var(--muted)', paddingBottom: 4 }}>Finished</td><td style={{ color: 'var(--soft)', paddingBottom: 4 }}>{fmtTime(sr.finished_at)}</td></tr>
                  <tr><td style={{ color: 'var(--muted)', paddingBottom: 4 }}>Host</td><td style={{ color: 'var(--soft)', paddingBottom: 4 }}>{sr.source_host}</td></tr>
                  {sr.summary && Object.entries(sr.summary).map(([k, v]) => (
                    <tr key={k}><td style={{ color: 'var(--muted)', paddingBottom: 4 }}>{k}</td><td style={{ color: 'var(--soft)', paddingBottom: 4 }}>{String(v)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )) : <UnavailableNote label="sync run data" />}
          <div style={{ marginTop: 16 }}>
            <div className="mono" style={{ marginBottom: 8 }}>Sync requests</div>
            {syncRequests.length > 0
              ? syncRequests.map(req => (
                  <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--line)' }}>
                    <span style={{ fontSize: 11, color: 'var(--soft)' }}>{req.requested_by ?? 'system'}</span>
                    <span className={`tag ${req.status === 'pending' ? 'tag--signal' : req.status === 'completed' ? 'tag--ok' : req.status === 'failed' ? 'tag--bad' : ''}`}>
                      {req.status}
                    </span>
                  </div>
                ))
              : <div style={{ fontSize: 11, color: 'var(--muted)', padding: '6px 0' }}>No pending requests</div>
            }
            <button className="btn" style={{ marginTop: 10 }} onClick={() => requestManualRefresh()}>
              Request manual refresh
            </button>
            <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6 }}>
              Creates a SyncRequest record (pending) — no arbitrary command execution. Logged in Audit tab.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

const SOURCE_COLORS: Record<string, string> = { cron: '', telegram: 'blue', cli: 'teal', acp: 'ok' }

function UsageTab({ data }: { data: WarungData }) {
  const { agentTokenDaily, modelTokenDaily, toolUsageDaily, sessionActivityDaily, sessionActivityByProfile } = data

  const hasAgentData    = agentTokenDaily.length > 0
  const hasModelData    = modelTokenDaily.length > 0
  const hasToolData     = toolUsageDaily.length > 0
  const hasActivityData = sessionActivityDaily.length > 0

  // Derive 7-day window from data or fall back to today
  const allDates = [...new Set([...agentTokenDaily, ...modelTokenDaily].map(r => r.date))].sort()
  const latestDate = allDates[allDates.length - 1] ?? new Date().toISOString().slice(0, 10)
  const days7 = buildLast7Days(latestDate + 'T12:00:00Z')

  // Source/agent chart
  const uniqueSources = [...new Set(agentTokenDaily.map(r => r.agent))].sort()
  const agentDailyTotals = days7.map(d =>
    agentTokenDaily.filter(r => r.date === d.full).reduce((s, r) => s + r.total_tokens, 0)
  )
  const agentMaxTotal = Math.max(...agentDailyTotals, 1)
  const todayAgentRows = uniqueSources.map(s => ({
    agent: s,
    total: agentTokenDaily.filter(r => r.agent === s && r.date === latestDate).reduce((sum, r) => sum + r.total_tokens, 0),
    turns: agentTokenDaily.filter(r => r.agent === s && r.date === latestDate).reduce((sum, r) => sum + r.turns, 0),
  })).filter(r => r.total > 0 || uniqueSources.length <= 4)
  const agentMax = Math.max(...todayAgentRows.map(r => r.total), 1)

  // Model chart
  const uniqueModels = [...new Set(modelTokenDaily.map(r => r.model))].sort()
  const modelDailyTotals = days7.map(d =>
    modelTokenDaily.filter(r => r.date === d.full).reduce((s, r) => s + r.total_tokens, 0)
  )
  const modelMaxTotal = Math.max(...modelDailyTotals, 1)
  const todayModelRows = uniqueModels.map(m => ({
    model: m,
    total: modelTokenDaily.filter(r => r.model === m && r.date === latestDate).reduce((sum, r) => sum + r.total_tokens, 0),
    turns: modelTokenDaily.filter(r => r.model === m && r.date === latestDate).reduce((sum, r) => sum + r.turns, 0),
  }))
  const modelMax = Math.max(...todayModelRows.map(r => r.total), 1)
  const modelColors = ['', 'blue', 'teal', 'ok', '']

  const toolMax = Math.max(...toolUsageDaily.map(t => t.calls), 1)

  return (
    <>
      <div className="ops-section">
        <div className="ops-section-label">Token usage by source · Hermes state.db</div>
        {!hasAgentData
          ? <div className="panel"><UnavailableNote label="source token usage" /><p style={{ fontSize: 11, color: 'var(--muted)' }}>Token usage adapter not yet connected. Data will appear here when state.db is readable.</p></div>
          : <div className="grid grid--2">
              <div className="panel">
                <div className="mono" style={{ marginBottom: 10 }}>7-day total trend (all sources)</div>
                <VertBarChart values={agentDailyTotals} labels={days7.map(d => d.short)} maxValue={agentMaxTotal} />
              </div>
              <div className="panel panel--alt">
                <div className="mono" style={{ marginBottom: 10 }}>Today · {latestDate} — by source</div>
                {todayAgentRows.map(row => (
                  <HBarRow key={row.agent} label={row.agent} value={row.total} max={agentMax} colorClass={SOURCE_COLORS[row.agent] ?? ''} />
                ))}
                <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                  {todayAgentRows.map(row => (
                    <div key={row.agent} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0' }}>
                      <span style={{ color: 'var(--soft)' }}>{row.agent}</span>
                      <span className="mono" style={{ fontSize: 10 }}>{row.turns} sessions</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
        }
      </div>

      <div className="gap-sm" />

      <div className="ops-section">
        <div className="ops-section-label">Model token burn daily · Hermes state.db</div>
        {!hasModelData
          ? <div className="panel"><UnavailableNote label="model token burn" /></div>
          : <div className="grid grid--2">
              <div className="panel">
                <div className="mono" style={{ marginBottom: 10 }}>7-day total trend (all models)</div>
                <VertBarChart values={modelDailyTotals} labels={days7.map(d => d.short)} maxValue={modelMaxTotal} colorClass="blue" />
              </div>
              <div className="panel panel--alt">
                <div className="mono" style={{ marginBottom: 10 }}>Today · {latestDate} — by model</div>
                {todayModelRows.map((row, i) => (
                  <HBarRow
                    key={row.model}
                    label={row.model.length > 22 ? row.model.slice(0, 22) + '…' : row.model}
                    value={row.total}
                    max={modelMax}
                    colorClass={modelColors[i % modelColors.length]}
                  />
                ))}
                <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                  <div className="mono" style={{ marginBottom: 6 }}>Today sessions by model</div>
                  {todayModelRows.map(row => (
                    <div key={row.model} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0' }}>
                      <span style={{ color: 'var(--soft)', fontFamily: 'var(--mono)', fontSize: 10 }}>{row.model}</span>
                      <span className="mono" style={{ fontSize: 10 }}>{row.turns} sessions</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
        }
      </div>

      <div className="gap-sm" />

      {sessionActivityByProfile.length > 0 && (() => {
        const profileTokenMax = Math.max(...sessionActivityByProfile.map(p => p.total_tokens), 1)
        return (
          <>
            <div className="ops-section">
              <div className="ops-section-label">Token usage by profile · 30d window · Hermes state.db</div>
              <div className="grid grid--2">
                <div className="panel">
                  <div className="mono" style={{ marginBottom: 10 }}>Tokens · 30d — by profile</div>
                  {sessionActivityByProfile.map(p => (
                    <HBarRow
                      key={p.profile}
                      label={p.profile}
                      value={p.total_tokens}
                      max={profileTokenMax}
                      colorClass="blue"
                    />
                  ))}
                </div>
                <div className="panel panel--alt">
                  <div className="mono" style={{ marginBottom: 10 }}>Profile details · 30d</div>
                  <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--line)' }}>
                        <th style={{ textAlign: 'left', color: 'var(--muted)', fontWeight: 'normal', padding: '0 8px 6px 0', fontFamily: 'var(--mono)', fontSize: 10 }}>Profile</th>
                        <th style={{ textAlign: 'right', color: 'var(--muted)', fontWeight: 'normal', padding: '0 0 6px 8px', fontFamily: 'var(--mono)', fontSize: 10 }}>Tokens (30d)</th>
                        <th style={{ textAlign: 'right', color: 'var(--muted)', fontWeight: 'normal', padding: '0 0 6px 8px', fontFamily: 'var(--mono)', fontSize: 10 }}>Sessions</th>
                        <th style={{ textAlign: 'right', color: 'var(--muted)', fontWeight: 'normal', padding: '0 0 6px 8px', fontFamily: 'var(--mono)', fontSize: 10 }}>Avg tok/session</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionActivityByProfile.map(p => (
                        <tr key={p.profile} style={{ borderTop: '1px solid var(--line)' }}>
                          <td style={{ padding: '5px 8px 5px 0', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 10 }}>{p.profile}</td>
                          <td style={{ padding: '5px 0 5px 8px', textAlign: 'right', color: 'var(--soft)', fontFamily: 'var(--mono)', fontSize: 10 }}>{fmtTokens(p.total_tokens)}</td>
                          <td style={{ padding: '5px 0 5px 8px', textAlign: 'right', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 10 }}>{p.session_count}</td>
                          <td style={{ padding: '5px 0 5px 8px', textAlign: 'right', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 10 }}>
                            {p.session_count > 0 ? fmtTokens(Math.round(p.total_tokens / p.session_count)) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="gap-sm" />
          </>
        )
      })()}

      <div className="ops-section">
        <div className="ops-section-label">Tool usage daily · {latestDate}</div>
        {!hasToolData
          ? <div className="panel"><UnavailableNote label="tool usage" /><p style={{ fontSize: 11, color: 'var(--muted)' }}>Tool usage adapter deferred — requires messages table parsing.</p></div>
          : <div className="table-wrap">
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Tool</th>
                    <th>Category</th>
                    <th>Calls</th>
                    <th>Input</th>
                    <th>Output</th>
                    <th>Total tokens</th>
                    <th>Agents</th>
                    <th>Last used</th>
                  </tr>
                </thead>
                <tbody>
                  {toolUsageDaily.sort((a, b) => b.calls - a.calls).map(t => (
                    <tr key={t.id}>
                      <td className="cell-strong">{t.tool_name}</td>
                      <td className="cell-muted">{t.tool_category}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div className="h-bar-track" style={{ width: 40 }}>
                            <div className="h-bar-fill" style={{ width: `${(t.calls / toolMax) * 100}%` }} />
                          </div>
                          <span className="cell-mono">{t.calls}</span>
                        </div>
                      </td>
                      <td className="cell-mono">{fmtTokens(t.input_tokens)}</td>
                      <td className="cell-mono">{fmtTokens(t.output_tokens)}</td>
                      <td className="cell-mono">{fmtTokens(t.total_tokens)}</td>
                      <td className="cell-muted" style={{ fontSize: 10 }}>{t.agents.join(', ')}</td>
                      <td className="cell-mono">{fmtTime(t.last_used_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>

      <div className="gap-sm" />

      <div className="ops-section">
        <div className="ops-section-label">Session activity · Hermes state.db · 14d</div>
        {!hasActivityData
          ? <div className="panel"><UnavailableNote label="session activity" /><p style={{ fontSize: 11, color: 'var(--muted)' }}>Session activity adapter not yet producing data — state.db may be absent.</p></div>
          : <ActivityFeedPanel rows={sessionActivityDaily} byProfile={sessionActivityByProfile} latestDate={latestDate} />
        }
      </div>
    </>
  )
}

const ACTIVITY_SOURCE_COLORS: Record<string, string> = {
  cron: '',
  telegram: 'blue',
  cli: 'teal',
  acp: 'ok',
  tui: 'warn',
}

function ActivityFeedPanel({ rows, byProfile, latestDate }: {
  rows: import('../types/warung-os').SessionActivityDaily[]
  byProfile: import('../types/warung-os').SessionActivityByProfile[]
  latestDate: string
}) {
  const days14 = buildLast7Days(latestDate + 'T12:00:00Z', 14)
  const uniqueSources = [...new Set(rows.map(r => r.source))].sort()

  // 14-day total sessions per day (all sources combined)
  const dailyTotals = days14.map(d =>
    rows.filter(r => r.date === d.full).reduce((s, r) => s + r.session_count, 0)
  )
  const maxDaily = Math.max(...dailyTotals, 1)

  // Latest day breakdown per source
  const latestRows = uniqueSources.map(src => {
    const r = rows.find(r => r.date === latestDate && r.source === src)
    return {
      source: src,
      session_count:  r?.session_count   ?? 0,
      tool_call_total: r?.tool_call_total ?? 0,
      message_total:  r?.message_total   ?? 0,
      avg_duration_s: r?.avg_duration_s  ?? null,
      primary_model:  r?.primary_model   ?? null,
    }
  }).filter(r => r.session_count > 0)

  const maxSessions = Math.max(...latestRows.map(r => r.session_count), 1)

  function fmtDuration(s: number | null): string {
    if (s == null) return '—'
    if (s < 60)  return `${Math.round(s)}s`
    if (s < 3600) return `${Math.round(s / 60)}m`
    return `${(s / 3600).toFixed(1)}h`
  }

  const profileMax = byProfile.length > 0 ? Math.max(...byProfile.map(p => p.session_count), 1) : 1

  return (
    <>
      <div className="grid grid--2">
        <div className="panel">
          <div className="mono" style={{ marginBottom: 10 }}>Sessions per day · all sources</div>
          <VertBarChart values={dailyTotals} labels={days14.map(d => d.short)} maxValue={maxDaily} colorClass="teal" />
        </div>
        <div className="panel panel--alt">
          <div className="mono" style={{ marginBottom: 10 }}>Latest · {latestDate} — by source</div>
          {latestRows.length === 0
            ? <div style={{ fontSize: 11, color: 'var(--muted)', padding: '8px 0' }}>No sessions on {latestDate}</div>
            : <>
                {latestRows.map(row => (
                  <HBarRow
                    key={row.source}
                    label={row.source}
                    value={row.session_count}
                    max={maxSessions}
                    colorClass={ACTIVITY_SOURCE_COLORS[row.source] ?? ''}
                  />
                ))}
                <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                  {latestRows.map(row => (
                    <div key={row.source} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0' }}>
                      <span style={{ color: 'var(--soft)' }}>{row.source}</span>
                      <span className="mono" style={{ fontSize: 10 }}>
                        {row.tool_call_total} tools · avg {fmtDuration(row.avg_duration_s)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
          }
        </div>
      </div>

      {byProfile.length > 0 && (
        <>
          <div className="gap-sm" />
          <div className="grid grid--2">
            <div className="panel">
              <div className="mono" style={{ marginBottom: 10 }}>Sessions · 30d window — by profile</div>
              {byProfile.map(p => (
                <HBarRow
                  key={p.profile}
                  label={p.profile}
                  value={p.session_count}
                  max={profileMax}
                  colorClass="teal"
                />
              ))}
            </div>
            <div className="panel panel--alt">
              <div className="mono" style={{ marginBottom: 10 }}>Profile details · 30d window</div>
              <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    <th style={{ textAlign: 'left', color: 'var(--muted)', fontWeight: 'normal', padding: '0 8px 6px 0', fontFamily: 'var(--mono)', fontSize: 10 }}>Profile</th>
                    <th style={{ textAlign: 'right', color: 'var(--muted)', fontWeight: 'normal', padding: '0 0 6px 8px', fontFamily: 'var(--mono)', fontSize: 10 }}>Sessions</th>
                    <th style={{ textAlign: 'right', color: 'var(--muted)', fontWeight: 'normal', padding: '0 0 6px 8px', fontFamily: 'var(--mono)', fontSize: 10 }}>Days</th>
                    <th style={{ textAlign: 'right', color: 'var(--muted)', fontWeight: 'normal', padding: '0 0 6px 8px', fontFamily: 'var(--mono)', fontSize: 10 }}>Primary source</th>
                  </tr>
                </thead>
                <tbody>
                  {byProfile.map(p => (
                    <tr key={p.profile} style={{ borderTop: '1px solid var(--line)' }}>
                      <td style={{ padding: '5px 8px 5px 0', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 10 }}>{p.profile}</td>
                      <td style={{ padding: '5px 0 5px 8px', textAlign: 'right', color: 'var(--soft)', fontFamily: 'var(--mono)', fontSize: 10 }}>{p.session_count}</td>
                      <td style={{ padding: '5px 0 5px 8px', textAlign: 'right', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 10 }}>{p.active_days}</td>
                      <td style={{ padding: '5px 0 5px 8px', textAlign: 'right', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 10 }}>{p.primary_source ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function AutomationTab({ data }: { data: WarungData }) {
  const { cronJobs } = data
  const okCount     = cronJobs.filter(c => c.enabled && c.status === 'ok').length
  const warnCount   = cronJobs.filter(c => c.status === 'warn').length
  const pausedCount = cronJobs.filter(c => !c.enabled).length
  const firstWarn   = cronJobs.find(c => c.status === 'warn')

  // Cron run-history chart — 14 days, aggregated across all jobs
  const hasDailyHistory = cronJobs.some(j => j.run_history_daily && j.run_history_daily.length > 0)
  const chartAnchor = cronJobs[0]?.synced_at ?? null
  const chartDays   = buildLast7Days(chartAnchor, 14)
  const dailyTotals = chartDays.map(d =>
    cronJobs.reduce((sum, job) => {
      const entry = job.run_history_daily?.find(h => h.date === d.full)
      return sum + (entry?.count ?? 0)
    }, 0)
  )
  const dailyMax = Math.max(...dailyTotals, 1)
  const jobWindowTotals = cronJobs.map(job => ({
    job,
    total: chartDays.reduce((sum, d) => {
      const entry = job.run_history_daily?.find(h => h.date === d.full)
      return sum + (entry?.count ?? 0)
    }, 0),
  }))
  const jobMax = Math.max(...jobWindowTotals.map(j => j.total), 1)

  return (
    <>
      <div className="ops-section">
        <div className="ops-section-label">Cron job health</div>
        {cronJobs.length === 0
          ? <div className="panel"><UnavailableNote label="cron data" /><p style={{ fontSize: 11, color: 'var(--muted)' }}>Cron adapter not yet connected.</p></div>
          : <>
              <div className="grid grid--3" style={{ marginBottom: 16 }}>
                <div className="panel panel--min">
                  <div className="mono">OK</div>
                  <div className="metric-value text-ok">{okCount}</div>
                  <div className="cron-pips">
                    {cronJobs.filter(c => c.enabled && c.status === 'ok').map(c => (
                      <span key={c.id} className="cron-pip" title={c.name ?? ''} />
                    ))}
                  </div>
                </div>
                <div className="panel panel--min">
                  <div className="mono">Warn / inspect</div>
                  <div className="metric-value text-warn">{warnCount}</div>
                  <div className="metric-note">{firstWarn ? `${firstWarn.name} — ${firstWarn.error}` : 'None'}</div>
                </div>
                <div className="panel panel--min">
                  <div className="mono">Paused / disabled</div>
                  <div className="metric-value text-muted">{pausedCount}</div>
                  <div className="metric-note">{cronJobs.find(c => !c.enabled)?.name ?? 'None'}</div>
                </div>
              </div>

              {hasDailyHistory && (
                <div className="grid grid--2" style={{ marginBottom: 16 }}>
                  <div className="panel">
                    <div className="mono" style={{ marginBottom: 10 }}>
                      Run activity · 14d · {chartDays[0].full} – {chartDays[chartDays.length - 1].full}
                    </div>
                    <VertBarChart values={dailyTotals} labels={chartDays.map(d => d.short)} maxValue={dailyMax} colorClass="teal" />
                  </div>
                  <div className="panel panel--alt">
                    <div className="mono" style={{ marginBottom: 10 }}>Runs per job · 14d window</div>
                    {jobWindowTotals.map(({ job, total }) => (
                      <HBarRow
                        key={job.id}
                        label={(job.name ?? job.id).slice(0, 26)}
                        value={total}
                        max={jobMax}
                        colorClass="teal"
                      />
                    ))}
                    <div style={{ marginTop: 10, borderTop: '1px solid var(--line)', paddingTop: 8, fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                      total across all jobs: {dailyTotals.reduce((a, b) => a + b, 0)} run{dailyTotals.reduce((a, b) => a + b, 0) !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              )}
              <div className="table-wrap">
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Job</th>
                      <th>Agent</th>
                      <th>Schedule</th>
                      <th>Status</th>
                      <th>Runs (7d)</th>
                      <th>Total</th>
                      <th>Last run</th>
                      <th>Next run</th>
                      <th>Skills</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cronJobs.map(cj => {
                      const fsLastRun = cj.recent_run_timestamps?.[cj.recent_run_timestamps.length - 1] ?? null
                      return (
                      <tr key={cj.id}>
                        <td className="cell-strong">{cj.name}</td>
                        <td className="cell-muted">{cj.agent}</td>
                        <td className="cell-mono">{cj.schedule}</td>
                        <td>
                          {!cj.enabled
                            ? <span className="tag">paused</span>
                            : cj.status === 'ok'
                              ? <span className="tag tag--ok">ok</span>
                              : cj.status === 'warn'
                                ? <span className="tag tag--warn">warn</span>
                                : <span className="tag tag--bad">bad</span>
                          }
                        </td>
                        <td
                          className="cell-mono"
                          title={cj.recent_run_timestamps?.join(', ') ?? undefined}
                        >
                          {cj.run_count != null ? cj.run_count : '—'}
                        </td>
                        <td className="cell-mono" title="Total successful runs (jobs.json repeat.completed)">
                          {cj.completed_runs != null ? cj.completed_runs : '—'}
                        </td>
                        <td className="cell-mono">
                          {cj.last_run_at
                            ? fmtTime(cj.last_run_at)
                            : fsLastRun
                              ? fmtTime(fsLastRun)
                              : '—'}
                        </td>
                        <td className="cell-mono">{cj.next_run_at ? fmtTime(cj.next_run_at) : '—'}</td>
                        <td className="cell-muted" style={{ fontSize: 10, maxWidth: 160 }}>
                          {cj.skills && cj.skills.length > 0 ? cj.skills.join(', ') : '—'}
                        </td>
                        <td className="cell-muted" style={{ fontSize: 10, maxWidth: 180 }}>{cj.error ?? '—'}</td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </>
        }
      </div>
    </>
  )
}

function SourcesTab({ data }: { data: WarungData }) {
  const { sourceHealth, syncRuns } = data
  const { localSyncRequests, requestManualRefresh } = useLocalState()
  const syncRequests = [...localSyncRequests, ...data.syncRequests]
  return (
    <>
      <div className="ops-section">
        <div className="ops-section-label">Source health / freshness</div>
        {sourceHealth.length === 0
          ? <div className="panel"><UnavailableNote label="source health" /></div>
          : <div className="table-wrap">
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Modified</th>
                    <th>Age</th>
                    <th>Readable</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceHealth.map(sh => (
                    <tr key={sh.id}>
                      <td className="cell-strong">{sh.label}</td>
                      <td className="cell-muted">{sh.source_type}</td>
                      <td>
                        {sh.status === 'ok'
                          ? <span className="cell-ok">ok</span>
                          : sh.status === 'warn'
                            ? <span className="cell-warn">warn</span>
                            : <span className="cell-bad">bad</span>
                        }
                      </td>
                      <td className="cell-mono">{sh.modified_at ? fmtTime(sh.modified_at) : '—'}</td>
                      <td className="cell-mono">{sh.age_hours != null ? `${sh.age_hours.toFixed(1)}h` : '—'}</td>
                      <td className={sh.readable ? 'cell-ok' : 'cell-bad'}>{sh.readable ? 'yes' : 'no'}</td>
                      <td className="cell-muted" style={{ fontSize: 10 }}>{sh.error ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>

      <div className="gap-sm" />

      <div className="ops-section">
        <div className="ops-section-label">Sync runs</div>
        {syncRuns.length === 0
          ? <div className="panel"><UnavailableNote label="sync run history" /></div>
          : <div className="table-wrap">
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Started</th>
                    <th>Finished</th>
                    <th>Status</th>
                    <th>Trigger</th>
                    <th>Host</th>
                    <th>Summary</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {syncRuns.map(sr => (
                    <tr key={sr.id}>
                      <td className="cell-mono">{fmtTime(sr.started_at)} {fmtDate(sr.started_at)}</td>
                      <td className="cell-mono">{sr.finished_at ? fmtTime(sr.finished_at) : '—'}</td>
                      <td>
                        <span className={`tag ${sr.status === 'success' ? 'tag--ok' : sr.status === 'failed' ? 'tag--bad' : 'tag--signal'}`}>
                          {sr.status}
                        </span>
                      </td>
                      <td className="cell-muted">{sr.trigger}</td>
                      <td className="cell-muted">{sr.source_host}</td>
                      <td className="cell-muted" style={{ fontSize: 10 }}>
                        {sr.summary ? Object.entries(sr.summary).map(([k, v]) => `${k}: ${v}`).join(' · ') : '—'}
                      </td>
                      <td className="cell-bad" style={{ fontSize: 10 }}>{sr.error ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
        <div style={{ marginTop: 14 }}>
          <button className="btn" onClick={() => requestManualRefresh()}>Request manual refresh</button>
          <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 12 }}>
            Creates a SyncRequest record (pending) — request-state only, no arbitrary exec. Logged in Audit tab.
          </span>
        </div>
        {syncRequests.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div className="mono" style={{ marginBottom: 8 }}>Sync requests</div>
            {syncRequests.map(req => (
              <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--line)' }}>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--soft)' }}>{req.requested_by ?? 'system'}</span>
                  <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 8 }}>{fmtTime(req.requested_at)} {fmtDate(req.requested_at)}</span>
                  {localSyncRequests.some(r => r.id === req.id) && (
                    <span className="tag" style={{ marginLeft: 8, fontSize: 8 }}>this session</span>
                  )}
                </div>
                <span className={`tag ${req.status === 'pending' ? 'tag--signal' : req.status === 'completed' ? 'tag--ok' : req.status === 'failed' ? 'tag--bad' : ''}`}>
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function WorkspaceTab({ data }: { data: WarungData }) {
  const ws = data.workspaceSignal
  if (!ws) {
    return (
      <div className="ops-section">
        <div className="ops-section-label">Workspace / git signals</div>
        <div className="panel">
          <UnavailableNote label="git signals" />
          <p style={{ fontSize: 11, color: 'var(--muted)' }}>
            Git signals adapter not yet connected. When wired, this shows branch, HEAD, recent commits,
            file churn, and working tree state for approved repos under ~/Documents/warung-repo/.
          </p>
        </div>
      </div>
    )
  }
  return (
    <>
      <div className="ops-section">
        <div className="ops-section-label">Workspace / git signals</div>
        <div className="grid grid--4" style={{ marginBottom: 16 }}>
          <div className="panel panel--min">
            <div className="mono">Branch</div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', marginTop: 8 }}>{ws.branch}</div>
          </div>
          <div className="panel panel--min">
            <div className="mono">Head</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 16, marginTop: 8, color: 'var(--soft)' }}>{ws.head}</div>
          </div>
          <div className="panel panel--min">
            <div className="mono">Commits 24h</div>
            <div className="metric-value">{ws.commits_24h}</div>
          </div>
          <div className="panel panel--min">
            <div className="mono">Commits 7d</div>
            <div className="metric-value">{ws.commits_7d}</div>
          </div>
        </div>

        <div className="grid grid--2">
          <div className="panel">
            <div className="mono" style={{ marginBottom: 10 }}>Recent commits</div>
            <div className="table-wrap">
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Hash</th>
                    <th>When</th>
                    <th>Author</th>
                    <th>Subject</th>
                  </tr>
                </thead>
                <tbody>
                  {(ws.recent_commits ?? []).map(c => (
                    <tr key={c.hash}>
                      <td className="cell-mono">{c.hash}</td>
                      <td className="cell-mono">{fmtDate(c.committed_at)}</td>
                      <td className="cell-muted">{c.author}</td>
                      <td style={{ color: 'var(--soft)', fontSize: 11 }}>{c.subject}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="panel panel--alt">
            <div className="mono" style={{ marginBottom: 10 }}>File churn (7d)</div>
            {(ws.file_churn ?? []).map((f, i) => (
              <HBarRow key={i} label={f.path.split('/').pop() ?? f.path} value={f.touches} max={10} colorClass="teal" />
            ))}
            <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
              <div className="mono" style={{ marginBottom: 4 }}>Working tree</div>
              <span className={`tag ${ws.working_tree === 'clean' ? 'tag--ok' : 'tag--warn'}`}>{ws.working_tree}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function AgentsTab({ data }: { data: WarungData }) {
  const { teamMembers, hermesModelHealth, dotDelegation, gatewayStatus, providerCatalog } = data
  return (
    <>
      <div className="ops-section">
        <div className="ops-section-label">Agent / team status</div>
        {teamMembers.length === 0
          ? <div className="panel"><UnavailableNote label="agent status" /></div>
          : <div className="grid grid--4" style={{ marginBottom: 20 }}>
              {teamMembers.map(m => (
                <div key={m.id} className="panel panel--min">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</span>
                    <span className={`tag ${m.status === 'active' ? 'tag--ok' : m.status === 'waiting' ? 'tag--warn' : m.status === 'blocked' ? 'tag--bad' : ''}`}>
                      {m.status}
                    </span>
                  </div>
                  <div className="mono" style={{ marginBottom: 4 }}>{m.role}</div>
                  <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{m.current_task}</p>
                  <div className="mono" style={{ marginTop: 8, fontSize: 9 }}>{m.model}</div>
                </div>
              ))}
            </div>
        }
      </div>

      <div className="ops-section">
        <div className="ops-section-label">Hermes model / provider / fallback health</div>
        {hermesModelHealth.length === 0
          ? <div className="panel"><UnavailableNote label="model health" /></div>
          : <div className="table-wrap">
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Model</th>
                    <th>Status</th>
                    <th>Latency</th>
                    <th>Primary</th>
                    <th>Fallback</th>
                    <th>Last checked</th>
                  </tr>
                </thead>
                <tbody>
                  {hermesModelHealth.map(h => (
                    <tr key={h.id}>
                      <td className="cell-muted">{h.provider}</td>
                      <td className="cell-strong">{h.model}</td>
                      <td>
                        <span className={`tag ${h.status === 'ok' ? 'tag--ok' : h.status === 'degraded' ? 'tag--warn' : 'tag--bad'}`}>
                          {h.status}
                        </span>
                      </td>
                      <td className="cell-mono">{h.latency_ms != null ? `${h.latency_ms}ms` : '—'}</td>
                      <td className={h.is_primary ? 'cell-ok' : 'cell-muted'}>{h.is_primary ? 'yes' : '—'}</td>
                      <td className={h.is_fallback ? 'cell-ok' : 'cell-muted'}>{h.is_fallback ? 'yes' : '—'}</td>
                      <td className="cell-mono">{fmtTime(h.last_checked_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>

      <div className="gap-sm" />

      <div className="ops-section">
        <div className="ops-section-label">Hermes gateway connectivity</div>
        {gatewayStatus.length === 0
          ? <div className="panel"><UnavailableNote label="gateway status" /><p style={{ fontSize: 11, color: 'var(--muted)' }}>gateway_state.json not found in any Hermes profile — run snapshot:generate after gateway is active.</p></div>
          : <div className="grid grid--2">
              {gatewayStatus.map(gw => (
                <div key={gw.id} className="panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--soft)' }}>{gw.profile}</span>
                    <span className={`tag ${gw.gateway_state === 'running' ? 'tag--ok' : gw.gateway_state === 'stopped' ? 'tag--bad' : ''}`}>
                      {gw.gateway_state}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
                    {gw.active_agents} active agent{gw.active_agents !== 1 ? 's' : ''}
                    {gw.updated_at ? ` · updated ${fmtTime(gw.updated_at)}` : ''}
                  </div>
                  {gw.platforms.length > 0
                    ? gw.platforms.map(p => (
                        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderTop: '1px solid var(--line)' }}>
                          <span className="mono" style={{ fontSize: 10 }}>{p.name}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {p.error_message && <span style={{ fontSize: 9, color: 'var(--bad)' }}>{p.error_message}</span>}
                            <span className={`tag ${p.state === 'connected' ? 'tag--ok' : p.state === 'retrying' ? 'tag--warn' : p.state === 'disconnected' ? 'tag--bad' : ''}`}>
                              {p.state}
                            </span>
                          </div>
                        </div>
                      ))
                    : <div style={{ fontSize: 11, color: 'var(--muted)', paddingTop: 6, borderTop: '1px solid var(--line)' }}>No platforms configured</div>
                  }
                  {gw.error && <div style={{ marginTop: 8, fontSize: 10, color: 'var(--bad)' }}>{gw.error}</div>}
                </div>
              ))}
            </div>
        }
      </div>

      <div className="gap-sm" />

      <div className="ops-section">
        <div className="ops-section-label">Provider model catalog</div>
        {providerCatalog.length === 0
          ? <div className="panel"><UnavailableNote label="provider catalog" /><p style={{ fontSize: 11, color: 'var(--muted)' }}>provider_models_cache.json not found in any Hermes profile.</p></div>
          : <div className="table-wrap">
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Profile</th>
                    <th>Provider</th>
                    <th>Models</th>
                    <th>Cached</th>
                  </tr>
                </thead>
                <tbody>
                  {providerCatalog.map(pc => (
                    <tr key={pc.id}>
                      <td className="cell-muted">{pc.profile}</td>
                      <td className="cell-strong">{pc.provider}</td>
                      <td className="cell-mono">{pc.model_count}</td>
                      <td className="cell-mono">{pc.cached_at ? `${fmtDate(pc.cached_at)} ${fmtTime(pc.cached_at)}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>

      <div className="gap-sm" />

      <div className="ops-section">
        <div className="ops-section-label">Dot / delegation status</div>
        {dotDelegation.length === 0
          ? <div className="panel"><UnavailableNote label="dot delegation" /></div>
          : <div className="table-wrap">
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Dot</th>
                    <th>Agent</th>
                    <th>Task</th>
                    <th>Status</th>
                    <th>Started</th>
                    <th>Last activity</th>
                  </tr>
                </thead>
                <tbody>
                  {dotDelegation.map(d => (
                    <tr key={d.id}>
                      <td className="cell-strong cell-mono">{d.dot_name}</td>
                      <td className="cell-muted">{d.agent}</td>
                      <td style={{ color: 'var(--soft)', fontSize: 11 }}>{d.task}</td>
                      <td>
                        <span className={`tag ${d.status === 'active' ? 'tag--ok' : d.status === 'waiting' ? 'tag--warn' : d.status === 'blocked' ? 'tag--bad' : ''}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="cell-mono">{fmtTime(d.started_at)}</td>
                      <td className="cell-mono">{fmtTime(d.last_activity_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>
    </>
  )
}

function AuditTab() {
  const { auditLog } = useLocalState()
  return (
    <div className="ops-section">
      <div className="ops-section-label">
        Session audit log
        {auditLog.length > 0 && (
          <span className="mono" style={{ marginLeft: 10, color: 'var(--ok)' }}>
            {auditLog.length} entr{auditLog.length === 1 ? 'y' : 'ies'} this session
          </span>
        )}
      </div>
      <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 12, fontFamily: 'var(--mono)', letterSpacing: '0.04em' }}>
        Local only — clears on page refresh. Records approvals and manual refresh requests made in this session.
        No state is written to disk or sent externally.
      </div>
      {auditLog.length === 0 ? (
        <div className="panel">
          <div style={{ padding: '12px 0', color: 'var(--muted)', fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '0.04em' }}>
            —no entries yet—
          </div>
          <p style={{ fontSize: 11, color: 'var(--muted)' }}>
            Approve or reject items in the approval queue on Home, or request a manual refresh
            on the Sources or Overview tab. Each action is recorded here with a timestamp.
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Target</th>
                <th>Actor</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map(entry => (
                <tr key={entry.id}>
                  <td className="cell-mono">{fmtTimestamp(entry.timestamp)}</td>
                  <td>
                    <span className={`tag ${auditActionTagClass(entry.action)}`}>
                      {auditActionLabel(entry.action)}
                    </span>
                  </td>
                  <td style={{ color: 'var(--soft)', fontSize: 11, maxWidth: 320 }}>{entry.target_title}</td>
                  <td className="cell-muted">{entry.actor}</td>
                  <td className="cell-muted" style={{ fontSize: 10 }}>{entry.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function OperationsPage() {
  const [activeTab, setActiveTab] = useState<OpsTab>('overview')
  const { data, isLoading, loadError } = useWarungData()
  const { auditLog, requestManualRefresh, recordView } = useLocalState()

  let sourceLabel = 'FIXTURE'
  if (isLoading) {
    sourceLabel = 'LOADING...'
  } else if (data.meta.sourceMode === 'snapshot') {
    sourceLabel = data.meta.isHermesScoped ? 'SNAPSHOT · HERMES-ONLY' : 'SNAPSHOT'
  } else if (loadError) {
    sourceLabel = 'FIXTURE FALLBACK'
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-label">Operations</div>
          <h1 className="page-h1">System pulse.</h1>
          <p className="page-dek">
            Token usage, cron health, source freshness, sync runs, workspace signals, and agent status.
            Mission Control Online data parity.
          </p>
          <div className="mono" style={{ fontSize: 9, color: 'var(--muted)', marginTop: 6, paddingLeft: 6, borderLeft: '2px solid var(--signal)', letterSpacing: '0.08em' }}>
            DATA SOURCE: {sourceLabel}
            {data.meta.warnings.length > 0 && (
              <span style={{ marginLeft: 10, color: 'var(--muted)', fontWeight: 400 }}>
                {' — '}{data.meta.warnings[0]}
              </span>
            )}
          </div>
        </div>
        <div className="page-actions">
          <button
            className="btn"
            onClick={() => {
              requestManualRefresh()
              setActiveTab('audit')
            }}
          >
            Manual refresh
          </button>
          <button
            className="btn btn--primary"
            onClick={() => {
              recordView('run-log', 'Run log', 'view_run_log')
              setActiveTab('automation')
            }}
          >
            Open run log
          </button>
        </div>
      </div>

      <div className="ops-tabs">
        {opsTabs.map(tab => (
          <button
            key={tab.id}
            className={`ops-tab-btn${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.id === 'audit' && auditLog.length > 0 && (
              <span style={{ marginLeft: 5, fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--signal)' }}>
                {auditLog.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'overview'   && <OverviewTab data={data} />}
      {activeTab === 'usage'      && <UsageTab data={data} />}
      {activeTab === 'automation' && <AutomationTab data={data} />}
      {activeTab === 'sources'    && <SourcesTab data={data} />}
      {activeTab === 'workspace'  && <WorkspaceTab data={data} />}
      {activeTab === 'agents'     && <AgentsTab data={data} />}
      {activeTab === 'audit'      && <AuditTab />}
    </div>
  )
}
