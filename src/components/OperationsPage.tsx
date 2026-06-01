import { useState } from 'react'
import type { WarungData } from '../types/snapshot'
import { useWarungData } from '../data/dataSource'

type OpsTab = 'overview' | 'usage' | 'automation' | 'sources' | 'workspace' | 'agents'

const opsTabs: { id: OpsTab; label: string }[] = [
  { id: 'overview',   label: 'Overview' },
  { id: 'usage',      label: 'Usage' },
  { id: 'automation', label: 'Automation' },
  { id: 'sources',    label: 'Sources' },
  { id: 'workspace',  label: 'Workspace' },
  { id: 'agents',     label: 'Agents' },
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

const DATES_7D = ['05-25','05-26','05-27','05-28','05-29','05-30','05-31']
const FULL_DATES_7D = ['2026-05-25','2026-05-26','2026-05-27','2026-05-28','2026-05-29','2026-05-30','2026-05-31']

function UnavailableNote({ label }: { label: string }) {
  return (
    <div style={{ padding: '12px 0', color: 'var(--muted)', fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '0.04em' }}>
      —{label} unavailable—
    </div>
  )
}

function OverviewTab({ data }: { data: WarungData }) {
  const { cronJobs, agentTokenDaily, hermesModelHealth, syncRuns, syncRequests, gatewayStatus } = data

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
            <button className="btn" style={{ marginTop: 10 }}>Request manual refresh</button>
            <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6 }}>
              Sends a SyncRequest record — no arbitrary command execution.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

