import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { DataState } from '../components/ui/DataState'
import { api } from '../services/api'

interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate?: string | null
}

export default function Savings() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', targetAmount: '', targetDate: '', currentAmount: '' })
  const [contributeId, setContributeId] = useState<string | null>(null)
  const [contributeAmount, setContributeAmount] = useState('')

  const load = () => {
    setLoading(true)
    setError(null)
    api
      .get<Goal[]>('/savings')
      .then(setGoals)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load goals'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const addGoal = async () => {
    if (!form.name || !form.targetAmount) return
    setSaving(true)
    try {
      const created = await api.post<Goal>('/savings', {
        name: form.name,
        targetAmount: parseFloat(form.targetAmount),
        currentAmount: form.currentAmount ? parseFloat(form.currentAmount) : 0,
        targetDate: form.targetDate || undefined,
      })
      setGoals((g) => [created, ...g])
      setForm({ name: '', targetAmount: '', targetDate: '', currentAmount: '' })
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create goal')
    } finally {
      setSaving(false)
    }
  }

  const addContribution = async (goal: Goal) => {
    const amount = parseFloat(contributeAmount)
    if (!amount || amount <= 0) return
    setSaving(true)
    try {
      const updated = await api.patch<Goal>(`/savings/${goal.id}`, {
        currentAmount: goal.currentAmount + amount,
      })
      setGoals((list) => list.map((g) => (g.id === updated.id ? updated : g)))
      setContributeId(null)
      setContributeAmount('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update goal')
    } finally {
      setSaving(false)
    }
  }

  const removeGoal = async (id: string) => {
    setSaving(true)
    try {
      await api.delete(`/savings/${id}`)
      setGoals((list) => list.filter((g) => g.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete goal')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="page-eyebrow">Money</p>
          <h1 className="page-title mt-1">Savings goals</h1>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} disabled={saving}>
          {showForm ? 'Cancel' : '+ Add goal'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void addGoal()
            }}
            className="space-y-4"
          >
            <Input
              label="Goal name"
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="e.g. Emergency fund"
              required
            />
            <Input
              label="Target amount ($)"
              type="number"
              value={form.targetAmount}
              onChange={(v) => setForm((f) => ({ ...f, targetAmount: v }))}
              placeholder="5000"
              required
            />
            <Input
              label="Starting amount ($)"
              type="number"
              value={form.currentAmount}
              onChange={(v) => setForm((f) => ({ ...f, currentAmount: v }))}
              placeholder="0"
            />
            <Input
              label="Target date"
              type="date"
              value={form.targetDate}
              onChange={(v) => setForm((f) => ({ ...f, targetDate: v }))}
              placeholder="Optional"
            />
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Add goal'}
            </Button>
          </form>
        </Card>
      )}

      <DataState
        loading={loading}
        error={error}
        empty={!loading && !error && goals.length === 0}
        emptyMessage="No savings goals yet"
        emptyAction={
          <Button size="sm" onClick={() => setShowForm(true)}>
            Create your first goal
          </Button>
        }
      >
        <div className="space-y-4">
          {goals.map((g) => {
            const pct = g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0
            return (
              <Card key={g.id}>
                <div className="flex justify-between items-start gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="font-medium text-surface-900 dark:text-white">{g.name}</p>
                    {g.targetDate && (
                      <p className="text-xs text-surface-500 mt-0.5">
                        Target {new Date(g.targetDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-surface-500 shrink-0">
                    ${g.currentAmount.toLocaleString()} / ${g.targetAmount.toLocaleString()}
                  </p>
                </div>
                <div className="h-2 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary-600 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 justify-between">
                  <p className="text-xs text-surface-500">{pct.toFixed(0)}% complete</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setContributeId(contributeId === g.id ? null : g.id)
                        setContributeAmount('')
                      }}
                    >
                      Contribute
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => void removeGoal(g.id)} disabled={saving}>
                      Delete
                    </Button>
                  </div>
                </div>
                {contributeId === g.id && (
                  <form
                    className="mt-3 flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      void addContribution(g)
                    }}
                  >
                    <Input
                      type="number"
                      value={contributeAmount}
                      onChange={setContributeAmount}
                      placeholder="Amount ($)"
                      required
                      className="flex-1"
                    />
                    <Button type="submit" size="sm" disabled={saving} className="self-end">
                      Add
                    </Button>
                  </form>
                )}
              </Card>
            )
          })}
        </div>
      </DataState>

      <p className="text-sm text-surface-500 text-center">
        Goals sync to your account.{' '}
        <Link to="/accounts" className="text-primary-600 dark:text-primary-400 hover:underline">
          Link a bank
        </Link>{' '}
        to keep balances in context.
      </p>
    </div>
  )
}
