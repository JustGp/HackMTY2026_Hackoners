import { useRef, useState } from 'react'
import { dispatchA2UIAction, configureDispatcher } from './actionDispatcher'
import { initialMockEnvelope, fetchMockEnvelope } from './mockBackend'
import { sendToRealBackend } from './lib/realBackend'
import { A2UIRenderer } from './renderer'
import type { AccionUI, ComponentEnvelope } from './a2ui'

const useMock = import.meta.env.VITE_USE_MOCK === 'true'
const sendEnvelope = useMock ? fetchMockEnvelope : sendToRealBackend
const usuarioId = import.meta.env.VITE_USER_ID ?? 'demo-user'

configureDispatcher(sendEnvelope)

export default function App() {
  const [envelope, setEnvelope] = useState<ComponentEnvelope>(initialMockEnvelope)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const lastAction = useRef<AccionUI | null>(null)

  const loadInitialEnvelope = () => {
    setStatus('loading')
    const request = lastAction.current
      ? dispatchA2UIAction(lastAction.current)
      : fetchMockEnvelope()

    request
      .then((next) => {
        setEnvelope(next)
        setStatus('idle')
      })
      .catch(() => setStatus('error'))
  }

  const handleAction = async (accionUI: AccionUI) => {
    lastAction.current = accionUI
    setStatus('loading')
    try {
      setEnvelope(await dispatchA2UIAction(accionUI))
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50 p-6 text-neutral-900">
      <div className="mx-auto w-full max-w-lg">
        <h1 className="mb-6 text-2xl font-semibold">Tu estado financiero</h1>
        {status === 'loading' && (
          <p className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-500">
            Cargando...
          </p>
        )}
        {status === 'error' && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>No se pudo completar la solicitud.</p>
            <button
              type="button"
              onClick={loadInitialEnvelope}
              className="mt-3 rounded-lg bg-red-600 px-3 py-2 font-medium text-white hover:bg-red-700"
            >
              Reintentar
            </button>
          </div>
        )}
        {status !== 'error' && (
          <A2UIRenderer
            envelope={envelope}
            usuarioId={usuarioId}
            onAction={handleAction}
          />
        )}
      </div>
    </main>
  )
}