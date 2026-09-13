import { Component, type ComponentType, type ReactNode } from 'react'
import {
  GraficaComparativa,
  SimuladorInversion,
  TablaCategorias,
  TarjetaResumen,
} from './A2UIComponents'
import { parseComponentEnvelope } from './a2ui'
import type { AccionUI } from './a2ui'

type OnAction = (accion: string, contexto: Record<string, unknown>) => void

type ErrorBoundaryProps = {
  children: ReactNode
  fallback?: (error: Error) => ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
  error: Error | null
}

class A2UIRendererErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback?.(this.state.error ?? new Error('Unknown error')) ?? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          La respuesta del asistente no pudo renderizarse correctamente.
        </div>
      )
    }

    return this.props.children
  }
}

// Registry pattern: adding a v0.6 component later is a one-line addition
// here plus a new branch in the schema — nothing else in this file changes.
const COMPONENT_REGISTRY: Record<string, ComponentType<any>> = {
  tarjeta_resumen: TarjetaResumen,
  grafica_comparativa: GraficaComparativa,
  tabla_categorias: TablaCategorias,
  simulador_inversion: SimuladorInversion,
} as const

export function A2UIRenderer({
  envelope,
  usuarioId,
  onAction,
}: {
  envelope: unknown
  usuarioId: string
  onAction: (accionUI: AccionUI) => void
}) {
  return (
    <A2UIRendererErrorBoundary>
      <A2UIRendererInner envelope={envelope} usuarioId={usuarioId} onAction={onAction} />
    </A2UIRendererErrorBoundary>
  )
}

function A2UIRendererInner({
  envelope,
  usuarioId,
  onAction,
}: {
  envelope: unknown
  usuarioId: string
  onAction: (accionUI: AccionUI) => void
}) {
  const parsed = parseComponentEnvelope(envelope)

  if (!parsed.success) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        No se pudo interpretar la respuesta del servidor.
      </div>
    )
  }

  const { texto_respuesta, componente, props } = parsed.data
  const Component = COMPONENT_REGISTRY[componente]

  const handleAction: OnAction = (accion, contexto) => {
    onAction({ tipo: 'accion_ui', accion, usuario_id: usuarioId, contexto })
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-brand-gray">{texto_respuesta}</p>
      {componente !== 'ninguno' && Component && <Component {...props} onAction={handleAction} />}
    </div>
  )
}
