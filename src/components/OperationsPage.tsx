import { useState } from 'react'
import {
  agentTokenDailyFixtures,
  modelTokenDailyFixtures,
  toolUsageDailyFixtures,
  cronJobFixtures,
  sourceHealthFixtures,
  syncRunFixtures,
  syncRequestFixtures,
  workspaceSignalFixture,
  teamMemberFixtures,
  hermesModelHealthFixtures,
  dotDelegationFixtures,
} from '../data/fixtures'

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

function OverviewTab() {
  const cronOk    = cronJobFixtures.filter(c => c.enabled && c.status === 'ok').length
  const cronTotal = cronJobFixtures.filter(c => c.enabled).length
  const warnCrons = cronJobFixtures.filter(c => c.status === 'warn' || c.status === 'bad')

  const todayTotal = agentTokenDailyFixtures
    .filter(r => r.date === '2026-05-31')
    .reduce((s, r) => s + r.total_tokens, 0)

  const primaryModel = hermesModelHealthFixtures.find(h => h.is_primary)

  const recentEvents = [
    { time: '06:00', text: 'Morning Brief cron ran — brief delivered.' },
    { time: '06:14', text: 'Obsidian sync completed. 14 files, 0 conflicts.' },
    { time: '06:30', text: 'Warung OS build dot activated — Gabs assigned.' },
    { time: '06:42', text: 'Warung OS Phase 1 files created. Build in progress.' },
    { time: '06:45', text: 'Source freshness check passed. 1 warn: TickTick rate limit.' },
    { time: 'Next',  text: 'Snapshot export at 04:00 — token usage collector at 00:30.' },
  ]

  return (
    <>
      <div className="grid grid--3" style={{ marginBottom: 20 }}>
        <div className="panel panel--min">
          <div className="mono">Cron health</div>
          <div className="metric-value" style={{ color: warnCrons.length ? 'var(--warn)' : 'var(--ok)' }}>
            {cronOk}/{cronTotal}
          </div>
          <div className="metric-note">
            {warnCrons.length ? `${warnCrons.length} job${warnCrons.length > 1 ? 's' : ''} need inspection` : 'All enabled jobs OK'}
          </div>
          <div className="cron-pips" style={{ marginTop: 10 }}>
            {cronJobFixtures.filter(c => c.enabled).map(c => (
              <span key={c.id} className={`cron-pip ${c.status === 'warn' ? 'warn' : c.status === 'bad' ? 'bad' : ''}`} title={c.name ?? ''} />
            ))}
          </div>
        </div>
        <div className="panel panel--min">
          <div className="mono">Token burn today</div>
          <div className="metric-value">{fmtTokens(todayTotal)}</div>
          <div className="metric-note">All agents combined · {new Date('2026-05-31T06:48:00Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</div>
        </div>
        <div className="panel panel--min">
          <div className="mono">Delegation / Hermes</div>
          <div className="metric-value" style={{ color: 'var(--ok)', fontSize: 32 }}>
            {primaryModel?.status === 'ok' ? 'OK' : 'DEGRADED'}
          </div>
          <div className="metric-note">
            {primaryModel?.model ?? '—'} · {primaryModel?.latency_ms ?? '—'}ms
          </div>
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
          {syncRunFixtures.slice(0, 1).map(sr => (
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
          ))}
          <div style={{ marginTop: 16 }}>
            <div className="mono" style={{ marginBottom: 8 }}>Sync requests</div>
            {syncRequestFixtures.map(req => (
              <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--line)' }}>
                <span style={{ fontSize: 11, color: 'var(--soft)' }}>{req.requested_by ?? 'system'}</span>
                <span className={`tag ${req.status === 'pending' ? 'tag--signal' : req.status === 'completed' ? 'tag--ok' : req.status === 'failed' ? 'tag--bad' : ''}`}>
                  {req.status}
                </span>
              </div>
            ))}
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

function UsageTab() {
  const agents = ['baro', 'mia', 'gabs', 'obey']
  const agentColors: Record<string, string> = { baro: '', mia: 'blue', gabs: 'teal', obey: 'ok' }

  const agentDailyTotals = FULL_DATES_7D.map(d =>
    agentTokenDailyFixtures.filter(r => r.date === d).reduce((s, r) => s + r.total_tokens, 0)
  )
  const agentMaxTotal = Math.max(...agentDailyTotals)

  const todayAgentRows = agents.map(a => ({
    agent: a,
    total: agentTokenDailyFixtures.find(r => r.agent === a && r.date === '2026-05-31')?.total_tokens ?? 0,
    turns: agentTokenDailyFixtures.find(r => r.agent === a && r.date === '2026-05-31')?.turns ?? 0,
  }))
  const agentMax = Math.max(...todayAgentRows.map(r => r.total))

  const models = ['claude-sonnet-4-6', 'claude-opus-4-7', 'claude-haiku-4-5']
  const modelColors: Record<string, string> = { 'claude-sonnet-4-6': '', 'claude-opus-4-7': 'blue', 'claude-haiku-4-5': 'teal' }

  const modelDailyTotals = FULL_DATES_7D.map(d =>
    modelTokenDailyFixtures.filter(r => r.date === d).reduce((s, r) => s + r.total_tokens, 0)
  )
  const modelMaxTotal = Math.max(...modelDailyTotals)

  const todayModelRows = models.map(m => ({
    model: m,
    total: modelTokenDailyFixtures.find(r => r.model === m && r.date === '2026-05-31')?.total_tokens ?? 0,
    turns: modelTokenDailyFixtures.find(r => r.model === m && r.date === '2026-05-31')?.turns ?? 0,
  }))
  const modelMax = Math.max(...todayModelRows.map(r => r.total))

  const toolMax = Math.max(...toolUsageDailyFixtures.map(t => t.calls))

  return (
    <>
      {/* Agent Token Usage */}
      <div className="ops-section">
        <div className="ops-section-label">Agent token usage daily</div>
        <div className="grid grid--2">
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
      </div>

      <div className="gap-sm" />

      {/* Model Token Burn */}
      <div className="ops-section">
        <div className="ops-section-label">Model token burn daily</div>
        <div className="grid grid--2">
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
      </div>

      <div className="gap-sm" />

      {/* Tool Usage */}
      <div className="ops-section">
        <div className="ops-section-label">Tool usage daily · 2026-05-31</div>
        <div className="table-wrap">
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
              {toolUsageDailyFixtures.sort((a, b) => b.calls - a.calls).map(t => (
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
      </div>
    </>
  )
}

function AutomationTab() {
  const okCount   = cronJobFixtures.filter(c => c.enabled && c.status === 'ok').length
  const warnCount = cronJobFixtures.filter(c => c.status === 'warn').length
  const pausedCount = cronJobFixtures.filter(c => !c.enabled).length

  return (
    <>
      <div className="ops-section">
        <div className="ops-section-label">Cron job health</div>
        <div className="grid grid--3" style={{ marginBottom: 16 }}>
          <div className="panel panel--min">
            <div className="mono">OK</div>
            <div className="metric-value text-ok">{okCount}</div>
            <div className="cron-pips">
              {cronJobFixtures.filter(c => c.enabled && c.status === 'ok').map(c => (
                <span key={c.id} className="cron-pip" title={c.name ?? ''} />
              ))}
            </div>
          </div>
          <div className="panel panel--min">
            <div className="mono">Warn / inspect</div>
            <div className="metric-value text-warn">{warnCount}</div>
            <div className="metric-note">TickTick Sync — rate limit error</div>
          </div>
          <div className="panel panel--min">
            <div className="mono">Paused / disabled</div>
            <div className="metric-value text-muted">{pausedCount}</div>
            <div className="metric-note">Etsy Draft Uploader disabled pending spec</div>
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
              {cronJobFixtures.map(cj => (
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
      </div>
    </>
  )
}

function SourcesTab() {
  return (
    <>
      <div className="ops-section">
        <div className="ops-section-label">Source health / freshness</div>
        <div className="table-wrap">
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
              {sourceHealthFixtures.map(sh => (
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
      </div>

      <div className="gap-sm" />

      <div className="ops-section">
        <div className="ops-section-label">Sync runs</div>
        <div className="table-wrap">
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
              {syncRunFixtures.map(sr => (
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
        <div style={{ marginTop: 14 }}>
          <button className="btn">Request manual refresh</button>
          <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 12 }}>
            Creates a SyncRequest record — request-state only, no arbitrary exec.
          </span>
        </div>
      </div>
    </>
  )
}

function WorkspaceTab() {
  const ws = workspaceSignalFixture
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

function AgentsTab() {
  return (
    <>
      {/* Team / Agent Status */}
      <div className="ops-section">
        <div className="ops-section-label">Agent / team status</div>
        <div className="grid grid--4" style={{ marginBottom: 20 }}>
          {teamMemberFixtures.map(m => (
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
      </div>

      {/* Hermes Model Health */}
      <div className="ops-section">
        <div className="ops-section-label">Hermes model / provider / fallback health</div>
        <div className="table-wrap">
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
              {hermesModelHealthFixtures.map(h => (
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
      </div>

      <div className="gap-sm" />

      {/* Dot Delegation */}
      <div className="ops-section">
        <div className="ops-section-label">Dot / delegation status</div>
        <div className="table-wrap">
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
              {dotDelegationFixtures.map(d => (
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
      </div>
    </>
  )
}

export default function OperationsPage() {
  const [activeTab, setActiveTab] = useState<OpsTab>('overview')

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

      {activeTab === 'overview'   && <OverviewTab />}
      {activeTab === 'usage'      && <UsageTab />}
      {activeTab === 'automation' && <AutomationTab />}
      {activeTab === 'sources'    && <SourcesTab />}
      {activeTab === 'workspace'  && <WorkspaceTab />}
      {activeTab === 'agents'     && <AgentsTab />}
    </div>
  )
}
