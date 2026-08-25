import { useEffect, useState } from 'react'
import { Card, Title, Text, DonutChart, Flex } from '@tremor/react'
import { Card as UICard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { api } from '../services/api'
import { DataState } from '../components/ui/DataState'

interface Budget {
  id: string
  name: string
  category: string
  amount: number
}

interface InsightCategory {
  category: string
  spent: number
  budget: number | null
}

const valueFormatter = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`

export default function Budgets() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [insights, setInsights] = useState<{ byCategory: InsightCategory[]; totalSpent: number; totalBudgeted: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', category: '', amount: '' })
  const [showForm, setShowForm] = useState(false)

  const load = () => {
    setLoading(true)
    setError(null)
    Promise.all([
      api.get<Budget[]>('/budgets').then(setBudgets).catch(() => {
        setBudgets([])
        setError('Failed to load budgets')
      }),
      api.get<{ byCategory: InsightCategory[]; totalSpent: number; totalBudgeted: number }>('/insights/monthly').then(setInsights).catch(() => setInsights(null)),
    ]).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/budgets', {
        ...form,
        amount: parseFloat(form.amount),
        startDate: new Date().toISOString().split('T')[0],
        period: 'monthly',
      })
      setForm({ name: '', category: '', amount: '' })
      setShowForm(false)
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    }
  }

  const donutData = insights?.byCategory?.filter((c) => c.spent > 0).map((c) => ({
    name: c.category || 'Other',
    value: c.spent,
  })) ?? []

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-surface-500 dark:text-surface-400">Loading your budgets…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6">
        <p className="font-medium text-red-700 dark:text-red-300">Oops, something went wrong</p>
        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="page-eyebrow">Money</p>
          <h1 className="page-title mt-1">Budgets</h1>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add'}
        </Button>
      </div>

      {showForm && (
        <UICard>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. Food budget" required />
            <Input label="Category" value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))} placeholder="Food and Drink" required />
            <Input label="Amount ($)" type="number" value={form.amount} onChange={(v) => setForm((f) => ({ ...f, amount: v }))} placeholder="500" required />
            <Button type="submit">Create budget</Button>
          </form>
        </UICard>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <Title className="mb-4">Spending overview</Title>
        {donutData.length > 0 ? (
          <>
            <DonutChart
              data={donutData}
              index="name"
              category="value"
              variant="donut"
              valueFormatter={valueFormatter}
              colors={['blue', 'cyan', 'indigo', 'violet', 'fuchsia', 'slate']}
              className="h-64"
            />
            <Flex justifyContent="between" className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <Text className="text-slate-500">Spent</Text>
              <Text className="font-semibold">${insights?.totalSpent?.toFixed(2) ?? '0.00'}</Text>
            </Flex>
            <Flex justifyContent="between" className="mt-1">
              <Text className="text-slate-500">Budgeted</Text>
              <Text className="font-semibold">${insights?.totalBudgeted?.toFixed(2) ?? '0.00'}</Text>
            </Flex>
          </>
        ) : (
          <DataState
            empty
            emptyMessage="No spending data yet. Link an account and add a budget to get started."
          >
            {null}
          </DataState>
        )}
      </Card>

      <div className="lg:col-span-2">
        <p className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-3">Budgets you've set</p>
        <div className="space-y-2">
          {budgets.length === 0 ? (
            <DataState empty emptyMessage="No budgets yet. Create one above to track spending.">
              {null}
            </DataState>
          ) : (
            budgets.map((b) => (
              <UICard key={b.id} className="flex items-center justify-between">
                <div>
                <p className="font-medium text-surface-900 dark:text-surface-50">{b.name}</p>
                <p className="text-sm text-surface-500 dark:text-surface-400">{b.category}</p>
                </div>
                <p className="font-semibold text-primary-600 dark:text-primary-400">${Number(b.amount).toFixed(2)}</p>
              </UICard>
            ))
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
