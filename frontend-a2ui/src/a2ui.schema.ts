// schemas/a2ui.schema.ts
//
// A2UI contract — v0.5 — locked
// Source of truth for both the inbound component envelope and the
// outbound accion_ui event. TS types are inferred FROM these schemas,
// so there is exactly one place to update when the contract changes.
//
// Decision (Step 3): unknown/extra fields on any object are ignored.
// This is Zod's default "strip" behavior for z.object() — no extra
// config needed. If the backend adds a field we don't know about yet,
// parsing still succeeds and the extra field is silently dropped.

import { z } from "zod";

// ---------------------------------------------------------------------------
// Per-component prop schemas
// ---------------------------------------------------------------------------

export const TarjetaResumenSchema = z.object({
  saldo_actual: z.number(),
  limite_mensual_tarjeta: z.number(),
  gasto_mes_actual: z.number(),
  porcentaje_usado: z.number(),
});

export const GraficaComparativaSchema = z.object({
  titulo: z.string().optional(),
  etiqueta_periodo_a: z.string().optional(),
  valor_periodo_a: z.number().optional(),
  etiqueta_periodo_b: z.string().optional(),
  valor_periodo_b: z.number().optional(),
  porcentaje_cambio: z.number().optional(),
});

// Nuevo esquema para proyecciones de inversión
export const GraficaProyeccionSchema = z.object({
  titulo: z.string().optional(),
  descripcion: z.string().optional(),
  datos: z.array(z.object({
    mes: z.string(),
    capital: z.number(),
    rendimiento: z.number()
  })),
  ganancia_estimada: z.number().optional()
});

// Inferir el tipo
export type GraficaProyeccionProps = z.infer<typeof GraficaProyeccionSchema>;

export const TablaCategoriasSchema = z.object({
  mes: z.string(),
  categorias: z.array(
    z.object({
      nombre: z.string(),
      monto: z.number(),
    })
  ),
});

// ---------------------------------------------------------------------------
// Component envelope — discriminated union on "componente"
// ---------------------------------------------------------------------------
// z.discriminatedUnion lets Zod pick the right branch to validate against
// using "componente" as the discriminant, and lets TypeScript narrow
// `props` automatically once you check `envelope.componente` in code.

export const ComponentEnvelopeSchema = z.discriminatedUnion("componente", [
  z.object({
    texto_respuesta: z.string(),
    componente: z.literal("tarjeta_resumen"),
    props: TarjetaResumenSchema,
  }),
  z.object({
    texto_respuesta: z.string(),
    componente: z.literal("grafica_comparativa"),
    props: GraficaComparativaSchema,
  }),
  z.object({
    texto_respuesta: z.string(),
    componente: z.literal("tabla_categorias"),
    props: TablaCategoriasSchema,
  }),
]);

// ---------------------------------------------------------------------------
// Outbound event — accion_ui
// ---------------------------------------------------------------------------
// `contexto` stays a loose record for now: it's payload-specific per
// accion and there's no shared shape to enforce yet. Tighten this later
// per-accion if patterns emerge (e.g. a ver_detalle_categoria_contexto
// schema with { categoria, mes }).

export const AccionUISchema = z.object({
  tipo: z.literal("accion_ui"),
  accion: z.string(),
  usuario_id: z.string(),
  contexto: z.record(z.string(), z.unknown()),
});

// ---------------------------------------------------------------------------
// Inferred TypeScript types — one source of truth, no manual duplication
// ---------------------------------------------------------------------------

export type TarjetaResumenProps = z.infer<typeof TarjetaResumenSchema>;
export type GraficaComparativaProps = z.infer<typeof GraficaComparativaSchema>;
export type TablaCategoriasProps = z.infer<typeof TablaCategoriasSchema>;
export type ComponentEnvelope = z.infer<typeof ComponentEnvelopeSchema>;
export type AccionUI = z.infer<typeof AccionUISchema>;

// ---------------------------------------------------------------------------
// Small validation helper — use this everywhere instead of calling
// .parse() / .safeParse() directly, so error handling stays consistent.
// ---------------------------------------------------------------------------

export function parseComponentEnvelope(raw: unknown):
  | { success: true; data: ComponentEnvelope }
  | { success: false; error: z.ZodError } {
  const result = ComponentEnvelopeSchema.safeParse(raw);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error };
}