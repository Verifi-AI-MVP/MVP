const DONUT_COLORS = ['#0c8ee9', '#36aaf8', '#005aa1', '#7cc8fc', '#64748b', '#0a406e']

function money(v: number) {
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function shortMoney(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
  return `$${Math.round(v)}`
}

interface DonutSlice {
  name: string
  value: number
}

export function SpendingDonut({ data, total }: { data: DonutSlice[]; total: number }) {
  const size = 168
  const stroke = 26
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  const slices = data.map((d, i) => {
    const pct = total > 0 ? d.value / total : 0
    const length = pct * circumference
    const slice = {
      ...d,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
      dash: `${length} ${circumference - length}`,
      offset,
      pct,
    }
    offset -= length
    return slice
  })

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-8 min-w-0">
      <div className="relative mx-auto md:mx-0 shrink-0 w-[148px] h-[148px] sm:w-[168px] sm:h-[168px]">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90" aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-surface-100 dark:text-surface-700"
          />
          {slices.map((s) => (
            <circle
              key={s.name}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={s.dash}
              strokeDashoffset={s.offset}
              strokeLinecap="butt"
              className="transition-all duration-700"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
          <p className="text-xs text-surface-400">Total</p>
          <p className="text-lg sm:text-xl font-semibold tabular-nums text-surface-900 dark:text-white leading-tight">
            {money(total)}
          </p>
        </div>
      </div>

      <ul className="w-full space-y-2 sm:space-y-2.5 min-w-0">
        {slices.slice(0, 5).map((s) => (
          <li key={s.name} className="flex items-center gap-2 sm:gap-2.5 text-sm min-w-0">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="flex-1 truncate text-surface-600 dark:text-surface-300 min-w-0">{s.name}</span>
            <span className="tabular-nums font-medium text-surface-900 dark:text-white shrink-0 text-xs sm:text-sm">
              {money(s.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface TrendPoint {
  month: string
  spent: number
  credits: number
}

export function TrendBars({ data }: { data: TrendPoint[] }) {
  const max = Math.max(...data.flatMap((d) => [d.spent, d.credits]), 1)

  return (
    <div className="space-y-3 sm:space-y-4 min-w-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-surface-500 dark:text-surface-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-primary-500" />
          Spent
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-emerald-500" />
          Credits
        </span>
      </div>

      <div className="flex items-end justify-between gap-2 sm:gap-4 h-36 sm:h-40 min-w-0">
        {data.map((d) => {
          const spentH = Math.max(6, (d.spent / max) * 100)
          const creditH = Math.max(6, (d.credits / max) * 100)
          return (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-1.5 sm:gap-2 min-w-0 h-full justify-end">
              <div className="flex items-end justify-center gap-1 sm:gap-1.5 w-full h-[100px] sm:h-[120px]">
                <div
                  className="w-[42%] max-w-[36px] rounded-t-md bg-primary-500/90 transition-colors"
                  style={{ height: `${spentH}%` }}
                  title={`Spent ${money(d.spent)}`}
                />
                <div
                  className="w-[42%] max-w-[36px] rounded-t-md bg-emerald-500/90 transition-colors"
                  style={{ height: `${creditH}%` }}
                  title={`Credits ${money(d.credits)}`}
                />
              </div>
              <div className="text-center min-w-0 w-full px-0.5">
                <p className="text-[11px] sm:text-xs font-medium text-surface-700 dark:text-surface-300 truncate">
                  {d.month}
                </p>
                <p className="text-[10px] tabular-nums text-surface-400 truncate">{shortMoney(d.spent)}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
