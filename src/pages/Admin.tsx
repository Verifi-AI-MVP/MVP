import { useEffect, useState } from 'react'
import { Card } from '../components/ui/Card'
import { api } from '../services/api'

type Tab = 'users' | 'loans' | 'kyc' | 'risk' | 'fraud' | 'audit'

interface User {
  id: string
  walletAddress?: string | null
  email?: string | null
  firstName: string | null
  lastName: string | null
  role: string
  isActive: boolean
  createdAt: string
}

function userLabel(u: { email?: string | null; walletAddress?: string | null }) {
  return u.email ?? (u.walletAddress ? `${u.walletAddress.slice(0, 8)}…` : '—')
}

interface Loan {
  id: string
  amount: string
  status: string
  termMonths: number
  appliedAt: string
  onChainLoanId?: string | null
  createTxHash?: string | null
  user: { walletAddress?: string | null; email?: string | null; firstName: string | null; lastName: string | null }
}

interface RiskScore {
  id: string
  userId: string
  riskScore: number
  decision: string
  recommendedLimit: string | null
  createdAt: string
  user?: { walletAddress?: string | null; email?: string | null; firstName: string | null; lastName: string | null }
}

interface FraudAlert {
  id: string
  userId: string
  signalType: string
  severity: string
  description: string | null
  createdAt: string
  user?: { walletAddress?: string | null; email?: string | null }
}

interface AuditLog {
  id: string
  userId: string | null
  action: string
  resourceType: string | null
  resourceId: string | null
  createdAt: string
  userEmail?: string
}

interface KycRow {
  id: string
  fullName: string
  country: string
  documentType: string
  status: string
  submittedAt: string
  user?: { walletAddress?: string | null; email?: string | null; kycStatus?: string }
}

const tabs: { id: Tab; label: string }[] = [
  { id: 'users', label: 'Users' },
  { id: 'loans', label: 'Loan Applications' },
  { id: 'kyc', label: 'KYC' },
  { id: 'risk', label: 'Risk Scores' },
  { id: 'fraud', label: 'Fraud Alerts' },
  { id: 'audit', label: 'Audit Log' },
]

