import { useEffect, useState, useCallback } from 'react'
import { Card } from '../components/ui/Card'
import { api } from '../services/api'
import { DataState } from '../components/ui/DataState'

interface Transaction {
  id: string
  name?: string
  merchantName?: string
  amount: number
  date: string
  category?: string
  subcategory?: string
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [allCategories, setAllCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    api
      .get<string[]>('/transactions/categories')
      .then((list) => setAllCategories(list.filter(Boolean)))
      .catch(() => setAllCategories([]))
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (categories.length === 1) params.set('category', categories[0])
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    params.set('limit', '200')
    api
      .get<Transaction[]>(`/transactions?${params}`)
      .then((rows) => {
        if (categories.length > 1) {
          setTransactions(rows.filter((t) => t.category && categories.includes(t.category)))
        } else {
          setTransactions(rows)
        }
      })
      .catch((err) => {
        setTransactions([])
        setError(err instanceof Error ? err.message : "We couldn't load your transactions. Try again in a moment.")
      })
      .finally(() => setLoading(false))
  }, [categories, startDate, endDate])

  useEffect(() => {
    load()
  }, [load])

  const toggleCategory = (c: string) => {
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
  }

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const label = (t: Transaction) => t.merchantName || t.name || 'Other'

  return (
    <div className="space-y-6">
      <div>
        <p className="page-eyebrow">Activity</p>
        <h1 className="page-title mt-1">Transactions</h1>
      </div>

      <Card>
        <p className="text-sm font-medium text-surface-500 mb-3">Filters</p>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="block text-xs text-surface-500">Category</label>
              {categories.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCategories([])}
                  className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCategory(c)}
                    className="inline-flex items-center gap-1 rounded-full bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 text-xs font-semibold px-2.5 py-1 border border-primary-200/80 dark:border-primary-800"
                  >
                    {c}
                    <span aria-hidden="true" className="text-primary-500">
                      ×
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {allCategories.map((c) => {
                const active = categories.includes(c)
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCategory(c)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                      active
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white dark:bg-surface-900 text-surface-600 dark:text-surface-300 border-surface-200 dark:border-surface-600 hover:border-primary-400'
                    }`}
                  >
                    {c}
                  </button>
                )
              })}
              {allCategories.length === 0 && (
                <p className="text-xs text-surface-400">Categories appear after you link an account.</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-surface-500 mb-1">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-900 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="block text-xs text-surface-500 mb-1">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-900 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>
        </div>
      </Card>

      <DataState
        loading={loading}
        error={error}
        empty={!loading && !error && transactions.length === 0}
        emptyMessage="No transactions yet. Link an account to sync transactions."
      >
        <div className="space-y-2">
          {transactions.map((t) => (
            <Card key={t.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-surface-100 dark:bg-surface-700 flex items-center justify-center text-xs font-bold text-surface-500 shrink-0">
                  {(t.category || 'Tx').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-surface-900 dark:text-slate-50 truncate">{label(t)}</p>
                  <p className="text-sm text-surface-500 dark:text-slate-400">
                    {fmtDate(t.date)} {t.category && `• ${t.category}`}
                  </p>
                </div>
              </div>
              <p className={`font-semibold shrink-0 ${Number(t.amount) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {Number(t.amount) < 0 ? '-' : '+'}${Math.abs(Number(t.amount)).toFixed(2)}
              </p>
            </Card>
          ))}
        </div>
      </DataState>
    </div>
  )
}
