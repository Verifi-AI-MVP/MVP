type LogoProps = {
  wordmark?: string | null
  size?: 'sm' | 'md'
  className?: string
}

function Mark({ size }: { size: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-8 w-8 rounded-xl' : 'h-9 w-9 rounded-2xl'
  return (
    <span
      className={`flex shrink-0 items-center justify-center bg-gradient-to-br from-primary-400 to-primary-700 text-white shadow-[0_10px_20px_-10px_rgba(0,112,199,0.85)] ${box}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-[58%] w-[58%]" fill="none">
        <path
          d="M6.2 7.2 12 17.6 17.8 7.2"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16.15 4.15 16.7 5.55 18.1 6.1 16.7 6.65 16.15 8.05 15.6 6.65 14.2 6.1 15.6 5.55 16.15 4.15Z"
          fill="currentColor"
        />
      </svg>
    </span>
  )
}

export function Logo({ wordmark = 'VeriFi AI', size = 'md', className = '' }: LogoProps) {
  const text = size === 'sm' ? 'text-base' : 'text-lg'
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark size={size} />
      {wordmark ? (
        <span className={`font-display font-bold tracking-tight text-surface-900 dark:text-white ${text}`}>
          {wordmark}
        </span>
      ) : null}
    </span>
  )
}
