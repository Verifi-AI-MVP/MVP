import { ReactNode } from 'react'

interface DataStateProps {
  loading?: boolean
  error?: string | null
  empty?: boolean
  emptyMessage?: string
  emptyAction?: ReactNode
  children: ReactNode
}

export function DataState({
  loading,
  error,
  empty,
  emptyMessage = 'No data yet',
  emptyAction,
  children,
}: DataStateProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-surface-500 dark:text-surface-400">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6 text-center">
        <p className="font-medium text-red-700 dark:text-red-300">Something went wrong</p>
        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
        <p className="text-xs text-surface-500 dark:text-surface-400 mt-2">Try refreshing the page</p>
      </div>
    )
  }

  if (empty) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-surface-500 dark:text-surface-400 font-medium">{emptyMessage}</p>
        {emptyAction && <div className="mt-4">{emptyAction}</div>}
      </div>
    )
  }

  return <>{children}</>
}
