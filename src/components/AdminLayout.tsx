import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ThemeToggle } from './ThemeToggle'
import { Logo } from './Logo'

function shortWallet(address?: string | null) {
  if (!address) return null
  if (address.length < 12) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const wallet = shortWallet(user?.walletAddress)

  return (
    <div className="min-h-[100dvh] mesh-bg">
      <div className="pointer-events-none fixed inset-0 noise-overlay" aria-hidden="true" />
      <header className="sticky top-0 z-20 safe-area-pt safe-area-px">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-3">
          <div className="h-14 flex items-center justify-between gap-3 rounded-2xl border border-white/70 dark:border-surface-700/60 bg-white/75 dark:bg-surface-900/70 backdrop-blur-xl px-4 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_10px_28px_-20px_rgba(15,23,42,0.25)]">
            <div className="flex items-center gap-3 min-w-0">
              <Link to="/admin" className="shrink-0">
                <Logo wordmark="VeriFi Admin" size="sm" />
              </Link>
              <span className="hidden sm:inline text-[11px] font-semibold uppercase tracking-[0.12em] text-surface-400 border-l border-surface-200 dark:border-surface-700 pl-3">
                Compliance
              </span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <Link
                to="/"
                className="text-sm font-semibold text-primary-600 dark:text-primary-400 px-2 py-1 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/40"
              >
                Back to app
              </Link>
              <ThemeToggle />
              {wallet && (
                <span className="hidden md:inline text-[11px] text-surface-500 font-mono truncate max-w-[7.5rem] rounded-lg bg-surface-100/80 dark:bg-surface-800 px-2 py-1" title={user?.walletAddress ?? undefined}>
                  {wallet}
                </span>
              )}
              <button
                type="button"
                onClick={() => logout().then(() => navigate('/login'))}
                className="text-sm text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white px-2 py-1 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
