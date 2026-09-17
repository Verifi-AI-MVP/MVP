import { useEffect, useState } from 'react'
import { Card, Metric, Title, Text, DonutChart, BarChart, Flex, ProgressBar } from '@tremor/react'
import { api } from '../services/api'

interface InsightCategory {
  category: string
  spent: number
  budget: number | null
  overBudget: boolean
  budgetName?: string
}

interface MonthlyTrend {
  month: string
  spent: number
  credits: number
}

interface InsightsData {
  month: number
  year: number
  totalSpent: number
  totalBudgeted: number
  byCategory: InsightCategory[]
  monthlyTrend?: MonthlyTrend[]
}

const valueFormatter = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`

export default function Insights() {
  const [insights, setInsights] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    api.get<InsightsData>('/insights/monthly')
      .then(setInsights)
      .catch((err) => {
        setInsights(null)
        setError(err instanceof Error ? err.message : "We couldn't load your insights. Try again in a moment.")
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
        <Text className="text-slate-500 dark:text-slate-400">Loading your insights…</Text>
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

  if (!insights) return null

  const monthName = new Date(insights.year, insights.month - 1).toLocaleString('default', { month: 'long' })
  const donutData = insights.byCategory
    .filter((c) => c.spent > 0)
    .map((c) => ({ name: c.category || 'Other', value: c.spent }))
  const trendData = insights.monthlyTrend ?? []

  return (
    <div className="space-y-8">
      <div>
        <p className="page-eyebrow">Credit</p>
        <h1 className="page-title mt-1">Insights</h1>
        <Text className="text-slate-500 dark:text-slate-400 mt-2">{monthName} {insights.year}</Text>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <Text className="text-slate-500 dark:text-slate-400">Total Spent</Text>
          <Metric className="text-surface-900 dark:text-slate-50">${insights.totalSpent.toFixed(2)}</Metric>
        </Card>
        <Card>
          <Text className="text-slate-500 dark:text-slate-400">Total Budgeted</Text>
          <Metric className="text-blue-600 dark:text-blue-400">${insights.totalBudgeted.toFixed(2)}</Metric>
          <Text className={`mt-2 text-sm ${insights.totalSpent > insights.totalBudgeted ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
            {insights.totalBudgeted > 0
              ? `${((insights.totalSpent / insights.totalBudgeted) * 100).toFixed(0)}% of budget used`
              : 'No budgets set'}
          </Text>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <Title className="mb-4">Spending trend</Title>
        {trendData.length > 0 ? (
          <BarChart
            data={trendData}
            index="month"
            categories={['spent', 'credits']}
            colors={['blue', 'emerald']}
            valueFormatter={valueFormatter}
            showLegend
            className="h-56"
          />
        ) : (
          <p className="text-slate-500 dark:text-slate-400 py-8 text-center">Connect an account and add transactions to see your trends here.</p>
        )}
      </Card>

      <Card>
        <Title className="mb-4">Spending by category</Title>
        {donutData.length > 0 ? (
          <DonutChart
            data={donutData}
            index="name"
            category="value"
            variant="donut"
            valueFormatter={valueFormatter}
            colors={['blue', 'cyan', 'indigo', 'violet', 'fuchsia', 'slate']}
            className="h-64"
          />
        ) : (
          <p className="text-slate-500 dark:text-slate-400 py-8 text-center">Connect an account to see your spending by category.</p>
        )}
      </Card>

      <Card className="lg:col-span-2">
        <Title className="mb-4">Category breakdown</Title>
        {insights.byCategory.length === 0 ? (
          <Text className="text-slate-500 dark:text-slate-400">Add some transactions to see your spending breakdown this month.</Text>
        ) : (
          <div className="space-y-4">
            {insights.byCategory.map((c) => (
              <div key={c.category} className="space-y-2">
                <Flex justifyContent="between">
                  <Text className="text-surface-800 dark:text-slate-200">{c.category}</Text>
                  <Text className={c.overBudget ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}>
                    ${c.spent.toFixed(2)}
                    {c.budget != null && ` / $${c.budget.toFixed(2)}`}
                  </Text>
                </Flex>
                <ProgressBar
                  value={c.budget ? Math.min(100, (c.spent / c.budget) * 100) : 50}
                  color={c.overBudget ? 'red' : 'blue'}
                  className="mt-1"
                />
              </div>
            ))}
          </div>
        )}
      </Card>
      </div>
    </div>
  )
}
