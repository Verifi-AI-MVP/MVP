import { useEffect, useRef } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useCoach } from '../context/CoachContext'

export default function Chatbot() {
  const { messages, input, setInput, loading, send, clear } = useCoach()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-[calc(100dvh-13.5rem)] lg:h-[calc(100dvh-7.5rem)] min-h-[24rem]">
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <p className="page-eyebrow">Trust</p>
          <h1 className="page-title mt-1">Coach</h1>
        </div>
        {messages.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void clear()
            }}
          >
            Clear
          </Button>
        )}
      </div>

      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {messages.length === 0 && (
            <div className="text-center text-surface-500 dark:text-surface-400 py-8">
              <p className="font-medium mb-2">Ask me anything about your finances</p>
              <p className="text-sm">e.g. &quot;How can I save more?&quot; or &quot;Review my spending&quot;</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white rounded-br-md'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-surface-100 rounded-bl-md'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-surface-100 dark:bg-surface-800 rounded-2xl rounded-bl-md px-4 py-2.5">
                <p className="text-sm text-surface-500">Thinking…</p>
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
          className="flex gap-2 pt-3 border-t border-surface-100 dark:border-surface-800"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your financial coach…"
            className="flex-1 rounded-xl border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-900/80 px-4 py-3 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 caret-primary-500"
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !input.trim()}>
            Send
          </Button>
        </form>
      </Card>
    </div>
  )
}
