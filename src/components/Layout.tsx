import { useEffect, useState } from 'react'
import { Outlet, Link, useLocation, useNavigate, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCoach } from '../context/CoachContext'
import { ThemeToggle } from './ThemeToggle'
import { ChatPanel } from './ChatPanel'
import { Logo } from './Logo'

type NavItem = {
  to: string
  label: string
  end?: boolean
  icon: IconName
}

const moneyNav: NavItem[] = [
  { to: '/', label: 'Home', end: true, icon: 'home' },
  { to: '/transactions', label: 'Activity', icon: 'activity' },
  { to: '/budgets', label: 'Budgets', icon: 'budget' },
  { to: '/savings', label: 'Savings', icon: 'savings' },
  { to: '/accounts', label: 'Accounts', icon: 'bank' },
]

const creditNav: NavItem[] = [
  { to: '/loans', label: 'Loans', icon: 'loan' },
  { to: '/verify', label: 'Verify', icon: 'shield' },
  { to: '/insights', label: 'Insights', icon: 'chart' },
]

const trustNav: NavItem[] = [
  { to: '/chatbot', label: 'Coach', icon: 'spark' },
  { to: '/blockchain', label: 'Chain', icon: 'chain' },
]

const dockNav: NavItem[] = [
  moneyNav[0],
  moneyNav[1],
  moneyNav[2],
  creditNav[0],
]

type IconName = 'home' | 'activity' | 'budget' | 'savings' | 'bank' | 'loan' | 'shield' | 'chart' | 'spark' | 'chain'

function Icon({ name }: { name: IconName }) {
  const common = { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 1.75, className: 'w-[18px] h-[18px]', 'aria-hidden': true as const }
  switch (name) {
    case 'home':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1v-9.5Z" /></svg>
    case 'activity':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h10M4 17h7" /></svg>
    case 'budget':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14h16M8 15v-3m4 3V8m4 7v-5" /></svg>
    case 'savings':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3m6.4 1.6-2.1 2.1M21 12h-3M6.7 6.7 4.6 4.6M6 12H3m4.2 6.2c2.4 1.6 6.4 1.2 8.3-.7 1.9-1.9 2.3-5.9.7-8.3L12 13l-4.8-4.8Z" /></svg>
    case 'bank':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M5 10v8m5-8v8m4-8v8m5-8v8M3 18h18M12 3 3 8h18L12 3Z" /></svg>
    case 'loan':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16v10H4V8Zm3-3h10v3H7V5Zm2 8h2" /></svg>
    case 'shield':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3 5 6v6c0 4.2 2.9 7.2 7 9 4.1-1.8 7-4.8 7-9V6l-7-3Z" /></svg>
    case 'chart':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16M7 16V9m5 7V5m5 11v-4" /></svg>
    case 'spark':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5 13.6 8 18 9.5 13.6 11 12 15.5 10.4 11 6 9.5 10.4 8 12 3.5ZM18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14Z" /></svg>
    case 'chain':
      return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15 15 9M8 11l-1.5 1.5a3.5 3.5 0 1 0 5 5L13 16m3-3 1.5-1.5a3.5 3.5 0 1 0-5-5L11 8" /></svg>
  }
}

