import { useState, useMemo } from 'react'
import { wikiFixtures } from '../data/fixtures'
import type { WikiEntry } from '../types/warung-os'

function sourceTypeLabel(t: WikiEntry['source_type']): string {
  switch (t) {
    case 'agent_diary':   return 'Agent Diary'
    case 'journal':       return '1% Journal'
    case 'project_note':  return 'Project Note'
    case 'decision_log':  return 'Decision Log'
    case 'reference':     return 'Reference'
  }
}

function sourceTypeClass(t: WikiEntry['source_type']): string {
  switch (t) {
    case 'agent_diary':   return 'tag tag--blue'
    case 'journal':       return 'tag'
    case 'project_note':  return 'tag tag--ok'
    case 'decision_log':  return 'tag tag--signal'
    case 'reference':     return 'tag tag--teal'
  }
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function WikiPage() {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>('wk-1')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return wikiFixtures
    return wikiFixtures.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.excerpt.toLowerCase().includes(q) ||
      e.body.toLowerCase().includes(q) ||
      e.tags.some(t => t.toLowerCase().includes(q)) ||
      (e.project?.toLowerCase().includes(q) ?? false) ||
      e.author.toLowerCase().includes(q)
    )
  }, [query])

  const selected = results.find(e => e.id === selectedId) ?? results[0] ?? null

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-label">Wiki</div>
          <h1 className="page-h1">Find the work memory.</h1>
          <p className="page-dek">
            Browse agent diaries, 1% Journal entries, and approved work notes. Search filters
            across title, body, tags, and author. Phase 2 adds AI/RAG over the full Obsidian vault.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn">Browse all</button>
          <button className="btn btn--ghost" disabled>Ask later (Phase 2)</button>
        </div>
      </div>

      <div className="wiki-search">
        <input
          type="text"
          placeholder="Search titles, tags, authors, body text..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Wiki search"
        />
        <button className="wiki-search-btn" onClick={() => setQuery('')}>
          {query ? 'Clear' : 'Search'}
        </button>
      </div>

      {results.length === 0 ? (
        <div className="panel" style={{ padding: 24, textAlign: 'center' }}>
          <div className="mono" style={{ marginBottom: 8 }}>No results</div>
          <p>No entries matched "{query}". Try a different keyword.</p>
        </div>
      ) : (
        <div className="wiki-results">
          {results.map(entry => (
            <div
              key={entry.id}
              className={`wiki-row${entry.id === (selected?.id ?? '') ? ' selected' : ''}`}
              onClick={() => setSelectedId(entry.id)}
            >
              <div>
                <span className={sourceTypeClass(entry.source_type)}>
                  {sourceTypeLabel(entry.source_type)}
                </span>
              </div>
              <div>
                <div className="wiki-entry-title">
                  {entry.title}
                  {entry.is_current && (
                    <span className="tag tag--ok" style={{ marginLeft: 8, verticalAlign: 'middle' }}>Current</span>
                  )}
                </div>
                <div className="wiki-entry-excerpt">{entry.excerpt}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="tag">{entry.author}</span>
                {entry.project && (
                  <div className="mono" style={{ marginTop: 6, fontSize: 8 }}>{entry.project}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="wiki-detail">
          <div className="wiki-detail-meta">
            <span className={sourceTypeClass(selected.source_type)}>
              {sourceTypeLabel(selected.source_type)}
            </span>
            <span className="tag">{selected.author}</span>
            {selected.project && <span className="mono">{selected.project}</span>}
            <span className="mono">{fmtDate(selected.date)}</span>
            {selected.tags.map(t => (
              <span key={t} className="tag" style={{ fontSize: 8 }}>{t}</span>
            ))}
          </div>

          <div className="wiki-detail-title">{selected.title}</div>
          <div className="wiki-detail-body">{selected.body}</div>

          <div className="wiki-source-path">
            Source: {selected.source_path}
          </div>
        </div>
      )}

      <div className="gap" />

      <div className="phase2-note">
        Phase 2 — AI / RAG assistant: semantic search over the full Obsidian vault. Not in this build.
        Source: ~/Documents/Warung Kerja 1.0/ — read-only, no write.
      </div>
    </div>
  )
}
