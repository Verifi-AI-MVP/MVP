import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

interface KycMe {
  status: string
  autoApprove: boolean
  submission: {
    id: string
    fullName: string
    dateOfBirth: string
    country: string
    documentType: string
    documentLast4: string | null
    status: string
    reviewNotes: string | null
    submittedAt: string
  } | null
}

const DOC_LABELS: Record<string, string> = {
  passport: 'Passport',
  drivers_license: "Driver's license",
  national_id: 'National ID',
}

export default function Verify() {
  const [data, setData] = useState<KycMe | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [form, setForm] = useState({
    fullName: '',
    dateOfBirth: '',
    country: 'United States',
    documentType: 'drivers_license',
    documentLast4: '',
  })

  const load = () => {
    setLoading(true)
    setError(null)
    api
      .get<KycMe>('/kyc/me')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load verification status'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await api.post<{ status: string; message: string }>('/kyc/submit', {
        fullName: form.fullName,
        dateOfBirth: form.dateOfBirth,
        country: form.country,
        documentType: form.documentType,
        documentLast4: form.documentLast4 || undefined,
      })
      setSuccess(res.message)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setSubmitting(false)
    }
  }

  const status = data?.status ?? 'unverified'
  const verified = status === 'verified'
  const pending = status === 'pending'
  const rejected = status === 'rejected'

  return (
    <div className="space-y-6 max-w-lg">
      <header className="space-y-1">
        <p className="page-eyebrow">Compliance</p>
        <h1 className="page-title mt-1">Identity verification</h1>
        <p className="page-lede">
          Verify once to unlock loan applications. We only store basic profile fields — not full document images.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-surface-500">Loading…</p>
      ) : (
        <>
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-surface-500">Status</p>
                <p className="mt-1 text-lg font-semibold text-surface-900 dark:text-white capitalize">{status}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  verified
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : pending
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                      : rejected
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                        : 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300'
                }`}
              >
                {verified ? 'Ready for loans' : pending ? 'Under review' : rejected ? 'Needs resubmit' : 'Not started'}
              </span>
            </div>
            {data?.autoApprove && !verified && (
              <p className="mt-3 text-xs text-surface-500">
                Demo mode auto-approves submissions so you can test the loan flow immediately.
              </p>
            )}
            {data?.submission?.reviewNotes && (
              <p className="mt-3 text-sm text-surface-600 dark:text-surface-300">{data.submission.reviewNotes}</p>
            )}
            {verified && (
              <Link to="/loans" className="inline-block mt-4 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">
                Continue to Loans →
              </Link>
            )}
          </Card>

          {!verified && (
            <Card>
              <p className="text-sm font-medium text-surface-500 mb-4">
                {rejected ? 'Resubmit verification' : 'Submit details'}
              </p>
              {error && (
                <p role="alert" className="mb-3 text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}
              {success && (
                <p className="mb-3 text-sm text-emerald-600 dark:text-emerald-400">{success}</p>
              )}
              <form onSubmit={(e) => void submit(e)} className="space-y-4">
                <Input
                  label="Full legal name"
                  value={form.fullName}
                  onChange={(v) => setForm((f) => ({ ...f, fullName: v }))}
                  placeholder="Jane Doe"
                  required
                />
                <Input
                  label="Date of birth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(v) => setForm((f) => ({ ...f, dateOfBirth: v }))}
                  required
                />
                <Input
                  label="Country"
                  value={form.country}
                  onChange={(v) => setForm((f) => ({ ...f, country: v }))}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1.5">
                    Document type
                  </label>
                  <select
                    value={form.documentType}
                    onChange={(e) => setForm((f) => ({ ...f, documentType: e.target.value }))}
                    className="w-full rounded-xl border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-4 py-3 text-sm"
                  >
                    {Object.entries(DOC_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Document last 4 (optional)"
                  value={form.documentLast4}
                  onChange={(v) => setForm((f) => ({ ...f, documentLast4: v.replace(/\D/g, '').slice(0, 4) }))}
                  placeholder="1234"
                />
                <Button type="submit" fullWidth disabled={submitting || pending}>
                  {submitting ? 'Submitting…' : pending ? 'Awaiting review…' : 'Submit for verification'}
                </Button>
              </form>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
