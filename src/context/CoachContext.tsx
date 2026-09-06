import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react'
import { api } from '../services/api'
import { useAuth } from './AuthContext'

export interface CoachMessage {
  role: 'user' | 'assistant'
  content: string
}

interface CoachContextType {
  messages: CoachMessage[]
  input: string
  setInput: (value: string) => void
  loading: boolean
  historyLoading: boolean
  send: () => Promise<void>
  clear: () => Promise<void>
  panelOpen: boolean
  openPanel: () => void
  closePanel: () => void
}

const CoachContext = createContext<CoachContextType | null>(null)

export function CoachProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<CoachMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)

  useEffect(() => {
    if (!user) {
      setMessages([])
      return
    }
    let cancelled = false
    setHistoryLoading(true)
    api
      .get<{ messages: CoachMessage[] }>('/coach/history')
      .then((res) => {
        if (!cancelled) {
          setMessages(
            (res.messages ?? [])
              .filter((m) => m.role === 'user' || m.role === 'assistant')
              .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
          )
        }
      })
      .catch(() => {
        if (!cancelled) setMessages([])
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const send = useCallback(async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: userMsg }])
    setLoading(true)
    try {
      const history = messages.map(({ role, content }) => ({ role, content }))
      const res = await api.post<{ message: string }>('/coach/chat', { message: userMsg, history })
      setMessages((m) => [...m, { role: 'assistant', content: res.message }])
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: err instanceof Error ? err.message : 'Something went wrong.' },
      ])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages])

  const clear = useCallback(async () => {
    try {
      await api.delete('/coach/history')
    } catch {
      // local clear still helpful
    }
    setMessages([])
    setInput('')
  }, [])

  return (
    <CoachContext.Provider
      value={{
        messages,
        input,
        setInput,
        loading,
        historyLoading,
        send,
        clear,
        panelOpen,
        openPanel: () => setPanelOpen(true),
        closePanel: () => setPanelOpen(false),
      }}
    >
      {children}
    </CoachContext.Provider>
  )
}

export function useCoach() {
  const ctx = useContext(CoachContext)
  if (!ctx) throw new Error('useCoach needs CoachProvider')
  return ctx
}
