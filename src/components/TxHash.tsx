import { useState } from 'react'

function explorerUrl(hash: string, chainId?: number | null) {
  const h = hash.startsWith('0x') ? hash : hash
  if (chainId === 1) return `https://etherscan.io/tx/${h}`
  if (chainId === 11155111) return `https://sepolia.etherscan.io/tx/${h}`
  if (chainId === 5) return `https://goerli.etherscan.io/tx/${h}`
  // local / unknown — still link to etherscan mainnet search as best-effort, or just copy
  if (chainId === 31337 || chainId === 1337) return null
  return `https://etherscan.io/tx/${h}`
}

export function TxHash({
  hash,
  chainId,
  className = '',
}: {
  hash?: string | null
  chainId?: number | null
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  if (!hash) return <span className="text-surface-400">—</span>

  const short = `${hash.slice(0, 10)}…${hash.slice(-6)}`
  const href = explorerUrl(hash, chainId)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(hash)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-xs ${className}`}>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 dark:text-primary-400 hover:underline"
          title="Open in explorer"
        >
          {short}
        </a>
      ) : (
        <span className="text-surface-500" title={hash}>
          {short}
        </span>
      )}
      <button
        type="button"
        onClick={() => void copy()}
        className="rounded-md px-1.5 py-0.5 text-[10px] font-sans font-semibold text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 hover:text-surface-800 dark:hover:text-surface-200"
        aria-label="Copy hash"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </span>
  )
}
