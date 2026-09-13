import type { ComponentType } from 'react'
import { GraficaComparativa, TablaCategorias, TarjetaResumen } from './A2UIComponents'
import { parseComponentEnvelope } from './a2ui'
import type { AccionUI } from './a2ui'

type OnAction = (accion: string, contexto: Record<string, unknown>) => void

// Registry pattern: adding a v0.6 component later is a one-line addition
// here plus a new branch in the schema — nothing else in this file changes.
const COMPONENT_REGISTRY: Record<string, ComponentType<any>> = {
  tarjeta_resumen: TarjetaResumen,
  grafica_comparativa: GraficaComparativa,
  tabla_categorias: TablaCategorias,
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
      <p className="text-sm text-neutral-700">{texto_respuesta}</p>
      <Component {...props} onAction={handleAction} />
    </div>
  )
}
