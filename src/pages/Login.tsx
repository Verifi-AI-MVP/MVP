import { useNavigate } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'
import { ConnectWalletButton } from '../components/ConnectWalletButton'
import { Logo } from '../components/Logo'

const points = [
  {
    kicker: 'Month',
    title: 'See it clearly',
    body: 'Balance, budgets, and spending on one home screen after a bank is linked.',
  },
  {
    kicker: 'Score',
    title: 'Know if it fits',
    body: 'A cash-flow score with the reasons written out before you apply.',
  },
  {
    kicker: 'Record',
    title: 'Keep it signed',
    body: 'An optional attestation tied to the wallet you used to sign in.',
  },
]

const steps = [
  {
    n: '01',
    title: 'Connect from the bar',
    body: 'The wallet button stays up top. One signature proves it is you. No gas, no password.',
  },
  {
    n: '02',
    title: 'Link a bank',
    body: 'Pick an institution and pull balances and activity. Sample data is enough to walk through.',
  },
  {
    n: '03',
    title: 'Read, then decide',
    body: 'Home shows the month. Verify when you want a loan, and apply only if the score is eligible.',
  },
]

const recordRows = [
  { label: 'Score', value: '42' },
  { label: 'Decision', value: 'Eligible' },
  { label: 'Wallet', value: '0x7099…79c8' },
  { label: 'Record', value: '0xsim…a1c4' },
]

function PreviewFrame() {
  return (
    <div className="glass-panel animate-login-rise-delayed rounded-[1.75rem] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-surface-400">Preview</p>
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
          Eligible
        </span>
      </div>
      <p className="mt-8 text-xs font-medium text-surface-500">Total balance</p>
      <p className="mt-1 font-display text-4xl font-bold tracking-[-0.04em] tabular-nums text-surface-900 dark:text-white sm:text-5xl">
        $12,480.20
      </p>
      <div className="mt-8">
        <div className="flex items-baseline justify-between gap-3 text-xs text-surface-500">
          <span>Spent this month</span>
          <span className="tabular-nums">$1,840 / $2,400</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-200/80 dark:bg-surface-700">
          <div className="h-full w-[76%] rounded-full bg-primary-600 dark:bg-primary-400" />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-surface-200/70 dark:bg-surface-700/80">
        <div className="bg-white/80 px-4 py-3 dark:bg-surface-900/70">
          <p className="text-[11px] text-surface-500">Loan score</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-surface-900 dark:text-white">42</p>
          <p className="text-[11px] text-surface-400">Lower is better</p>
        </div>
        <div className="bg-white/80 px-4 py-3 dark:bg-surface-900/70">
          <p className="text-[11px] text-surface-500">Wallet</p>
          <p className="mt-1 font-mono text-sm text-surface-900 dark:text-white">0x7099…79c8</p>
          <p className="text-[11px] text-surface-400">Signature only</p>
        </div>
      </div>
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-[300dvh] mesh-bg">
      <div className="pointer-events-none fixed inset-0 noise-overlay" aria-hidden="true" />
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-sky-300/25 blur-3xl dark:bg-sky-500/10 animate-ambient-drift" />
        <div className="absolute -right-16 top-[42%] h-96 w-96 rounded-full bg-primary-300/20 blur-3xl dark:bg-primary-600/10 animate-ambient-drift-alt" />
      </div>

      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/70 bg-white/75 backdrop-blur-2xl safe-area-pt dark:border-white/10 dark:bg-surface-900/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 sm:px-8">
          <Logo size="sm" />
          <nav className="hidden items-center gap-7 md:flex" aria-label="Page">
            {[
              ['#month', 'Overview'],
              ['#path', 'Steps'],
              ['#record', 'Record'],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="text-sm font-medium text-surface-500 transition-colors hover:text-surface-900 dark:text-surface-400 dark:hover:text-white"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <ConnectWalletButton variant="nav" onSuccess={() => navigate('/')} />
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section id="month" className="flex min-h-[100dvh] items-center px-5 pb-16 pt-24 sm:px-8">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="animate-login-rise lg:col-span-7">
              <p className="page-eyebrow">Wallet-native finance</p>
              <h1 className="mt-4 font-display text-5xl font-bold tracking-[-0.05em] leading-[0.92] text-surface-900 dark:text-white sm:text-6xl lg:text-7xl">
                Money, scored
                <br />
                and signed.
              </h1>
              <p className="mt-6 max-w-md text-base leading-relaxed text-surface-600 dark:text-surface-300 sm:text-lg">
                Link a bank, watch the month, and carry a loan decision you can explain. Sign in from the bar.
              </p>
              <ul className="mt-10 grid gap-6 border-t border-surface-200/80 pt-8 dark:border-white/10 sm:grid-cols-3">
                {points.map((point) => (
                  <li key={point.title}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-600 dark:text-primary-400">
                      {point.kicker}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-surface-900 dark:text-white">{point.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-surface-500">{point.body}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:col-span-5">
              <PreviewFrame />
            </div>
          </div>
        </section>

        <section id="path" className="flex min-h-[100dvh] scroll-mt-6 items-center px-5 py-20 sm:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="page-eyebrow">How it starts</p>
                <h2 className="mt-3 max-w-xl font-display text-4xl font-bold tracking-[-0.045em] text-surface-900 dark:text-white sm:text-5xl">
                  Three steps, then the month is on screen.
                </h2>
              </div>
              
            </div>
            <ol className="mt-14 border-t border-surface-200/80 dark:border-white/10">
              {steps.map((step) => (
                <li
                  key={step.n}
                  className="grid gap-3 border-b border-surface-200/80 py-8 dark:border-white/10 md:grid-cols-12 md:items-baseline md:gap-8"
                >
                  <p className="font-display text-3xl font-bold tracking-[-0.04em] text-primary-600 dark:text-primary-400 md:col-span-2">
                    {step.n}
                  </p>
                  <h3 className="font-display text-2xl font-bold tracking-tight text-surface-900 dark:text-white md:col-span-4">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-surface-500 md:col-span-6">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="record" className="flex min-h-[100dvh] scroll-mt-6 items-center px-5 py-20 sm:px-8">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-6">
              <p className="page-eyebrow">What you keep</p>
              <h2 className="mt-3 font-display text-4xl font-bold tracking-[-0.045em] text-surface-900 dark:text-white sm:text-5xl">
                The keys stay with you.
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-surface-600 dark:text-surface-300">
                VeriFi checks the signature. It does not hold the wallet. The score and the record show up after the month is visible.
              </p>
              <p className="mt-8 text-sm text-surface-500">
                Use Connect Wallet in the bar. One signature. No gas, no password.
              </p>
            </div>
            <div className="lg:col-span-6">
              <div className="overflow-hidden rounded-[1.75rem] bg-surface-900 text-white">
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">Sample record</p>
                  <p className="font-mono text-[11px] text-white/40">Not a live chain</p>
                </div>
                <dl className="divide-y divide-white/10">
                  {recordRows.map((row) => (
                    <div key={row.label} className="flex items-baseline justify-between gap-4 px-6 py-4">
                      <dt className="text-sm text-white/50">{row.label}</dt>
                      <dd className="font-mono text-sm text-white">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
