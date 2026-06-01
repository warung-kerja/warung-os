import { useState } from 'react'
import { useWarungData } from '../data/dataSource'
import { useLocalState } from '../data/localState'
import type { CanonicalProject, CanonicalTeamMember, ApprovalItem } from '../types/warung-os'

function statusTag(status: string | null): JSX.Element {
  switch (status) {
    case 'active':  return <span className="tag tag--ok">Active</span>
    case 'moving':  return <span className="tag tag--blue">Moving</span>
    case 'review':  return <span className="tag tag--signal">Review</span>
    case 'blocked': return <span className="tag tag--warn">Blocked</span>
    case 'paused':  return <span className="tag">Paused</span>
    case 'done':    return <span className="tag tag--ok">Done</span>
    default:        return <span className="tag">{status ?? '—'}</span>
  }
}

function priorityLabel(p: string | null): string {
  switch (p) {
    case 'p0': return 'Critical'
    case 'p1': return 'High'
    case 'p2': return 'Normal'
    case 'p3': return 'Low'
    default: return p ?? '—'
  }
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function ProjectDetail({
  project,
  approvals,
  allTeamMembers,
  approvalOverrides,
  updateApprovalStatus,
}: {
  project: CanonicalProject
  approvals: ApprovalItem[]
  allTeamMembers: CanonicalTeamMember[]
  approvalOverrides: Record<string, ApprovalItem['status']>
  updateApprovalStatus: (id: string, title: string, status: ApprovalItem['status']) => void
}) {
  const approval = approvals.find(a => a.project === project.id)
  const effectiveApproval = approval ? { ...approval, status: approvalOverrides[approval.id] ?? approval.status } : null
  const owner = allTeamMembers.find(m => m.name === project.owner)
  const teamMembers = (project.team ?? []).map(name => allTeamMembers.find(m => m.name === name)).filter(Boolean)

  return (
    <div className="project-detail">
      <div className="project-detail-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="mono" style={{ marginBottom: 4 }}>Project detail</div>
          <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.02em' }}>{project.name}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {statusTag(project.status)}
          <span className="tag">{priorityLabel(project.priority)}</span>
        </div>
      </div>

      <div className="grid grid--2" style={{ border: 'none', gap: '1px', background: 'var(--gutter)' }}>
        <div className="panel">
          <div className="mono" style={{ marginBottom: 10 }}>Project info</div>
          <table style={{ width: '100%', fontSize: 12 }}>
            <tbody>
              <tr>
                <td style={{ color: 'var(--muted)', paddingBottom: 6, width: 110 }}>Phase</td>
                <td style={{ color: 'var(--soft)', paddingBottom: 6 }}>{project.current_phase ?? '—'}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--muted)', paddingBottom: 6 }}>Next step</td>
                <td style={{ color: 'var(--soft)', paddingBottom: 6 }}>{project.next_step ?? '—'}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--muted)', paddingBottom: 6 }}>Blocker</td>
                <td style={{ color: project.blocker ? 'var(--warn)' : 'var(--muted)', paddingBottom: 6 }}>
                  {project.blocker ?? 'None'}
                </td>
              </tr>
              <tr>
                <td style={{ color: 'var(--muted)', paddingBottom: 6 }}>Last moved</td>
                <td style={{ color: 'var(--soft)', paddingBottom: 6 }}>{fmtDate(project.last_movement_at)}</td>
              </tr>
              <tr>
                <td style={{ color: 'var(--muted)' }}>Owner</td>
                <td style={{ color: 'var(--soft)' }}>
                  {owner?.name ?? project.owner ?? '—'}
                  {owner && <span className="mono" style={{ marginLeft: 8 }}>{owner.role ?? ''}</span>}
                </td>
              </tr>
            </tbody>
          </table>

          {teamMembers.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="mono" style={{ marginBottom: 6 }}>Team</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {teamMembers.map(m => m && (
                  <span key={m.id} className="tag">{m.name}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="panel panel--alt">
          <div className="mono" style={{ marginBottom: 10 }}>Approval module</div>
          {effectiveApproval ? (
            <>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>{effectiveApproval.title}</p>
              <p style={{ marginBottom: 10 }}>{effectiveApproval.description}</p>
              <span className={`tag ${effectiveApproval.status === 'pending' ? 'tag--signal' : effectiveApproval.status === 'blocked' ? 'tag--warn' : effectiveApproval.status === 'rejected' ? 'tag--bad' : 'tag--ok'}`}>
                {effectiveApproval.status.replace('_', ' ')}
              </span>

              <div className="approval-flow-grid" style={{ marginTop: 12 }}>
                <div>
                  <span className="tag" style={{ marginBottom: 6, display: 'block' }}>1</span>
                  <p style={{ fontSize: 11, color: 'var(--muted)' }}>Review output</p>
                </div>
                <div>
                  <span className="tag" style={{ marginBottom: 6, display: 'block' }}>2</span>
                  <p style={{ fontSize: 11, color: 'var(--muted)' }}>Approve / decline / change</p>
                </div>
                <div>
                  <span className="tag" style={{ marginBottom: 6, display: 'block' }}>3</span>
                  <p style={{ fontSize: 11, color: 'var(--muted)' }}>Write decision to log</p>
                </div>
                <div>
                  <span className="tag" style={{ marginBottom: 6, display: 'block' }}>4</span>
                  <p style={{ fontSize: 11, color: 'var(--muted)' }}>Notify agent</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  className="btn btn--primary"
                  onClick={() => updateApprovalStatus(effectiveApproval.id, effectiveApproval.title, 'approved')}
                >
                  Approve
                </button>
                <button
                  className="btn"
                  onClick={() => updateApprovalStatus(effectiveApproval.id, effectiveApproval.title, 'changes_requested')}
                >
                  Request changes
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={() => updateApprovalStatus(effectiveApproval.id, effectiveApproval.title, 'rejected')}
                >
                  Decline
                </button>
              </div>
              <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 8 }}>
                Actions are request-state placeholders — no live write in Phase 1.
              </p>
            </>
          ) : (
            <>
              <h2>No approval queued</h2>
              <p>This project has no pending approval items. Phase 2 will surface project-specific review flows here.</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ActiveProjectsPage() {
  const { data } = useWarungData()
  const { localApprovalStates, updateApprovalStatus, recordView } = useLocalState()
  const { projects, approvals, teamMembers } = data
  const [selectedId, setSelectedId] = useState<string | null>(projects[0]?.id ?? null)
  const selectedProject = projects.find(p => p.id === selectedId) ?? null

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-label">Active Projects</div>
          <h1 className="page-h1">Project command list.</h1>
          <p className="page-dek">
            Current Warung Kerja projects — sourced from Obsidian masterlist. Click any row for detail
            and the approval module.
          </p>
        </div>
        <div className="page-actions">
          <button
            className="btn"
            onClick={() => recordView('obsidian-sync', 'Obsidian sync', 'sync_obsidian_requested')}
          >
            Sync Obsidian
          </button>
          <button
            className="btn btn--primary"
            onClick={() => recordView('review-queue', 'New review queue', 'review_queue_requested')}
          >
            New review queue
          </button>
        </div>
      </div>

      <div className="project-table">
        <div className="project-row project-row--header">
          <div className="mono">Project</div>
          <div className="mono">Stage / Phase</div>
          <div className="mono">Blocker / Next</div>
          <div className="mono">Status</div>
        </div>
        {projects.map(project => (
          <div
            key={project.id}
            className="project-row"
            onClick={() => setSelectedId(project.id === selectedId ? null : project.id)}
            style={{ cursor: 'pointer', outline: project.id === selectedId ? '1px solid var(--ok)' : 'none' }}
          >
            <div>
              <div className="project-name">{project.name}</div>
              <div className="project-desc">{project.next_step?.slice(0, 80)}</div>
            </div>
            <div>
              <div style={{ marginBottom: 4 }}>{project.current_phase?.split('—')[0].trim()}</div>
              <div className="project-desc">{project.current_phase?.split('—')[1]?.trim()}</div>
            </div>
            <div>
              {project.blocker
                ? <p className="project-desc" style={{ color: 'var(--warn)' }}>{project.blocker}</p>
                : <p className="project-desc">—</p>
              }
              <div className="mono" style={{ marginTop: 6 }}>
                {project.owner} · {fmtDate(project.last_movement_at)}
              </div>
            </div>
            <div>{statusTag(project.status)}</div>
          </div>
        ))}
      </div>

      {selectedProject && (
        <ProjectDetail
          project={selectedProject}
          approvals={approvals}
          allTeamMembers={teamMembers}
          approvalOverrides={localApprovalStates}
          updateApprovalStatus={updateApprovalStatus}
        />
      )}

      <div className="gap" />

      <div className="grid grid--2">
        <div className="panel">
          <div className="mono" style={{ marginBottom: 10 }}>Phase 1 boundary</div>
          <h2>Clean list + status readout.</h2>
          <p>
            Project-specific approval modules become Phase 2 once the core OS shell is validated.
            The approval flow above is a placeholder that shows the intended state machine:
            pending → approved / rejected / changes requested.
          </p>
        </div>
        <div className="panel panel--alt">
          <div className="mono" style={{ marginBottom: 10 }}>Approval states</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {(['pending', 'approved', 'rejected', 'changes_requested', 'blocked'] as const).map(state => (
              <div key={state} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={`tag ${state === 'pending' ? 'tag--signal' : state === 'approved' ? 'tag--ok' : state === 'rejected' ? 'tag--bad' : state === 'blocked' ? 'tag--warn' : ''}`}>
                  {state.replace('_', ' ')}
                </span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {state === 'pending' ? 'Awaiting Raz decision'
                    : state === 'approved' ? 'Decision logged, agent notified'
                    : state === 'rejected' ? 'Declined, agent notified'
                    : state === 'changes_requested' ? 'Feedback sent, revision queued'
                    : 'Waiting on prerequisite'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
