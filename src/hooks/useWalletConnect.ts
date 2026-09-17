import { useCallback, useEffect, useState } from 'react'
import { getAddress } from 'viem'
import { useAuth } from '../context/AuthContext'

export interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  isMetaMask?: boolean
  isPhantom?: boolean
  isCoinbaseWallet?: boolean
  isRabby?: boolean
  providers?: EthereumProvider[]
}

export interface SolanaProvider {
  connect: () => Promise<{ publicKey: { toBase58: () => string } }>
  isPhantom?: boolean
  request?: (opts: {
    method: string
    params?: { message: Uint8Array; display?: string }
  }) => Promise<{ signature: Uint8Array }>
  signMessage?: (message: Uint8Array, display?: 'utf8') => Promise<{ signature: Uint8Array }>
}

declare global {
  interface Window {
    ethereum?: EthereumProvider
    phantom?: { ethereum?: EthereumProvider; solana?: SolanaProvider }
    solana?: SolanaProvider
    coinbaseWalletExtension?: EthereumProvider
    rabby?: EthereumProvider
  }

  interface WindowEventMap {
    'eip6963:announceProvider': CustomEvent<{
      info: { uuid: string; name: string; icon: string; rdns: string }
      provider: EthereumProvider
    }>
  }
}

export type ConnectStage = 'idle' | 'opening' | 'signing' | 'verifying' | 'done'

export interface DetectedWallet {
  id: string
  name: string
  detail: string
  chain: 'evm' | 'solana'
  provider: EthereumProvider | SolanaProvider
}

export const CONNECT_STAGE_LABEL: Record<ConnectStage, string> = {
  idle: '',
  opening: 'Opening wallet…',
  signing: 'Waiting for signature…',
  verifying: 'Verifying…',
  done: 'Signed in',
}

function friendlyError(err: unknown, stage: ConnectStage): string {
  if (err instanceof Error) {
    const msg = err.message || ''
    if (msg.includes('User rejected') || msg.includes('rejected') || msg.includes('denied')) {
      return stage === 'opening' ? 'Connection cancelled.' : 'Signature cancelled.'
    }
    if (msg.includes('sign-in') || msg.includes('nonce') || msg.includes('Failed to get')) {
      return 'Could not start sign-in. Check your connection and try again.'
    }
    if (msg.includes('Wallet sign-in') || msg.includes('verify') || msg.includes('Invalid')) {
      return 'Could not verify signature. Try again.'
    }
    if (msg.includes('Too many')) return msg
    if (msg) return msg
  }
  if (stage === 'opening') return 'Could not open wallet. If you have multiple wallets, pick one from the list.'
  if (stage === 'signing') return 'Could not get signature.'
  if (stage === 'verifying') return 'Could not verify sign-in.'
  return 'Could not connect wallet.'
}

function collectInjectedEvmProviders(): EthereumProvider[] {
  const eth = window.ethereum
  if (!eth) return []
  if (Array.isArray(eth.providers) && eth.providers.length > 0) {
    return eth.providers
  }
  return [eth]
}

function classifyEip6963(rdns: string, name: string): { id: string; name: string } {
  const key = `${rdns} ${name}`.toLowerCase()
  if (key.includes('metamask')) return { id: 'metamask', name: 'MetaMask' }
  if (key.includes('rabby')) return { id: 'rabby', name: 'Rabby' }
  if (key.includes('coinbase')) return { id: 'coinbase', name: 'Coinbase Wallet' }
  if (key.includes('phantom')) return { id: 'phantom-evm', name: 'Phantom' }
  if (key.includes('rainbow')) return { id: 'rainbow', name: name || 'Rainbow' }
  if (key.includes('trust')) return { id: 'trust', name: name || 'Trust Wallet' }
  if (key.includes('okx')) return { id: 'okx', name: name || 'OKX Wallet' }
  if (key.includes('brave')) return { id: 'brave', name: name || 'Brave Wallet' }
  return { id: `evm:${rdns || name}`, name: name || 'Browser wallet' }
}

export function detectInstalledWallets(
  eip6963: Map<string, { name: string; provider: EthereumProvider }> = new Map()
): DetectedWallet[] {
  const wallets: DetectedWallet[] = []
  const seenProviders = new WeakSet<object>()
  const seenIds = new Set<string>()

  const push = (wallet: DetectedWallet) => {
    if (seenProviders.has(wallet.provider as object)) return
    if (seenIds.has(wallet.id)) {
      wallet = { ...wallet, id: `${wallet.id}:${wallets.length}` }
    }
    seenProviders.add(wallet.provider as object)
    seenIds.add(wallet.id)
    wallets.push(wallet)
  }

  // Prefer EIP-6963 announcements (correct provider when multiple extensions are installed)
  for (const [rdns, entry] of eip6963) {
    const meta = classifyEip6963(rdns, entry.name)
    push({
      id: meta.id,
      name: meta.name,
      detail: 'EVM · via EIP-6963',
      chain: 'evm',
      provider: entry.provider,
    })
  }

  const injected = collectInjectedEvmProviders()

  const rabby =
    window.rabby ??
    injected.find((p) => p.isRabby) ??
    null
  if (rabby) {
    push({
      id: 'rabby',
      name: 'Rabby',
      detail: 'EVM · supports hardware wallets',
      chain: 'evm',
      provider: rabby,
    })
  }

  const metamask = injected.find((p) => p.isMetaMask && !p.isPhantom && !p.isRabby) ?? null
  if (metamask) {
    push({
      id: 'metamask',
      name: 'MetaMask',
      detail: 'EVM · supports hardware wallets',
      chain: 'evm',
      provider: metamask,
    })
  }

  const phantomSolana = window.phantom?.solana ?? (window.solana?.isPhantom ? window.solana : undefined)
  if (phantomSolana) {
    push({
      id: 'phantom',
      name: 'Phantom',
      detail: 'Solana',
      chain: 'solana',
      provider: phantomSolana,
    })
  }

  const phantomEvm = window.phantom?.ethereum ?? injected.find((p) => p.isPhantom) ?? null
  if (phantomEvm) {
    push({
      id: 'phantom-evm',
      name: 'Phantom',
      detail: 'EVM',
      chain: 'evm',
      provider: phantomEvm,
    })
  }

  const coinbase =
    window.coinbaseWalletExtension ?? injected.find((p) => p.isCoinbaseWallet) ?? null
  if (coinbase) {
    push({
      id: 'coinbase',
      name: 'Coinbase Wallet',
      detail: 'EVM',
      chain: 'evm',
      provider: coinbase,
    })
  }

  for (const provider of injected) {
    push({
      id: `injected:${wallets.length}`,
      name: 'Browser wallet',
      detail: 'EVM · injected',
      chain: 'evm',
      provider,
    })
  }

  if (wallets.length === 0 && window.ethereum) {
    push({
      id: 'injected-evm',
      name: 'Browser wallet',
      detail: 'EVM',
      chain: 'evm',
      provider: window.ethereum,
    })
  }

  return wallets
}