export default function Admin() {
  const [tab, setTab] = useState<Tab>('users')
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [riskScores, setRiskScores] = useState<RiskScore[]>([])
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [kycRows, setKycRows] = useState<KycRow[]>([])

  useEffect(() => {
    setLoading(true)
    const load = async () => {
      try {
        if (tab === 'users') setUsers(await api.get('/admin/users'))
        else if (tab === 'loans') setLoans(await api.get('/admin/loans'))
        else if (tab === 'kyc') setKycRows(await api.get('/kyc/admin'))
        else if (tab === 'risk') setRiskScores(await api.get('/admin/risk-scores'))
        else if (tab === 'fraud') setFraudAlerts(await api.get('/admin/fraud-alerts'))
        else setAuditLogs(await api.get('/admin/audit-logs'))
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tab])

  const formatDate = (d: string) => new Date(d).toLocaleString()

  const updateLoanStatus = async (loanId: string, action: string) => {
    try {
      await api.post(`/admin/loans/${loanId}/status`, { action })
      setLoans(await api.get('/admin/loans'))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update loan status')
    }
  }

  const reviewKyc = async (id: string, action: 'approve' | 'reject') => {
    try {
      await api.post(`/kyc/admin/${id}/review`, { action })
      setKycRows(await api.get('/kyc/admin'))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to review KYC')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="page-eyebrow">Ops</p>
        <h1 className="page-title mt-1">Compliance Dashboard</h1>
        <p className="page-lede mt-1">Admin oversight for fintech compliance</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-shrink-0 rounded-xl px-4 py-2 text-sm font-semibold tracking-tight transition-colors
              ${tab === t.id ? 'bg-primary-600 text-white shadow-[0_10px_20px_-12px_rgba(0,112,199,0.6)]' : 'bg-white/80 dark:bg-surface-800/80 text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 border border-surface-200/80 dark:border-surface-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <p className="py-12 text-center text-surface-500">Loading...</p>
        ) : tab === 'users' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">Email / Wallet</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-surface-50 last:border-0">
                    <td className="px-4 py-3 text-sm text-surface-900 font-mono text-xs">{userLabel(u)}</td>
                    <td className="px-4 py-3 text-sm text-surface-700">{u.firstName} {u.lastName}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-surface-100 text-surface-600'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{u.isActive ? 'Active' : 'Inactive'}</td>
                    <td className="px-4 py-3 text-sm text-surface-500">{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <p className="py-8 text-center text-surface-500">No users</p>}
          </div>
        ) : tab === 'loans' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">Term</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">Chain</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((l) => (
                  <tr key={l.id} className="border-b border-surface-50 last:border-0">
                    <td className="px-4 py-3 text-sm text-surface-900 font-mono text-xs">{l.user ? userLabel(l.user) : '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium">${Number(l.amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-surface-700">{l.termMonths} mo</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        l.status === 'approved' || l.status === 'disbursed' ? 'bg-green-100 text-green-700' :
                        l.status === 'rejected' || l.status === 'defaulted' ? 'bg-red-100 text-red-700' :
                        'bg-surface-100 text-surface-600'
                      }`}>{l.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-surface-500">
                      {l.onChainLoanId ? `#${l.onChainLoanId}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {l.status === 'pending' && (
                          <>
                            <button onClick={() => updateLoanStatus(l.id, 'approve')} className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200">Approve</button>
                            <button onClick={() => updateLoanStatus(l.id, 'reject')} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200">Reject</button>
                          </>
                        )}
                        {l.status === 'approved' && (
                          <button onClick={() => updateLoanStatus(l.id, 'disburse')} className="text-xs px-2 py-1 rounded bg-primary-100 text-primary-700 hover:bg-primary-200">Disburse</button>
                        )}
                        {l.status === 'disbursed' && (
                          <>
                            <button onClick={() => updateLoanStatus(l.id, 'repay')} className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200">Repaid</button>
                            <button onClick={() => updateLoanStatus(l.id, 'default')} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200">Default</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loans.length === 0 && <p className="py-8 text-center text-surface-500">No loan applications</p>}
          </div>
        ) : tab === 'kyc' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">Doc</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">Submitted</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {kycRows.map((k) => (
                  <tr key={k.id} className="border-b border-surface-50 last:border-0">
                    <td className="px-4 py-3 text-sm font-mono text-xs">{k.user ? userLabel(k.user) : '—'}</td>
                    <td className="px-4 py-3 text-sm">{k.fullName}</td>
                    <td className="px-4 py-3 text-sm text-surface-600">{k.documentType} · {k.country}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        k.status === 'verified' ? 'bg-green-100 text-green-700' :
                        k.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>{k.status}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-500">{formatDate(k.submittedAt)}</td>
                    <td className="px-4 py-3">
                      {k.status === 'pending' && (
                        <div className="flex gap-1">
                          <button type="button" onClick={() => void reviewKyc(k.id, 'approve')} className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200">Approve</button>
                          <button type="button" onClick={() => void reviewKyc(k.id, 'reject')} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200">Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {kycRows.length === 0 && <p className="py-8 text-center text-surface-500">No KYC submissions</p>}
          </div>
        ) : tab === 'risk' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">Risk Score</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">Decision</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">Limit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {riskScores.map((r) => (
                  <tr key={r.id} className="border-b border-surface-50 last:border-0">
                    <td className="px-4 py-3 text-sm text-surface-900 font-mono text-xs">{r.user ? userLabel(r.user) : r.userId}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${r.riskScore <= 40 ? 'text-green-600' : r.riskScore <= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                        {r.riskScore}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.decision === 'approve' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {r.decision}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{r.recommendedLimit ? `$${Number(r.recommendedLimit).toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3 text-sm text-surface-500">{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {riskScores.length === 0 && <p className="py-8 text-center text-surface-500">No risk scores</p>}
          </div>
        ) : tab === 'fraud' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">Severity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {fraudAlerts.map((f) => (
                  <tr key={f.id} className="border-b border-surface-50 last:border-0">
                    <td className="px-4 py-3 text-sm text-surface-900 font-mono text-xs">{f.user ? userLabel(f.user) : f.userId}</td>
                    <td className="px-4 py-3 text-sm font-medium">{f.signalType}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        f.severity === 'critical' ? 'bg-red-100 text-red-700' :
                        f.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                        f.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-surface-100 text-surface-600'
                      }`}>{f.severity}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-600 max-w-xs truncate">{f.description ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-surface-500">{formatDate(f.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {fraudAlerts.length === 0 && <p className="py-8 text-center text-surface-500">No fraud alerts</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500">Resource</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((l) => (
                  <tr key={l.id} className="border-b border-surface-50 last:border-0">
                    <td className="px-4 py-3 text-sm text-surface-500">{formatDate(l.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-surface-700">{(l as AuditLog & { userEmail?: string }).userEmail ?? l.userId ?? '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium">{l.action}</td>
                    <td className="px-4 py-3 text-sm text-surface-600">{l.resourceType ?? '—'} {l.resourceId ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {auditLogs.length === 0 && <p className="py-8 text-center text-surface-500">No audit logs</p>}
          </div>
        )}
      </Card>
    </div>
  )
}
