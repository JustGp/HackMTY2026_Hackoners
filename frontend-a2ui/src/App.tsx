import { useState } from 'react'
import { dispatchA2UIAction, configureDispatcher } from './actionDispatcher'
import { initialMockEnvelope, fetchMockEnvelope } from './mockBackend'
import { sendToRealBackend, sendUserMessage } from './lib/realBackend'
import { A2UIRenderer } from './renderer'
import type { AccionUI, ComponentEnvelope } from './a2ui'

const useMock = import.meta.env.VITE_USE_MOCK === 'true'
const sendEnvelope = useMock ? fetchMockEnvelope : sendToRealBackend
const usuarioId = import.meta.env.VITE_USER_ID ?? 'demo-user'

configureDispatcher(sendEnvelope)

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', envelope: initialMockEnvelope },
  ])
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const appendEnvelope = (envelope: ComponentEnvelope) => {
    setMessages((current) => [...current, { role: 'assistant', envelope }])
  }

  const handleAction = async (accionUI: AccionUI) => {
    setStatus('loading')
    setErrorMessage(null)
    try {
      appendEnvelope(await dispatchA2UIAction(accionUI))
      setStatus('idle')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Error desconocido')
      setStatus('error')
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const texto = draft.trim()
    if (!texto || status === 'loading') return

    setDraft('')
    setMessages((current) => [...current, { role: 'user', text: texto }])
    setStatus('loading')
    setErrorMessage(null)

    try {
      const envelope = useMock
        ? await fetchMockEnvelope()
        : await sendUserMessage(texto, usuarioId)
      appendEnvelope(envelope)
      setStatus('idle')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Error desconocido')
      setStatus('error')
    }
  }

  return (
    <main className="min-h-screen bg-brand-gray-light p-6 text-brand-gray-dark">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-lg flex-col">
        <header className="mb-6 flex items-center gap-3">
          <img src="/banorte-logo.svg" alt="Banorte" className="h-9 w-auto" />
          <h1 className="text-2xl font-semibold text-brand-gray-dark">
            Tu asistente financiero
          </h1>
        </header>

        <section className="flex-1 space-y-4 rounded-xl border border-brand-gray-light bg-white p-4 shadow-sm">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={
                message.role === 'user'
                  ? 'ml-8 rounded-xl bg-brand-red p-3 text-sm text-white'
                  : 'mr-8'
              }
            >
              {message.role === 'user' ? (
                message.text
              ) : (
                <A2UIRenderer
                  envelope={message.envelope}
                  usuarioId={usuarioId}
                  onAction={handleAction}
                />
              )}
            </div>
          ))}
          {status === 'loading' && (
            <p className="mr-8 rounded-xl bg-brand-gray-light p-3 text-sm text-brand-gray">
              Pensando...
            </p>
          )}
          {status === 'error' && (
            <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errorMessage ?? 'No se pudo completar la solicitud. Inténtalo de nuevo.'}
            </p>
          )}
        </section>

        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Pregunta sobre tus gastos..."
            className="min-w-0 flex-1 rounded-lg border border-brand-gray-light bg-white px-3 py-2 text-sm outline-none focus:border-brand-red"
          />
          <button
            type="submit"
            disabled={!draft.trim() || status === 'loading'}
            className="rounded-lg bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-[#b51a21] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Enviar
          </button>
        </form>
      </div>
    </main>
  )
}

type ChatMessage =
  | { role: 'user'; text: string }
  | { role: 'assistant'; envelope: ComponentEnvelope }