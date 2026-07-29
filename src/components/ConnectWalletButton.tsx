import { useEffect, useRef, useState } from 'react'
import { CONNECT_STAGE_LABEL, useWalletConnect, type DetectedWallet } from '../hooks/useWalletConnect'

function Spinner({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

function WalletGlyph({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3"
      />
    </svg>
  )
}

interface ConnectWalletButtonProps {
  onSuccess?: () => void
  className?: string
  variant?: 'panel' | 'nav'
}

const NAV_STAGE_LABEL: Record<string, string> = {
  opening: 'Opening…',
  signing: 'Sign…',
  verifying: 'Verifying…',
  done: 'Signed in',
}

function NavConnectWallet({ onSuccess, className = '' }: { onSuccess?: () => void; className?: string }) {
  const { error, setError, stage, busy, wallets, noWallet, connectWallet } = useWalletConnect(onSuccess)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const showPicker = !busy && wallets.length > 1
  const single = !busy && wallets.length === 1 ? wallets[0] : null
  const stageLabel = NAV_STAGE_LABEL[stage] || CONNECT_STAGE_LABEL[stage]

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  useEffect(() => {
    if (error) setOpen(true)
  }, [error])

  const handleConnect = (wallet: DetectedWallet) => {
    if (busy) return
    setError('')
    setOpen(false)
    connectWallet(wallet)
  }

  const onPrimary = () => {
    if (busy) return
    setError('')
    if (showPicker) {
      setOpen((value) => !value)
      return
    }
    if (single) {
      handleConnect(single)
      return
    }
    setOpen(true)
  }

  const label = busy ? stageLabel || 'Connecting…' : single ? `Connect ${single.name}` : 'Connect Wallet'
  const menuOpen = open && (showPicker || Boolean(error) || noWallet)

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={onPrimary}
        disabled={busy}
        aria-expanded={showPicker ? open : undefined}
        aria-haspopup={showPicker ? 'menu' : undefined}
        className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-3.5 py-2 text-sm font-semibold tracking-tight text-white transition-colors hover:bg-primary-700 disabled:opacity-70 dark:bg-primary-500 dark:hover:bg-primary-600"
      >
        {busy ? <Spinner className="h-4 w-4" /> : <WalletGlyph className="h-4 w-4" />}
        <span className="sm:hidden">{busy ? label : 'Connect'}</span>
        <span className="hidden max-w-[10rem] truncate sm:inline">{label}</span>
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-white/70 bg-white/95 p-3 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-surface-700 dark:bg-surface-900/95">
          {error && (
            <p role="alert" className="mb-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </p>
          )}
          {showPicker && (
            <ul className="space-y-1.5" role="menu">
              {wallets.map((wallet) => (
                <li key={`${wallet.id}-${wallet.chain}-${wallet.name}`}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleConnect(wallet)}
                    className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-primary-50 dark:hover:bg-primary-950/40"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-400">
                      <WalletGlyph className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-surface-900 dark:text-white">{wallet.name}</span>
                      <span className="block truncate text-xs text-surface-500">
                        {wallet.detail} · {wallet.chain === 'solana' ? 'Solana' : 'EVM'}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!busy && noWallet && !showPicker && (
            <p className="text-sm leading-relaxed text-surface-500">
              Install{' '}
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary-600 underline-offset-2 hover:underline dark:text-primary-400"
              >
                MetaMask
              </a>{' '}
              or another wallet, then refresh.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function PanelConnectWallet({ onSuccess, className = '' }: { onSuccess?: () => void; className?: string }) {
  const { error, setError, stage, busy, wallets, noWallet, connectWallet } = useWalletConnect(onSuccess)

  const handleConnect = (wallet: DetectedWallet) => {
    if (busy) return
    setError('')
    connectWallet(wallet)
  }

  const stageLabel = CONNECT_STAGE_LABEL[stage]
  const showPicker = !busy && wallets.length > 1
  const single = !busy && wallets.length === 1 ? wallets[0] : null

  return (
    <div className={`space-y-4 ${className}`}>
      {error && (
        <p role="alert" className="text-sm text-center text-red-600 dark:text-red-400 animate-scale-in rounded-xl bg-red-50 dark:bg-red-950/30 px-3 py-2 border border-red-100 dark:border-red-900/50">
          {error}
        </p>
      )}

      {busy ? (
        <button
          type="button"
          disabled
          className="group relative w-full overflow-hidden rounded-2xl bg-primary-600 text-white shadow-[0_12px_28px_-10px_rgba(0,112,199,0.65)] opacity-60 pointer-events-none"
        >
          <span className="relative flex items-center justify-center gap-2.5 py-4 px-5 text-base font-semibold tracking-tight">
            <Spinner />
            {stageLabel || 'Connecting…'}
          </span>
        </button>
      ) : showPicker ? (
        <div className="space-y-2">
          <p className="text-center text-sm text-surface-500 dark:text-surface-400">Choose a wallet</p>
          <ul className="space-y-2">
            {wallets.map((wallet) => (
              <li key={`${wallet.id}-${wallet.chain}-${wallet.name}`}>
                <button
                  type="button"
                  onClick={() => handleConnect(wallet)}
                  className="w-full flex items-center gap-3 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800/80 px-4 py-3.5 text-left hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-950/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400">
                    <WalletGlyph />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-surface-900 dark:text-white">{wallet.name}</span>
                    <span className="block text-xs text-surface-500 dark:text-surface-400 truncate">
                      {wallet.detail} · {wallet.chain === 'solana' ? 'Solana' : 'EVM'}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            if (single) handleConnect(single)
            else setError('Install MetaMask or another wallet, then refresh.')
          }}
          disabled={noWallet}
          className="group relative w-full overflow-hidden rounded-2xl bg-primary-600 text-white shadow-[0_12px_28px_-10px_rgba(0,112,199,0.65)] transition-all duration-200 hover:bg-primary-700 hover:shadow-[0_16px_32px_-10px_rgba(0,112,199,0.7)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:pointer-events-none disabled:hover:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 dark:bg-primary-500 dark:hover:bg-primary-600 dark:focus-visible:ring-offset-surface-800"
        >
          <span
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"
            aria-hidden="true"
          />
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/15 to-transparent opacity-80" aria-hidden="true" />
          <span className="relative flex items-center justify-center gap-2.5 py-4 px-5 text-base font-semibold tracking-tight">
            <WalletGlyph className="w-5 h-5 opacity-90" />
            {single ? `Connect ${single.name}` : 'Connect Wallet'}
          </span>
        </button>
      )}

      {busy && stageLabel && (
        <p className="text-center text-sm text-surface-500 dark:text-surface-400" aria-live="polite">
          {stage === 'opening' && 'Approve the connection in your wallet.'}
          {stage === 'signing' && 'Sign the message to prove it’s you.'}
          {stage === 'verifying' && 'Finishing sign-in…'}
        </p>
      )}

      {!busy && noWallet && (
        <p className="text-center text-sm text-surface-500 dark:text-surface-400 leading-relaxed">
          Install{' '}
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 dark:text-primary-400 font-medium underline-offset-2 hover:underline"
          >
            MetaMask
          </a>{' '}
          or another wallet, then refresh.
        </p>
      )}

      {!busy && !noWallet && !error && !showPicker && (
        <p className="text-center text-sm text-surface-500 dark:text-surface-400">
          Opens your browser wallet to approve a signature.
        </p>
      )}
    </div>
  )
}

export function ConnectWalletButton({ onSuccess, className = '', variant = 'panel' }: ConnectWalletButtonProps) {
  if (variant === 'nav') {
    return <NavConnectWallet onSuccess={onSuccess} className={className} />
  }
  return <PanelConnectWallet onSuccess={onSuccess} className={className} />
}