export function useWalletConnect(onSuccess?: () => void) {
  const { loginWithWallet } = useAuth()
  const [error, setError] = useState('')
  const [stage, setStage] = useState<ConnectStage>('idle')
  const [wallets, setWallets] = useState<DetectedWallet[]>([])
  const [eip6963] = useState(() => new Map<string, { name: string; provider: EthereumProvider }>())

  const busy = stage !== 'idle' && stage !== 'done'

  const refresh = useCallback(() => {
    setWallets(detectInstalledWallets(eip6963))
  }, [eip6963])

  useEffect(() => {
    const onAnnounce = (event: WindowEventMap['eip6963:announceProvider']) => {
      const { info, provider } = event.detail
      eip6963.set(info.rdns || info.uuid, { name: info.name, provider })
      refresh()
    }

    window.addEventListener('eip6963:announceProvider', onAnnounce)
    window.dispatchEvent(new Event('eip6963:requestProvider'))

    refresh()
    const t1 = window.setTimeout(refresh, 100)
    const t2 = window.setTimeout(refresh, 500)
    const t3 = window.setTimeout(refresh, 1200)

    return () => {
      window.removeEventListener('eip6963:announceProvider', onAnnounce)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [eip6963, refresh])

  const connectEvmProvider = useCallback(
    async (wallet: DetectedWallet) => {
      setError('')
      let current: ConnectStage = 'opening'
      setStage('opening')
      try {
        const provider = wallet.provider as EthereumProvider
        // Always use the selected provider instance — never window.ethereum fallback
        const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[]
        const rawAddress = accounts?.[0]
        if (!rawAddress) {
          setError('No account selected in wallet.')
          setStage('idle')
          return
        }

        let address: string
        try {
          address = getAddress(rawAddress)
        } catch {
          address = rawAddress
        }

        current = 'signing'
        setStage('signing')

        const nonceRes = await fetch('/api/auth/nonce', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        })
        if (!nonceRes.ok) {
          const body = await nonceRes.json().catch(() => ({}))
          throw new Error((body as { error?: string }).error || 'Failed to get sign-in request')
        }
        const { message } = (await nonceRes.json()) as { message?: string }
        if (!message) throw new Error('Failed to get sign-in request')

        const signature = (await provider.request({
          method: 'personal_sign',
          params: [message, address],
        })) as string

        current = 'verifying'
        setStage('verifying')
        await loginWithWallet(address, message, signature)
        setStage('done')
        onSuccess?.()
      } catch (err) {
        setError(friendlyError(err, current))
        setStage('idle')
      }
    },
    [loginWithWallet, onSuccess]
  )

  const connectSolanaProvider = useCallback(
    async (wallet: DetectedWallet) => {
      setError('')
      let current: ConnectStage = 'opening'
      setStage('opening')
      try {
        const provider = wallet.provider as SolanaProvider
        const { publicKey } = await provider.connect()
        const address = publicKey.toBase58()

        current = 'signing'
        setStage('signing')

        const nonceRes = await fetch('/api/auth/nonce', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        })
        if (!nonceRes.ok) {
          const body = await nonceRes.json().catch(() => ({}))
          throw new Error((body as { error?: string }).error || 'Failed to get sign-in request')
        }
        const { message } = (await nonceRes.json()) as { message?: string }
        if (!message) throw new Error('Failed to get sign-in request')

        const msg = new TextEncoder().encode(message)
        const res = provider.request
          ? await provider.request({ method: 'signMessage', params: { message: msg, display: 'utf8' } })
          : await (provider.signMessage?.(msg, 'utf8') ?? Promise.reject(new Error('signMessage not supported')))
        const signatureB64 = btoa(String.fromCharCode(...res.signature))

        current = 'verifying'
        setStage('verifying')
        await loginWithWallet(address, message, signatureB64)
        setStage('done')
        onSuccess?.()
      } catch (err) {
        setError(friendlyError(err, current))
        setStage('idle')
      }
    },
    [loginWithWallet, onSuccess]
  )

  const connectWallet = useCallback(
    async (wallet: DetectedWallet) => {
      if (busy) return
      if (wallet.chain === 'evm') return connectEvmProvider(wallet)
      return connectSolanaProvider(wallet)
    },
    [busy, connectEvmProvider, connectSolanaProvider]
  )

  return {
    error,
    setError,
    stage,
    busy,
    connecting: busy,
    wallets,
    noWallet: wallets.length === 0,
    connectWallet,
  }
}
