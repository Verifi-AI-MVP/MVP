import { useEffect, useState } from 'react'
import { Card } from '../components/ui/Card'
import { TxHash } from '../components/TxHash'
import { api } from '../services/api'

interface ChainData {
  mode: string
  enabled: boolean
  chainId: number
  loanContract: string | null
  attestationContract: string | null
  walletAddress: string | null
  onChainLoans: {
    id: string
    amount: number
    status: string
    chainId: number | null
    contractAddress: string | null
    onChainLoanId: string | null
    createTxHash: string | null
    statusTxHash: string | null
    appliedAt: string
  }[]
  trustAttestations: {
    id: string
    riskScore: number
    decision: string
    modelVersion: string
    chainId: number | null
    attestationContract: string | null
    attestationId: string | null
    attestationTxHash: string | null
    createdAt: string
  }[]
}

export default function Blockchain() {
  const [data, setData] = useState<ChainData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<ChainData>('/blockchain/me')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load this page"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-8">
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-surface-500">Loading…</span>
      </div>
    )
  }

  if (error || !data) {
    return <p className="text-red-600 dark:text-red-400 text-sm">{error ?? 'Nothing here'}</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="page-eyebrow">Trust</p>
        <h1 className="page-title mt-1">On-chain</h1>
        <p className="page-lede mt-2">
          Scores and loans tied to your wallet.
        </p>
      </div>

      <Card>
        <p className="text-sm font-medium text-surface-500 mb-3">Setup</p>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-surface-500">Mode</dt>
            <dd className="font-medium capitalize">{data.mode}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-surface-500">Chain</dt>
            <dd className="font-medium">{data.chainId}</dd>
          </div>
          <div>
            <dt className="text-surface-500 mb-0.5">Wallet</dt>
            <dd className="font-mono text-xs break-all">{data.walletAddress ?? '—'}</dd>
          </div>
        </dl>
        {data.mode === 'simulation' && (
          <p className="mt-3 text-xs text-surface-500 border border-surface-100 dark:border-surface-800 rounded-lg p-2">
            Sim mode — hashes are fake. Flip to live in .env if you have a local node running.
          </p>
        )}
      </Card>

      <Card>
        <p className="text-sm font-medium text-surface-500 mb-3">Scores</p>
        {data.trustAttestations.length === 0 ? (
          <p className="text-sm text-surface-500">None yet. Hit eligibility on the Loans page.</p>
        ) : (
          <ul className="space-y-3">
            {data.trustAttestations.map((a) => (
              <li key={a.id} className="border border-surface-100 dark:border-surface-800 rounded-lg p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{a.riskScore}</span>
                  <span className="capitalize text-surface-500">{a.decision}</span>
                </div>
                <p className="text-xs text-surface-500 mt-1">#{a.attestationId} · {a.modelVersion}</p>
                <div className="mt-1">
                  <TxHash hash={a.attestationTxHash} chainId={a.chainId ?? data.chainId} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <p className="text-sm font-medium text-surface-500 mb-3">Loans</p>
        {data.onChainLoans.length === 0 ? (
          <p className="text-sm text-surface-500">No chain loans yet. Apply with an ETH wallet.</p>
        ) : (
          <ul className="space-y-3">
            {data.onChainLoans.map((loan) => (
              <li key={loan.id} className="border border-surface-100 dark:border-surface-800 rounded-lg p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">${loan.amount.toLocaleString()}</span>
                  <span className="capitalize text-surface-500">{loan.status}</span>
                </div>
                <p className="text-xs text-surface-500 mt-1">#{loan.onChainLoanId}</p>
                <div className="mt-1 flex flex-col gap-1">
                  <TxHash hash={loan.createTxHash} chainId={loan.chainId ?? data.chainId} />
                  {loan.statusTxHash && (
                    <TxHash hash={loan.statusTxHash} chainId={loan.chainId ?? data.chainId} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
