import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { TxHash } from '../components/TxHash'
import { api } from '../services/api'

interface Eligibility {
  riskScore: number
  decision: string
  reasonCodes: { code: string; description: string }[]
  recommendedLimit?: number
  attestation?: {
    txHash: string
    attestationId: string
    contractAddress: string
    chainId: number
    mode: string
  } | null
}

interface LoanRecord {
  id: string
  amount: number
  status: string
  termMonths: number
  monthlyPayment: number
  interestRatePct: number
  appliedAt: string
  chainId?: number | null
  contractAddress?: string | null
  onChainLoanId?: string | null
  createTxHash?: string | null
  statusTxHash?: string | null
}

export default function Loans() {
  const [eligibility, setEligibility] = useState<Eligibility | null>(null)
  const [loans, setLoans] = useState<LoanRecord[]>([])
  const [applyForm, setApplyForm] = useState({ amount: '', termMonths: '12' })
  const [appliedMsg, setAppliedMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [eligibilityLoading, setEligibilityLoading] = useState(true)
  const [eligibilityError, setEligibilityError] = useState<string | null>(null)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [kycStatus, setKycStatus] = useState<string>('unverified')

  const loadEligibility = () => {
    setEligibilityLoading(true)
    setEligibilityError(null)
    api.get<Eligibility>('/loans/eligibility')
      .then(setEligibility)
      .catch((err) => {
        setEligibility(null)
        setEligibilityError(err instanceof Error ? err.message : "We couldn't load your eligibility. Give it another try.")
      })
      .finally(() => setEligibilityLoading(false))
  }

  const loadLoans = () => {
    api.get<LoanRecord[]>('/loans').then(setLoans).catch(() => setLoans([]))
  }

  const loadKyc = () => {
    api
      .get<{ status: string }>('/kyc/me')
      .then((res) => setKycStatus(res.status))
      .catch(() => setKycStatus('unverified'))
  }

  useEffect(() => {
    loadEligibility()
    loadLoans()
    loadKyc()
  }, [])

  const kycVerified = kycStatus === 'verified'
  const eligible = eligibility?.decision === 'approve'

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eligible || !kycVerified) return
    const amount = parseFloat(applyForm.amount)
    const limit = eligibility?.recommendedLimit
    if (limit != null && amount > limit) {
      setApplyError(`Amount cannot exceed your recommended limit of $${limit.toLocaleString()}.`)
      return
    }
    setLoading(true)
    setAppliedMsg(null)
    setApplyError(null)
    try {
      const result = await api.post<{ message?: string }>('/loans/apply', {
        amount: parseFloat(applyForm.amount),
        termMonths: parseInt(applyForm.termMonths, 10),
      })
      setAppliedMsg(result.message || 'Application submitted.')
      setApplyForm({ amount: '', termMonths: '12' })
      loadLoans()
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : "We couldn't submit your application. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="page-eyebrow">Credit</p>
          <h1 className="page-title mt-1">Loans</h1>
        </div>
        <Link to="/blockchain" className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline mb-1">
          On-chain
        </Link>
      </div>

      <Card>
        <p className="text-sm font-medium text-surface-500 mb-2">Where you stand</p>
        {eligibilityLoading ? (
          <div className="flex items-center gap-3 py-4">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-surface-500">Checking your eligibility…</span>
          </div>
        ) : eligibilityError ? (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{eligibilityError}</p>
            <button onClick={loadEligibility} className="mt-2 text-sm font-medium text-primary-600 hover:underline">Try again</button>
          </div>
        ) : eligibility ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-surface-900 dark:text-surface-100">{eligibility.riskScore}</p>
                <p className="text-sm text-surface-500">Your risk score (lower is better)</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-sm font-medium
                  ${eligibility.decision === 'approve' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              >
                {eligibility.decision === 'approve' ? "You're eligible" : 'Not quite there yet'}
              </span>
            </div>
            {eligibility.recommendedLimit && (
              <p className="mt-3 text-sm text-surface-600 dark:text-surface-400">
                We suggest up to <strong>${eligibility.recommendedLimit.toLocaleString()}</strong>
              </p>
            )}
            {eligibility.attestation && (
              <div className="mt-3 rounded-lg border border-surface-100 dark:border-surface-800 p-3 text-xs text-surface-600 dark:text-surface-400 space-y-1">
                <p className="font-medium text-surface-800 dark:text-surface-200">Score is also on-chain</p>
                <TxHash hash={eligibility.attestation.txHash} chainId={eligibility.attestation.chainId} />
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-surface-100 dark:border-surface-800">
              <p className="text-xs font-medium text-surface-500 mb-2">Why this score?</p>
              <ul className="text-xs text-surface-600 dark:text-surface-400 space-y-1">
                {eligibility.reasonCodes?.slice(0, 5).map((r, i) => (
                  <li key={i}>{r.code}: {r.description}</li>
                ))}
              </ul>
            </div>
            <Button variant="secondary" size="sm" className="mt-3" onClick={loadEligibility}>
              Refresh
            </Button>
          </>
        ) : (
          <>
            <p className="text-surface-500 text-sm mb-3">Connect your accounts and add a few transactions so we can see how you're doing.</p>
            <Button size="sm" onClick={loadEligibility}>Check my eligibility</Button>
          </>
        )}
      </Card>

      <Card>
        <p className="text-sm font-medium text-surface-500 mb-4">Apply for a loan</p>
        {!kycVerified ? (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 p-4 space-y-2">
            <p className="text-sm text-amber-900 dark:text-amber-200">
              Identity verification is required before you can apply. Status: <strong className="capitalize">{kycStatus}</strong>
            </p>
            <Link to="/verify" className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">
              Verify identity →
            </Link>
          </div>
        ) : eligibilityLoading ? (
          <p className="text-sm text-surface-500">Checking eligibility…</p>
        ) : !eligible ? (
          <div className="rounded-xl bg-surface-50 dark:bg-surface-900/60 border border-surface-100 dark:border-surface-800 p-4 space-y-2">
            <p className="text-sm text-surface-700 dark:text-surface-300">
              Applications open when your score is eligible. Improve your cash flow and try again after linking more activity.
            </p>
            <Link to="/accounts" className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">
              Review linked accounts
            </Link>
          </div>
        ) : appliedMsg ? (
          <div className="space-y-2">
            <p className="text-green-600 dark:text-green-400 font-medium">{appliedMsg}</p>
            <Button variant="secondary" size="sm" onClick={() => setAppliedMsg(null)}>Apply again</Button>
          </div>
        ) : (
          <form onSubmit={handleApply} className="space-y-4">
            {applyError && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400 rounded-xl bg-red-50 dark:bg-red-950/30 px-3 py-2">
                {applyError}
              </p>
            )}
            <Input
              label="Loan amount ($)"
              type="number"
              value={applyForm.amount}
              onChange={(v) => setApplyForm((f) => ({ ...f, amount: v }))}
              placeholder={eligibility?.recommendedLimit ? `Up to ${eligibility.recommendedLimit}` : 'e.g. 1000'}
              required
            />
            {eligibility?.recommendedLimit != null && (
              <p className="text-xs text-surface-500">
                Recommended limit ${eligibility.recommendedLimit.toLocaleString()}
              </p>
            )}
            <div>
              <label className="block text-sm font-medium text-surface-500 mb-1.5">Term (months)</label>
              <select
                value={applyForm.termMonths}
                onChange={(e) => setApplyForm((f) => ({ ...f, termMonths: e.target.value }))}
                className="w-full rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="6">6 months</option>
                <option value="12">12 months</option>
                <option value="24">24 months</option>
                <option value="36">36 months</option>
              </select>
            </div>
            <p className="text-xs text-surface-500">
              If you&apos;re on ETH, we&apos;ll also put the loan on-chain when you submit.
            </p>
            <Button type="submit" fullWidth disabled={loading || eligibilityLoading || !eligibility}>
              {loading ? 'Submitting…' : 'Submit application'}
            </Button>
          </form>
        )}
      </Card>

      {loans.length > 0 && (
        <Card>
          <p className="text-sm font-medium text-surface-500 mb-4">Your applications</p>
          <ul className="space-y-3">
            {loans.map((loan) => (
              <li key={loan.id} className="rounded-lg border border-surface-100 dark:border-surface-800 p-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium text-surface-900 dark:text-surface-100">
                    ${loan.amount.toLocaleString()} · {loan.termMonths} mo
                  </span>
                  <span className="capitalize text-surface-500">{loan.status}</span>
                </div>
                {loan.createTxHash && (
                  <div className="mt-2 text-xs text-surface-500 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    <span>chain #{loan.onChainLoanId}</span>
                    <TxHash hash={loan.createTxHash} chainId={loan.chainId} />
                    {loan.statusTxHash && <TxHash hash={loan.statusTxHash} chainId={loan.chainId} />}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
