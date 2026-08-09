interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-surface-200/80 dark:border-surface-700/70 bg-white/90 dark:bg-surface-800/85 backdrop-blur-md p-5 shadow-[0_1px_0_rgb(255_255_255/0.7)_inset,0_14px_32px_-24px_rgb(15_23_42/0.2)] dark:shadow-[0_14px_32px_-22px_rgb(0_0_0/0.5)] ${className}`}
    >
      {children}
    </div>
  )
}