function UsageTab({ data }: { data: WarungData }) {
  const { agentTokenDaily, modelTokenDaily, toolUsageDaily } = data

  const agents = ['baro', 'mia', 'gabs', 'obey']
  const agentColors: Record<string, string> = { baro: '', mia: 'blue', gabs: 'teal', obey: 'ok' }

  const agentDailyTotals = FULL_DATES_7D.map(d =>
    agentTokenDaily.filter(r => r.date === d).reduce((s, r) => s + r.total_tokens, 0)
  )
  const agentMaxTotal = Math.max(...agentDailyTotals, 1)

  const latestDate = agentTokenDaily.reduce((max, r) => r.date > max ? r.date : max, FULL_DATES_7D[FULL_DATES_7D.length - 1])
  const todayAgentRows = agents.map(a => ({
    agent: a,
    total: agentTokenDaily.find(r => r.agent === a && r.date === latestDate)?.total_tokens ?? 0,
    turns: agentTokenDaily.find(r => r.agent === a && r.date === latestDate)?.turns ?? 0,
  }))
  const agentMax = Math.max(...todayAgentRows.map(r => r.total), 1)

  const models = ['claude-sonnet-4-6', 'claude-opus-4-7', 'claude-haiku-4-5']
  const modelColors: Record<string, string> = { 'claude-sonnet-4-6': '', 'claude-opus-4-7': 'blue', 'claude-haiku-4-5': 'teal' }

  const modelDailyTotals = FULL_DATES_7D.map(d =>
    modelTokenDaily.filter(r => r.date === d).reduce((s, r) => s + r.total_tokens, 0)
  )
  const modelMaxTotal = Math.max(...modelDailyTotals, 1)

  const todayModelRows = models.map(m => ({
    model: m,
    total: modelTokenDaily.find(r => r.model === m && r.date === latestDate)?.total_tokens ?? 0,
    turns: modelTokenDaily.find(r => r.model === m && r.date === latestDate)?.turns ?? 0,
  }))
  const modelMax = Math.max(...todayModelRows.map(r => r.total), 1)

  const hasAgentData = agentTokenDaily.length > 0
  const hasModelData = modelTokenDaily.length > 0
  const hasToolData = toolUsageDaily.length > 0
  const toolMax = Math.max(...toolUsageDaily.map(t => t.calls), 1)

  return (
    <>
      <div className="ops-section">
        <div className="ops-section-label">Agent token usage daily</div>
        {!hasAgentData
          ? <div className="panel"><UnavailableNote label="agent token usage" /><p style={{ fontSize: 11, color: 'var(--muted)' }}>Token usage adapter not yet connected. Data will appear here when a Hermes-side collector is wired in.</p></div>
          : <div className="grid grid--2">
              <div className="panel">
                <div className="mono" style={{ marginBottom: 10 }}>7-day total trend</div>
                <VertBarChart values={agentDailyTotals} labels={DATES_7D} maxValue={agentMaxTotal} />
              </div>
              <div className="panel panel--alt">
                <div className="mono" style={{ marginBottom: 10 }}>Today by agent</div>
                {todayAgentRows.map(row => (
                  <HBarRow key={row.agent} label={row.agent} value={row.total} max={agentMax} colorClass={agentColors[row.agent]} />
                ))}
              </div>
            </div>
        }
      </div>

      <div className="gap-sm" />

      <div className="ops-section">
        <div className="ops-section-label">Model token burn daily</div>
        {!hasModelData
          ? <div className="panel"><UnavailableNote label="model token burn" /></div>
          : <div className="grid grid--2">
              <div className="panel">
                <div className="mono" style={{ marginBottom: 10 }}>7-day total trend</div>
                <VertBarChart values={modelDailyTotals} labels={DATES_7D} maxValue={modelMaxTotal} colorClass="blue" />
              </div>
              <div className="panel panel--alt">
                <div className="mono" style={{ marginBottom: 10 }}>Today by model</div>
                {todayModelRows.map((row, i) => (
                  <HBarRow
                    key={row.model}
                    label={row.model.replace('claude-','').replace('-4-6','').replace('-4-7','').replace('-4-5','')}
                    value={row.total}
                    max={modelMax}
                    colorClass={Object.values(modelColors)[i]}
                  />
                ))}
                <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                  <div className="mono" style={{ marginBottom: 6 }}>Today turns by model</div>
                  {todayModelRows.map(row => (
                    <div key={row.model} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '4px 0' }}>
                      <span style={{ color: 'var(--soft)' }}>{row.model.replace('claude-', '')}</span>
                      <span className="mono" style={{ fontSize: 10 }}>{row.turns} turns</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
        }
      </div>

      <div className="gap-sm" />

      <div className="ops-section">
        <div className="ops-section-label">Tool usage daily · {latestDate}</div>
        {!hasToolData
          ? <div className="panel"><UnavailableNote label="tool usage" /></div>
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
    </>
  )
}

function AutomationTab({ data }: { data: WarungData }) {
  const { cronJobs } = data
  const okCount     = cronJobs.filter(c => c.enabled && c.status === 'ok').length
  const warnCount   = cronJobs.filter(c => c.status === 'warn').length
  const pausedCount = cronJobs.filter(c => !c.enabled).length
  const firstWarn   = cronJobs.find(c => c.status === 'warn')

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
              <div className="table-wrap">
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Job</th>
                      <th>Agent</th>
                      <th>Schedule</th>
                      <th>Status</th>
                      <th>Last run</th>
                      <th>Next run</th>
                      <th>Duration</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cronJobs.map(cj => (
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
                        <td className="cell-mono">{fmtTime(cj.last_run_at)}</td>
                        <td className="cell-mono">{cj.next_run_at ? fmtTime(cj.next_run_at) : '—'}</td>
                        <td className="cell-mono">{cj.duration_ms != null ? `${(cj.duration_ms / 1000).toFixed(1)}s` : '—'}</td>
                        <td className="cell-muted" style={{ fontSize: 10, maxWidth: 200 }}>{cj.error ?? '—'}</td>
                      </tr>
                    ))}
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
  const { sourceHealth, syncRuns, syncRequests } = data
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
          <button className="btn">Request manual refresh</button>
          <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 12 }}>
            Creates a SyncRequest record — request-state only, no arbitrary exec.
          </span>
        </div>
        {syncRequests.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div className="mono" style={{ marginBottom: 8 }}>Pending requests</div>
            {syncRequests.map(req => (
              <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--line)' }}>
                <span style={{ fontSize: 11, color: 'var(--soft)' }}>{req.requested_by ?? 'system'} · {fmtTime(req.requested_at)}</span>
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

export default function OperationsPage() {
  const [activeTab, setActiveTab] = useState<OpsTab>('overview')
  const { data, isLoading, loadError } = useWarungData()

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
          <button className="btn">Manual refresh</button>
          <button className="btn btn--primary">Open run log</button>
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
          </button>
        ))}
      </div>

      {activeTab === 'overview'   && <OverviewTab data={data} />}
      {activeTab === 'usage'      && <UsageTab data={data} />}
      {activeTab === 'automation' && <AutomationTab data={data} />}
      {activeTab === 'sources'    && <SourcesTab data={data} />}
      {activeTab === 'workspace'  && <WorkspaceTab data={data} />}
      {activeTab === 'agents'     && <AgentsTab data={data} />}
    </div>
  )
}
