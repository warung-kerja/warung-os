import type { Page } from '../App'
import { useWarungData } from '../data/dataSource'
import HomePage from './HomePage'
import ActiveProjectsPage from './ActiveProjectsPage'
import OperationsPage from './OperationsPage'
import WikiPage from './WikiPage'

interface ShellProps {
  activePage: Page
  setActivePage: (p: Page) => void
}

const navItems: { id: Page; label: string; count: string }[] = [
  { id: 'home',       label: 'Home',            count: '01' },
  { id: 'projects',   label: 'Active Projects', count: '05' },
  { id: 'operations', label: 'Operations',      count: 'LIVE' },
  { id: 'wiki',       label: 'Wiki',            count: '08' },
]

const railQuestions: Record<Page, string> = {
  home:       'Does Warung OS start with a human Daily Brief, not a technical dashboard?',
  projects:   'Is the project list enough for Phase 1 before approval modules?',
  operations: 'Should Operations stay secondary unless something breaks?',
  wiki:       'Is basic search/browse enough before AI semantic search?',
}

function formatSnapshotTime(generatedAt: string | null): string {
  if (!generatedAt) return 'not generated'
  const d = new Date(generatedAt)
  if (Number.isNaN(d.getTime())) return 'unknown'
  return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
}

function RailContent({ activePage }: { activePage: Page }) {
  const { data } = useWarungData()
  const pendingApprovals = data.approvals.filter(a => a.status === 'pending')
  const warnCrons = data.cronJobs.filter(c => c.status === 'warn' || c.status === 'bad')
  const primaryModel = data.hermesModelHealth.find(h => h.is_primary)

  if (activePage === 'home') {
    return (
      <>
        <h3 className="rail-heading">Decision rail</h3>
        <div className="rail-block">
          <div className="mono">Current question</div>
          <div className="rail-number">01</div>
          <p className="rail-text">{railQuestions.home}</p>
        </div>
        <div className="rail-block">
          <div className="mono">Approval queue</div>
          <div style={{ marginTop: 8 }}>
            <div className="progress-bar">
              <div className="progress-bar-fill warn" style={{ width: `${(pendingApprovals.length / 3) * 100}%` }} />
            </div>
          </div>
          <p className="rail-text" style={{ marginTop: 6, fontSize: 11 }}>
            {pendingApprovals.length} item{pendingApprovals.length !== 1 ? 's' : ''} need Raz review
          </p>
        </div>
        <div className="rail-list">
          <div className="rail-item">
            <span className="tag tag--signal">Raz</span>
            <p>Approve Warung OS Phase 1 structure and BofB poster direction.</p>
          </div>
          <div className="rail-item">
            <span className="tag">Mia</span>
            <p>QA: validate build passes, four tabs switch, Operations parity confirmed.</p>
          </div>
          <div className="rail-item">
            <span className="tag">Gabs</span>
            <p>Visual direction pass after Raz approves structure.</p>
          </div>
        </div>
      </>
    )
  }

  if (activePage === 'projects') {
    return (
      <>
        <h3 className="rail-heading">Approval queue</h3>
        {data.approvals.map(ap => (
          <div key={ap.id} className="rail-block">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span className="mono" style={{ fontSize: 9 }}>{ap.project}</span>
              <span className={`tag ${ap.status === 'pending' ? 'tag--signal' : ap.status === 'blocked' ? 'tag--warn' : 'tag--ok'}`}>
                {ap.status.replace('_', ' ')}
              </span>
            </div>
            <p className="rail-text" style={{ fontSize: 11 }}>{ap.title}</p>
            <p className="rail-text" style={{ fontSize: 10, marginTop: 4 }}>Req: {ap.requester}</p>
          </div>
        ))}
      </>
    )
  }

  if (activePage === 'operations') {
    return (
      <>
        <h3 className="rail-heading">Ops digest</h3>
        <div className="rail-block">
          <div className="mono">Primary model</div>
          <div className="rail-number" style={{ fontSize: 22, marginTop: 6 }}>
            {primaryModel?.model ?? '—'}
          </div>
          <p className="rail-text" style={{ marginTop: 4 }}>
            {primaryModel ? `${primaryModel.latency_ms ?? 'latency n/a'} · ${primaryModel.status.toUpperCase()}` : 'Unknown'}
          </p>
        </div>
        {warnCrons.length > 0 && (
          <div className="rail-block">
            <div className="mono">Attention needed</div>
            {warnCrons.map(cj => (
              <div key={cj.id} style={{ marginTop: 8 }}>
                <span className="tag tag--warn">{cj.status}</span>
                <p className="rail-text" style={{ marginTop: 4, fontSize: 11 }}>{cj.name} — {cj.error}</p>
              </div>
            ))}
          </div>
        )}
        <div className="rail-block">
          <div className="mono">Snapshot</div>
          <p className="rail-text" style={{ marginTop: 6 }}>
            Last: {formatSnapshotTime(data.meta.generatedAt)} — {data.meta.sourceMode === 'snapshot' ? 'safe local snapshot loaded' : 'fixture fallback'}.
          </p>
        </div>
      </>
    )
  }

  if (activePage === 'wiki') {
    return (
      <>
        <h3 className="rail-heading">Wiki index</h3>
        <div className="rail-block">
          <div className="mono">Total entries</div>
          <div className="rail-number">{data.wiki.length}</div>
          <p className="rail-text">Entries across 5 source types.</p>
        </div>
        <div className="rail-block">
          <div className="mono">Phase 2</div>
          <p className="rail-text">AI/RAG semantic search over Obsidian vault. Not in this build.</p>
        </div>
        <div className="rail-list">
          {['agent_diary', 'journal', 'project_note', 'decision_log', 'reference'].map(t => {
            const count = data.wiki.filter(e => e.source_type === t).length
            return (
              <div key={t} className="rail-item" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="mono" style={{ fontSize: 9 }}>{t.replace('_', ' ')}</span>
                <span className="mono" style={{ fontSize: 9, color: 'var(--soft)' }}>{count}</span>
              </div>
            )
          })}
        </div>
      </>
    )
  }

  return null
}

