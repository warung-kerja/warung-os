import { useWarungData } from '../data/dataSource'
import type { DailyBriefItem } from '../types/warung-os'

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

export default function HomePage() {
  const { data } = useWarungData()
  const { projects, approvals, dailyBrief } = data
  const movedProjects = projects.filter(p => p.status === 'moving' || p.status === 'active').length
  const runsSucceeded = 11
  const blocked = 2
  const razAttention = approvals.filter(a => a.status === 'pending').length
  const primaryFocus = dailyBrief.find(d => d.type === 'needs_raz')

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
          <button className="btn">View source notes</button>
          <button className="btn btn--primary">Approve focus</button>
        </div>
      </div>

      <div className="grid grid--4 panel--min" style={{ marginBottom: 22 }}>
        <div className="panel panel--min">
          <div className="mono">Projects moved</div>
          <div className="metric-value">{movedProjects}</div>
          <div className="metric-note">Warung OS, BofB, Etsy Ops, Passive Engine</div>
        </div>
        <div className="panel panel--min">
          <div className="mono">Runs succeeded</div>
          <div className="metric-value">{runsSucceeded}</div>
          <div className="metric-note">No intervention needed</div>
        </div>
        <div className="panel panel--min">
          <div className="mono">Blocked</div>
          <div className="metric-value">{blocked}</div>
          <div className="metric-note">Template Factory spec + Etsy Listings cache</div>
        </div>
        <div className="panel panel--min">
          <div className="mono">Raz attention</div>
          <div className="metric-value text-signal">{razAttention}</div>
          <div className="metric-note">Warung OS approval, BofB poster direction</div>
        </div>
      </div>

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
          <h2>Approve the shell,<br />then unblock Gabs.</h2>
          <p style={{ marginTop: 8 }}>
            Phase 1 is built and ready. Two things need Raz: the Warung OS structure approval, and
            the BofB poster direction call. Both are fast decisions. Both unblock downstream work.
          </p>

          {primaryFocus && (
            <div className="approval-box" style={{ marginTop: 14 }}>
              <div className="mono" style={{ marginBottom: 6 }}>Primary decision</div>
              <p>{primaryFocus.title}</p>
              <p style={{ marginTop: 6, color: 'var(--muted)', fontSize: 11 }}>{primaryFocus.body}</p>
              <button className="btn btn--primary" style={{ marginTop: 10 }}>
                Mark structure approved
              </button>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <div className="mono" style={{ marginBottom: 8 }}>Approval queue</div>
            {approvals.map(ap => (
              <div key={ap.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--line)' }}>
                <span style={{ fontSize: 11, color: 'var(--soft)' }}>{ap.title.slice(0, 42)}…</span>
                <span className={`tag ${ap.status === 'pending' ? 'tag--signal' : ap.status === 'blocked' ? 'tag--warn' : 'tag--ok'}`}>
                  {ap.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
