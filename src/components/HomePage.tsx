import type { ReactNode } from 'react'
import { useWarungData } from '../data/dataSource'
import { useLocalState } from '../data/localState'
import type { DailyBriefItem, ApprovalStatus } from '../types/warung-os'

function tagClass(type: DailyBriefItem['type']): string {
  switch (type) {
    case 'win':       return 'tag tag--ok'
    case 'needs_raz': return 'tag tag--signal'
    case 'blocked':   return 'tag tag--warn'
    case 'next':      return 'tag'
    case 'info':      return 'tag tag--blue'
  }
}

function tagLabel(type: DailyBriefItem['type']): string {
  switch (type) {
    case 'win':       return 'Win'
    case 'needs_raz': return 'Needs Raz'
    case 'blocked':   return 'Blocked'
    case 'next':      return 'Next'
    case 'info':      return 'Info'
  }
}

function approvalTagClass(status: ApprovalStatus): string {
  switch (status) {
    case 'approved':          return 'tag--ok'
    case 'rejected':          return 'tag--bad'
    case 'changes_requested': return 'tag--warn'
    case 'blocked':           return 'tag--warn'
    default:                  return 'tag--signal'
  }
}

export default function HomePage() {
  const { data } = useWarungData()
  const { localApprovalStates, updateApprovalStatus, recordView } = useLocalState()
  const { projects, approvals, dailyBrief, cronJobs, sourceHealth, sessionActivityDaily, meta } = data

  // --- Approval signals ---
  const effectiveApprovals = approvals.map(ap => ({
    ...ap,
    status: (localApprovalStates[ap.id] ?? ap.status) as ApprovalStatus,
  }))
  const pendingApprovals = effectiveApprovals.filter(a => a.status === 'pending')

  // --- Project signals ---
  // Generator already skips archived/_Archive folders, so all returned projects are in scope.
  // 'unknown' status means unstructured frontmatter — still tracked, not archived.
  const TERMINAL = new Set(['archived', 'done', 'cancelled'])
  const activeProjects = projects.filter(p => !TERMINAL.has(p.status ?? ''))
  const blockedProjects = projects.filter(p => p.status === 'blocked')

  // --- Cron signals ---
  const enabledCronJobs = cronJobs.filter(j => j.enabled !== false)
  const cronJobsWithRuns = enabledCronJobs.filter(j => (j.run_count ?? 0) > 0)
  const errorCronJobs = enabledCronJobs.filter(j => j.error != null)

  // --- Source health signals ---
  const okSources = sourceHealth.filter(s => s.status === 'ok')
  const warnSources = sourceHealth.filter(s => s.status === 'warn')
  const badSources = sourceHealth.filter(s => s.status === 'bad')

  // --- Most recent session day across all sources ---
  const recentSession = sessionActivityDaily.length > 0
    ? [...sessionActivityDaily].sort((a, b) => b.date.localeCompare(a.date))[0]
    : null

  // --- Summary metrics ---
  const movedProjects = activeProjects.length
  const runsSucceeded = cronJobsWithRuns.length
  const blocked = blockedProjects.length + badSources.length
  const razAttention = pendingApprovals.length
  const primaryFocus = dailyBrief.find(d => d.type === 'needs_raz')

  // --- Metric notes (derived from real data) ---
  const activeProjectNames =
    activeProjects.slice(0, 3).map(p => p.name).join(', ') || '—'
  const runsNote =
    enabledCronJobs.length > 0
      ? cronJobsWithRuns.length === enabledCronJobs.length
        ? `All ${enabledCronJobs.length} jobs ran · 30d`
        : `${cronJobsWithRuns.length} of ${enabledCronJobs.length} enabled jobs · 30d`
      : 'No cron data'
  const blockedNote =
    [
      ...blockedProjects.slice(0, 2).map(p => p.name),
      ...badSources.slice(0, 1).map(s => s.label),
    ].join(' · ') || 'None'
  const razAttentionNote =
    pendingApprovals.length > 0 ? pendingApprovals[0].title : 'Nothing pending'

  // --- Dynamic focus headline and body ---
  let focusHeadline: ReactNode
  let focusBody: string
  if (pendingApprovals.length > 0) {
    focusHeadline =
      pendingApprovals.length === 1 ? (
        <>{pendingApprovals[0].project}:<br />approval needed.</>
      ) : (
        <>Clear the<br />approval queue.</>
      )
    focusBody =
      pendingApprovals.length === 1
        ? `"${pendingApprovals[0].title}" is waiting. Fast decisions unblock downstream work.`
        : `${pendingApprovals.length} approvals waiting. Fast decisions unblock downstream work.`
  } else if (blockedProjects.length > 0) {
    const bp = blockedProjects[0]
    focusHeadline = <>Unblock<br />{bp.name}.</>
    focusBody = bp.blocker
      ? `Blocker: ${bp.blocker}.`
      : `${bp.name} needs attention. Clearing this unblocks the next phase.`
  } else if (badSources.length > 0) {
    focusHeadline = <>Check<br />source health.</>
    focusBody = `${badSources.length} source${badSources.length > 1 ? 's are' : ' is'} unreachable. See Operations → Sources for details.`
  } else {
    focusHeadline = <>Workspace is healthy.<br />Keep the momentum.</>
    focusBody =
      `${activeProjects.length} project${activeProjects.length !== 1 ? 's are' : ' is'} active and moving.` +
      (warnSources.length > 0
        ? ` ${warnSources.length} source warning${warnSources.length > 1 ? 's' : ''} to monitor.`
        : ' No blockers.')
  }

  const showOpsStrip = sourceHealth.length > 0 || enabledCronJobs.length > 0

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-label">Home / Daily Brief</div>
          <h1 className="page-h1">Good morning, Raz.</h1>
          <p className="page-dek">
            Here's the quick recap of what happened inside Warung Kerja over the last 24 hours,
            what needs attention, and what should happen next.
          </p>
        </div>
        <div className="page-actions">
          <button
            className="btn"
            onClick={() => recordView('source-notes', 'Source notes', 'view_source_notes')}
          >
            View source notes
          </button>
          <button
            className="btn btn--primary"
            onClick={() => {
              const firstPending = effectiveApprovals.find(a => a.status === 'pending')
              if (firstPending) {
                updateApprovalStatus(firstPending.id, firstPending.title, 'approved')
              } else {
                recordView('focus', primaryFocus?.title ?? 'Focus', 'focus_approved')
              }
            }}
          >
            Approve focus
          </button>
        </div>
      </div>

      <div className="grid grid--4 panel--min" style={{ marginBottom: 16 }}>
        <div className="panel panel--min">
          <div className="mono">Projects moved</div>
          <div className="metric-value">{movedProjects}</div>
          <div className="metric-note">{activeProjectNames}</div>
        </div>
        <div className="panel panel--min">
          <div className="mono">Runs succeeded</div>
          <div className="metric-value">{runsSucceeded}</div>
          <div className="metric-note">{runsNote}</div>
        </div>
        <div className="panel panel--min">
          <div className="mono">Blocked</div>
          <div className="metric-value">{blocked}</div>
          <div className="metric-note">{blockedNote}</div>
        </div>
        <div className="panel panel--min">
          <div className="mono">Raz attention</div>
          <div className={`metric-value${razAttention > 0 ? ' text-signal' : ''}`}>{razAttention}</div>
          <div className="metric-note">{razAttentionNote}</div>
        </div>
      </div>

      {showOpsStrip && (
        <div style={{
          display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16,
          padding: '7px 12px', border: '1px solid var(--line)', background: '#080b10',
          flexWrap: 'wrap',
        }}>
          {sourceHealth.length > 0 && (
            <>
              <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>SOURCES</span>
              {okSources.length > 0 && (
                <span style={{ fontSize: 10, color: 'var(--ok)' }}>{okSources.length} ok</span>
              )}
              {warnSources.length > 0 && (
                <span style={{ fontSize: 10, color: 'var(--warn)' }}>{warnSources.length} warn</span>
              )}
              {badSources.length > 0 && (
                <span style={{ fontSize: 10, color: 'var(--bad)' }}>{badSources.length} bad</span>
              )}
            </>
          )}
          {enabledCronJobs.length > 0 && (
            <>
              {sourceHealth.length > 0 && (
                <span style={{ color: 'var(--line-strong)' }}>|</span>
              )}
              <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>CRON</span>
              <span style={{ fontSize: 10, color: errorCronJobs.length > 0 ? 'var(--bad)' : 'var(--soft)' }}>
                {cronJobsWithRuns.length}/{enabledCronJobs.length} ran
                {errorCronJobs.length > 0
                  ? ` · ${errorCronJobs.length} error${errorCronJobs.length > 1 ? 's' : ''}`
                  : ''}
              </span>
            </>
          )}
          {recentSession && (
            <>
              <span style={{ color: 'var(--line-strong)' }}>|</span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>SESSIONS</span>
              <span style={{ fontSize: 10, color: 'var(--soft)' }}>
                {recentSession.session_count} on {recentSession.date}
              </span>
            </>
          )}
          {meta.generatedAt && (
            <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 'auto' }}>
              snapshot {new Date(meta.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      )}

      <div className="brief-layout">
        <div className="panel" style={{ minHeight: 0 }}>
          <div className="mono" style={{ padding: '0 0 10px' }}>Last 24h recap</div>
          {dailyBrief.map(item => (
            <div key={item.id} className="recap-row">
              <span className={tagClass(item.type)}>{tagLabel(item.type)}</span>
              <p>{item.body}</p>
              <span className="recap-time">{item.time}</span>
            </div>
          ))}
        </div>

        <div className="panel panel--alt" style={{ minHeight: 0 }}>
          <div className="mono" style={{ marginBottom: 12 }}>Today's suggested focus</div>
          <h2>{focusHeadline}</h2>
          <p style={{ marginTop: 8 }}>{focusBody}</p>

          {primaryFocus && (
            <div className="approval-box" style={{ marginTop: 14 }}>
              <div className="mono" style={{ marginBottom: 6 }}>Primary decision</div>
              <p>{primaryFocus.title}</p>
              <p style={{ marginTop: 6, color: 'var(--muted)', fontSize: 11 }}>{primaryFocus.body}</p>
              <button
                className="btn btn--primary"
                style={{ marginTop: 10 }}
                onClick={() => {
                  const match = primaryFocus
                    ? effectiveApprovals.find(
                        a => a.project === primaryFocus.project &&
                          (a.status === 'pending' || a.status === 'changes_requested')
                      )
                    : null
                  if (match) {
                    updateApprovalStatus(match.id, match.title, 'approved')
                  } else {
                    recordView('structure', primaryFocus?.title ?? 'Structure', 'focus_approved')
                  }
                }}
              >
                Mark structure approved
              </button>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <div className="mono" style={{ marginBottom: 8 }}>Approval queue</div>
            {effectiveApprovals.map(ap => (
              <div key={ap.id} style={{ padding: '8px 0', borderTop: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--soft)', flex: 1, lineHeight: 1.4 }}>{ap.title}</span>
                  <span className={`tag ${approvalTagClass(ap.status)}`}>
                    {ap.status.replace('_', ' ')}
                  </span>
                </div>
                <p style={{ fontSize: 10, color: 'var(--muted)', margin: '0 0 6px', lineHeight: 1.4 }}>
                  {ap.description}
                </p>
                {(ap.status === 'pending' || ap.status === 'changes_requested') && (
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button
                      className="btn btn--sm"
                      style={{ color: 'var(--ok)', borderColor: 'var(--ok)' }}
                      onClick={() => updateApprovalStatus(ap.id, ap.title, 'approved')}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn--sm"
                      style={{ color: 'var(--bad)', borderColor: 'var(--bad)' }}
                      onClick={() => updateApprovalStatus(ap.id, ap.title, 'rejected')}
                    >
                      Reject
                    </button>
                    {ap.status === 'pending' && (
                      <button
                        className="btn btn--sm btn--ghost"
                        onClick={() => updateApprovalStatus(ap.id, ap.title, 'changes_requested')}
                      >
                        Changes
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
