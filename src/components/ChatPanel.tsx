import { useEffect, useId, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useCoach } from '../context/CoachContext'

export function ChatPanel({ onClose }: { onClose: () => void }) {
  const titleId = useId()
  const { messages, input, setInput, loading, send } = useCoach()
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 180)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-end sm:justify-end p-0 sm:p-5 md:p-6" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button
        type="button"
        className="absolute inset-0 bg-surface-900/40 dark:bg-black/55 backdrop-blur-[2px] animate-fade-in"
        aria-label="Close coach"
        onClick={onClose}
      />

      <div className="relative flex flex-col w-full h-[min(92dvh,640px)] sm:h-[min(78dvh,520px)] sm:w-[400px] rounded-t-3xl sm:rounded-3xl border border-white/70 dark:border-surface-700/80 bg-white/95 dark:bg-surface-800/95 backdrop-blur-xl shadow-[0_-12px_48px_-16px_rgba(15,23,42,0.4)] sm:shadow-[0_28px_64px_-24px_rgba(15,23,42,0.5)] overflow-hidden animate-sheet-up sm:animate-sheet-up-desktop safe-area-pb">
        <div className="relative overflow-hidden border-b border-surface-100/90 dark:border-surface-700/80">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-500/10 via-transparent to-sky-400/10" aria-hidden="true" />
          <div className="relative flex items-center justify-between px-4 py-3.5 gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-primary-600/80 dark:text-primary-400/90">Coach</p>
              <h2 id={titleId} className="font-display font-semibold text-surface-900 dark:text-white truncate">
                Ask anything money-related
              </h2>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Link
                to="/chatbot"
                onClick={onClose}
                className="text-xs font-medium text-primary-600 dark:text-primary-400 px-2 py-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/40"
              >
                Expand
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-surface-500 hover:text-surface-900 dark:text-surface-400 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(ellipse_at_top,rgba(12,142,233,0.04),transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(12,142,233,0.08),transparent_55%)]">
          {messages.length === 0 && (
            <div className="text-center py-8 px-2 animate-login-rise">
              <p className="text-sm text-surface-500 dark:text-surface-400 leading-relaxed">
                Try “How am I doing this month?” or “What should I cut first?”
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-login-rise`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white rounded-br-md'
                    : 'bg-white dark:bg-surface-700/90 text-surface-900 dark:text-surface-100 border border-surface-100 dark:border-surface-600/80 rounded-bl-md'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start animate-fade-in">
              <div className="rounded-2xl rounded-bl-md bg-white dark:bg-surface-700/90 border border-surface-100 dark:border-surface-600/80 px-3.5 py-2.5 text-sm text-surface-400">
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-surface-400 animate-pulse" />
                  <span className="h-1.5 w-1.5 rounded-full bg-surface-400 animate-pulse [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-surface-400 animate-pulse [animation-delay:240ms]" />
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
          className="p-3.5 sm:p-4 border-t border-surface-100 dark:border-surface-700/80 flex gap-2 bg-white/90 dark:bg-surface-800/90"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the coach…"
            className="flex-1 rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-50/80 dark:bg-surface-900/70 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-400 transition-shadow caret-primary-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-45 shadow-[0_8px_20px_-10px_rgba(0,112,199,0.55)] transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