function shortWallet(address?: string | null) {
  if (!address) return null
  if (address.length < 12) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function SideLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold tracking-tight transition-colors ${
          isActive
            ? 'bg-primary-600 text-white shadow-[0_10px_20px_-14px_rgba(0,112,199,0.9)]'
            : 'text-surface-600 hover:bg-white/80 hover:text-surface-900 dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:text-white'
        }`
      }
    >
      <Icon name={item.icon} />
      {item.label}
    </NavLink>
  )
}

function NavGroup({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div className="space-y-1">
      <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-surface-400">{title}</p>
      {items.map((item) => (
        <SideLink key={item.to} item={item} />
      ))}
    </div>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const { panelOpen, openPanel, closePanel } = useCoach()
  const location = useLocation()
  const navigate = useNavigate()
  const [sheetOpen, setSheetOpen] = useState(false)
  const wallet = shortWallet(user?.walletAddress)
  const moreActive = [...moneyNav.slice(3), ...creditNav.slice(1), ...trustNav].some((item) => location.pathname === item.to)

  useEffect(() => {
    setSheetOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!sheetOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheetOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheetOpen])

  return (
    <div className="min-h-[100dvh] mesh-bg overflow-x-hidden lg:flex">
      <div className="pointer-events-none fixed inset-0 noise-overlay" aria-hidden="true" />
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-sky-200/25 blur-3xl dark:bg-sky-600/10 animate-ambient-drift" />
        <div className="absolute -right-28 bottom-0 h-80 w-80 rounded-full bg-primary-200/20 blur-3xl dark:bg-primary-600/10 animate-ambient-drift-alt" />
      </div>

      <aside className="relative hidden lg:flex w-[248px] shrink-0 flex-col sticky top-0 h-[100dvh] px-4 py-5 border-r border-white/60 dark:border-surface-800/80 bg-white/45 dark:bg-surface-950/40 backdrop-blur-xl">
        <Link to="/" className="px-2">
          <Logo />
        </Link>

        <nav className="mt-8 flex-1 space-y-6 overflow-y-auto" aria-label="Main">
          <NavGroup title="Money" items={moneyNav} />
          <NavGroup title="Credit" items={creditNav} />
          <NavGroup title="Trust" items={trustNav} />
        </nav>

        <div className="mt-4 space-y-2 border-t border-surface-200/80 dark:border-surface-800 pt-4">
          {user?.role === 'admin' && (
            <Link to="/admin" className="block rounded-xl px-3 py-2 text-sm font-semibold text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-950/40">
              Admin desk
            </Link>
          )}
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="min-w-0 truncate font-mono text-[11px] text-surface-500" title={user?.walletAddress ?? undefined}>
              {wallet ?? 'Signed in'}
            </span>
            <ThemeToggle />
          </div>
          <button
            type="button"
            onClick={() => logout().then(() => navigate('/login'))}
            className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-surface-600 hover:bg-white/80 hover:text-surface-900 dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:text-white"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 safe-area-pt safe-area-px lg:hidden">
          <div className="page-pad-x pt-3">
            <div className="flex items-center justify-between rounded-2xl border border-white/70 dark:border-surface-700/60 bg-white/80 dark:bg-surface-900/75 backdrop-blur-xl px-3 py-2 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.45)]">
              <Link to="/">
                <Logo size="sm" />
              </Link>
              <div className="flex items-center gap-1">
                <ThemeToggle />
                <button
                  type="button"
                  onClick={() => logout().then(() => navigate('/login'))}
                  className="rounded-lg px-2 py-1 text-sm font-semibold text-surface-600 dark:text-surface-300"
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="relative page-shell page-pad-x pt-5 sm:pt-7 pb-28 lg:pb-12 min-w-0">
          <Outlet />
        </main>
      </div>

      <nav
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 safe-area-pb safe-area-px"
        aria-label="Primary"
      >
        <div className="mx-3 mb-3 flex items-stretch justify-between rounded-2xl border border-white/70 dark:border-surface-700/80 bg-white/90 dark:bg-surface-900/90 backdrop-blur-xl px-1 py-1 shadow-[0_16px_40px_-18px_rgba(15,23,42,0.45)]">
          {dockNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold ${
                  isActive ? 'text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/50' : 'text-surface-500'
                }`
              }
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold ${
              sheetOpen || moreActive ? 'text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/50' : 'text-surface-500'
            }`}
            aria-expanded={sheetOpen}
          >
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
              <path strokeLinecap="round" d="M5 7h14M5 12h14M5 17h14" />
            </svg>
            More
          </button>
        </div>
      </nav>

      {sheetOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button type="button" className="absolute inset-0 bg-surface-950/40" aria-label="Close menu" onClick={() => setSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white dark:bg-surface-900 p-4 pb-8 safe-area-pb shadow-2xl animate-sheet-up">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-surface-200 dark:bg-surface-700" />
            <div className="grid grid-cols-2 gap-2">
              {[...moneyNav.slice(3), ...creditNav.slice(1), ...trustNav].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-sm font-semibold ${
                    location.pathname === item.to
                      ? 'border-primary-200 bg-primary-50 text-primary-800 dark:border-primary-800 dark:bg-primary-950/40 dark:text-primary-200'
                      : 'border-surface-200 dark:border-surface-700 text-surface-800 dark:text-surface-100'
                  }`}
                >
                  <Icon name={item.icon} />
                  {item.label}
                </Link>
              ))}
              {user?.role === 'admin' && (
                <Link to="/admin" className="flex items-center gap-2 rounded-2xl border border-surface-200 dark:border-surface-700 px-3 py-3 text-sm font-semibold">
                  Admin desk
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {panelOpen && <ChatPanel onClose={closePanel} />}

      {!panelOpen && location.pathname !== '/chatbot' && (
        <button
          type="button"
          onClick={openPanel}
          className="fixed z-30 w-12 h-12 rounded-2xl bg-primary-600 text-white shadow-[0_14px_32px_-10px_rgba(0,112,199,0.7)] flex items-center justify-center hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 right-4 sm:right-6 bottom-[5.75rem] lg:bottom-6"
          aria-label="Open coach"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 0 0-3.09 3.09Z" />
          </svg>
        </button>
      )}
    </div>
  )
}
