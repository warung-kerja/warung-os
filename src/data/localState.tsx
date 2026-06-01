// Local session state for approvals, sync requests, and audit log.
// All state is in-memory only — no disk, no network, no external publishing.
// Intentionally session-scoped; clears on page refresh by design.

import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { ApprovalStatus, SyncRequest, AuditLogEntry, AuditAction } from '../types/warung-os'

let _seq = 0
function uid(prefix: string) { return `${prefix}-${Date.now()}-${++_seq}` }

export interface LocalStateContextValue {
  localApprovalStates: Record<string, ApprovalStatus>
  localSyncRequests: SyncRequest[]
  auditLog: AuditLogEntry[]
  updateApprovalStatus: (id: string, title: string, status: ApprovalStatus) => void
  requestManualRefresh: (requestedBy?: string) => void
}

const LocalStateContext = createContext<LocalStateContextValue | null>(null)

export function LocalStateProvider({ children }: { children: ReactNode }) {
  const [localApprovalStates, setLocalApprovalStates] = useState<Record<string, ApprovalStatus>>({})
  const [localSyncRequests, setLocalSyncRequests] = useState<SyncRequest[]>([])
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([])

  const addAuditEntry = useCallback((
    action: AuditAction,
    targetId: string,
    targetTitle: string,
    actor: string,
    note: string | null = null,
  ) => {
    setAuditLog(prev => [{
      id: uid('audit'),
      action,
      target_id: targetId,
      target_title: targetTitle,
      actor,
      timestamp: new Date().toISOString(),
      note,
    }, ...prev])
  }, [])

  const updateApprovalStatus = useCallback((id: string, title: string, status: ApprovalStatus) => {
    setLocalApprovalStates(prev => ({ ...prev, [id]: status }))
    const action: AuditAction =
      status === 'approved'          ? 'approval_granted'   :
      status === 'rejected'          ? 'approval_rejected'  :
      status === 'changes_requested' ? 'changes_requested'  :
                                       'approval_blocked'
    addAuditEntry(action, id, title, 'Raz')
  }, [addAuditEntry])

  const requestManualRefresh = useCallback((requestedBy = 'Raz') => {
    const id = uid('req')
    const req: SyncRequest = {
      id,
      requested_by: requestedBy,
      requested_at: new Date().toISOString(),
      status: 'pending',
      started_at: null,
      completed_at: null,
      handled_by: null,
      error: null,
    }
    setLocalSyncRequests(prev => [req, ...prev])
    addAuditEntry('manual_refresh_requested', id, 'Manual refresh', requestedBy)
  }, [addAuditEntry])

  return (
    <LocalStateContext.Provider value={{
      localApprovalStates,
      localSyncRequests,
      auditLog,
      updateApprovalStatus,
      requestManualRefresh,
    }}>
      {children}
    </LocalStateContext.Provider>
  )
}

export function useLocalState(): LocalStateContextValue {
  const ctx = useContext(LocalStateContext)
  if (!ctx) throw new Error('useLocalState must be used inside LocalStateProvider')
  return ctx
}
