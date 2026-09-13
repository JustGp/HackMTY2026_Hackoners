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
    <main className="min-h-screen bg-neutral-50 p-6 text-neutral-900">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-lg flex-col">
        <h1 className="mb-6 text-2xl font-semibold">Tu asistente financiero</h1>
        <section className="flex-1 space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={message.role === 'user' ? 'ml-8 rounded-xl bg-blue-600 p-3 text-sm text-white' : 'mr-8'}
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
            <p className="mr-8 rounded-xl bg-neutral-100 p-3 text-sm text-neutral-500">
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
            className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!draft.trim() || status === 'loading'}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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