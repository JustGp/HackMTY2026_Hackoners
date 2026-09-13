import { z } from 'zod'

const numberOrZero = z.preprocess(
  (value) => (value === null || value === undefined ? 0 : value),
  z.number(),
)

const optionalNumber = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.number().optional(),
)

// A2UI contract — v0.5 — locked
// Unknown/extra fields on any object are ignored: z.object() strips
// unrecognized keys by default, no extra config needed.

export const tarjetaResumenSchema = z.object({
  saldo_actual: numberOrZero,
  limite_mensual_tarjeta: numberOrZero,
  gasto_mes_actual: numberOrZero,
  porcentaje_usado: numberOrZero,
})

export const graficaComparativaSchema = z.object({
  titulo: z.string().optional(),
  etiqueta_periodo_a: z.string().optional(),
  valor_periodo_a: optionalNumber,
  etiqueta_periodo_b: z.string().optional(),
  valor_periodo_b: optionalNumber,
  porcentaje_cambio: optionalNumber,
})

export const tablaCategoriasSchema = z.object({
  mes: z.string(),
  categorias: z.array(
    z.object({
      nombre: z.string(),
      monto: z.number(),
    }),
  ),
})

export const simuladorInversionSchema = z.object({
  saldo_actual: numberOrZero,
  gasto_ultimo_mes: numberOrZero,
  monto_sugerido_inversion: numberOrZero,
})

// Discriminated union on "componente" — Zod validates against the right
// branch and TypeScript narrows `props` once you check `componente`.
export const componentEnvelopeSchema = z.discriminatedUnion('componente', [
  z.object({
    texto_respuesta: z.string(),
    componente: z.literal('tarjeta_resumen'),
    props: tarjetaResumenSchema,
  }),
  z.object({
    texto_respuesta: z.string(),
    componente: z.literal('grafica_comparativa'),
    props: graficaComparativaSchema,
  }),
  z.object({
    texto_respuesta: z.string(),
    componente: z.literal('tabla_categorias'),
    props: tablaCategoriasSchema,
  }),
  z.object({
    texto_respuesta: z.string(),
    componente: z.literal('simulador_inversion'),
    props: simuladorInversionSchema,
  }),
  z.object({
    texto_respuesta: z.string(),
    componente: z.literal('ninguno'),
    props: z.object({}).passthrough(),
  }),
])

// Outbound event — accion_ui.
// contexto stays a loose record until acciones_disponibles is locked
// per component (see Phase 1 follow-ups).
export const accionUISchema = z.object({
  tipo: z.literal('accion_ui'),
  accion: z.string().min(1),
  usuario_id: z.string().min(1),
  contexto: z.record(z.string(), z.unknown()),
})

export type TarjetaResumenProps = z.infer<typeof tarjetaResumenSchema>
export type GraficaComparativaProps = z.infer<typeof graficaComparativaSchema>
export type TablaCategoriasProps = z.infer<typeof tablaCategoriasSchema>
export type SimuladorInversionProps = z.infer<typeof simuladorInversionSchema>
export type ComponentEnvelope = z.infer<typeof componentEnvelopeSchema>
export type AccionUI = z.infer<typeof accionUISchema>

export function parseComponentEnvelope(raw: unknown) {
  return componentEnvelopeSchema.safeParse(raw)
}

export function parseAccionUI(raw: unknown) {
  return accionUISchema.safeParse(raw)
}
