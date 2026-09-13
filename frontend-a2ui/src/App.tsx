import { useEffect, useState } from 'react'
import { fetchMockEnvelope } from './mockBackend'
import { adaptLegacyEnvelope } from './a2ui/adaptLegacy'
import { Renderer } from './a2ui/Renderer'
import type { A2UIAction, A2UIMessage } from './a2ui/contract'
import { sendAppOpened, sendEvent, sendText } from './lib/realBackend'

const useMock = import.meta.env.VITE_USE_MOCK === 'true'

const homeMessage: A2UIMessage = {
  version: '1.0',
  conversation_turn_id: 'app_opened',
  intent: 'app_overview',
  message: 'Tu panorama financiero esta listo. Elige una accion para explorar tus datos.',
  blocks: [
    {
      block_id: 'home_spend',
      component: 'spend_comparison_chart',
      props: {
        title: 'Tus gastos recientes',
        series: [
          { label: 'Mes anterior', value: 0 },
          { label: 'Mes actual', value: 0 },
        ],
        variationPct: 0,
      },
    },
    {
      block_id: 'home_capabilities',
      component: 'clarify_chips',
      props: {
        chips: [
          { id: 'view_summary', label: 'Ver mi resumen' },
          { id: 'compare_months', label: 'Comparar meses' },
          { id: 'plan_investment', label: 'Planear una inversion' },
          { id: 'view_history', label: 'Ver historial de gastos' },
        ],
      },
    },
  ],
  suggested_next_actions: [],
}

export default function App({ usuarioId }: { usuarioId: string }) {
  const [feed, setFeed] = useState<A2UIMessage[]>([homeMessage])
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (useMock) return
    sendAppOpened(usuarioId)
      .then((message) => setFeed([message]))
      .catch(() => undefined)
  }, [])

  const run = async (request: () => Promise<A2UIMessage>) => {
    setStatus('loading')
    setErrorMessage(null)
    try {
      const nextMessage = await request()
      setFeed((current) => [...current, nextMessage])
      setStatus('idle')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Error desconocido')
      setStatus('error')
    }
  }

  const handleAction = (action: A2UIAction) => {
    void run(() =>
      useMock
        ? fetchMockEnvelope().then(adaptLegacyEnvelope)
        : sendEvent(action, usuarioId),
    )
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text || status === 'loading') return
    setDraft('')
    void run(() =>
      useMock
        ? fetchMockEnvelope().then(adaptLegacyEnvelope)
        : sendText(text, usuarioId),
    )
  }

  return (
    <main className="min-h-screen bg-brand-gray-light text-brand-gray-dark">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-5 sm:px-8">
        <header className="flex items-center justify-between border-b border-brand-gray-light pb-5">
          <div className="flex items-center gap-3">
            <img src="/banorte-logo.svg" alt="Banorte" className="h-9 w-auto" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-gray">Finanzas personales</p>
              <h1 className="text-xl font-semibold">Tu centro financiero</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-white px-3 py-1 text-xs font-medium text-brand-gray shadow-sm sm:inline-flex">Cuenta conectada</span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-brand-gray shadow-sm">{usuarioId}</span>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('usuario_id')
                window.location.reload()
              }}
              className="rounded-full bg-white px-3 py-1 text-xs font-medium text-brand-gray shadow-sm hover:text-brand-red"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        <section className="flex-1 py-7">
          <div className="mb-6 max-w-2xl">
            <p className="text-sm font-medium text-brand-red">Panel personalizado</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Decide que quieres revisar hoy.</h2>
          </div>
          <div className="space-y-6">
            {feed.map((message) => (
              <article key={message.conversation_turn_id} className="rounded-2xl border border-brand-gray-light bg-white p-5 shadow-sm sm:p-6">
                <Renderer message={message} onAction={handleAction} />
              </article>
            ))}
            {status === 'loading' && <div className="rounded-2xl border border-brand-gray-light bg-white p-5 text-sm text-brand-gray shadow-sm">Actualizando tu informacion...</div>}
            {status === 'error' && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage ?? 'No se pudo completar la solicitud.'}</div>}
          </div>
        </section>

        <form onSubmit={handleSubmit} className="sticky bottom-0 border-t border-brand-gray-light bg-brand-gray-light py-4">
          <div className="mx-auto flex max-w-2xl gap-2 rounded-xl border border-brand-gray-light bg-white p-2 shadow-sm">
            <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Tambien puedes pedir algo especifico" className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" />
            <button type="submit" disabled={!draft.trim() || status === 'loading'} className="rounded-lg bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-[#b51a21] disabled:cursor-not-allowed disabled:opacity-50">Consultar</button>
          </div>
        </form>
      </div>
    </main>
  )
}