export default function Shell({ activePage, setActivePage }: ShellProps) {
  const { data } = useWarungData()
  const pendingCount = data.approvals.filter(a => a.status === 'pending').length
  const snapshotLabel = data.meta.generatedAt ? formatSnapshotTime(data.meta.generatedAt) : 'not generated'

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-brand">
          <span className="brand-mark">+</span>
          <span className="brand-title">Warung OS</span>
        </div>
        <div className="topbar-status">
          <span className="status-indicator">
            <span className="status-dot" />
            Gateway online
          </span>
          <span className="status-indicator">
            <span className="status-dot warn" />
            {pendingCount} approval{pendingCount !== 1 ? 's' : ''} waiting
          </span>
          <span>Last snapshot: {snapshotLabel}</span>
          <span>//// daily operating surface</span>
        </div>
        <div className="topbar-user">
          <span className="mono">Raz / Owner View</span>
          <span className="mono">Phase 2 Data Adapters</span>
        </div>
      </header>

      <aside className="sidebar">
        <div className="sidebar-label">Primary navigation</div>
        <nav className="nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-btn${activePage === item.id ? ' active' : ''}`}
              onClick={() => setActivePage(item.id)}
            >
              {item.label}
              <span className="nav-count">{item.count}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-section">
          <div className="mono" style={{ marginBottom: 8 }}>Phase status</div>
          <div className="sidebar-card">
            <strong>Phase 1 — Shipped</strong>
            <p>Local fixture shell is built, QA'd, and pushed to GitHub.</p>
          </div>
          <div className="sidebar-card">
            <strong>Phase 2 — In progress</strong>
            <p>Data-source boundary and safe local snapshot loader are online; real adapters remain read-only next.</p>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {activePage === 'home'       && <HomePage />}
        {activePage === 'projects'   && <ActiveProjectsPage />}
        {activePage === 'operations' && <OperationsPage />}
        {activePage === 'wiki'       && <WikiPage />}
      </main>

      <aside className="rail">
        <RailContent activePage={activePage} />
      </aside>
    </div>
  )
}
