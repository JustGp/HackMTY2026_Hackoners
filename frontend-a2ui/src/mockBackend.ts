import type { AccionUI, ComponentEnvelope } from './a2ui'

const FIXTURES: Record<string, ComponentEnvelope> = {
  inicio: {
    texto_respuesta:
      'Bajaste tu gasto 16% comparado con diciembre, sobre todo en entretenimiento.',
    componente: 'grafica_comparativa',
    props: {
      titulo: 'Diciembre vs Enero',
      etiqueta_periodo_a: 'Diciembre',
      valor_periodo_a: 9800,
      etiqueta_periodo_b: 'Enero',
      valor_periodo_b: 8200,
      porcentaje_cambio: -16.33,
    },
  },
  resumen: {
    texto_respuesta: 'Así va tu tarjeta este mes.',
    componente: 'tarjeta_resumen',
    props: {
      saldo_actual: 4200,
      limite_mensual_tarjeta: 10000,
      gasto_mes_actual: 5800,
      porcentaje_usado: 58,
    },
  },
  detalle_categoria: {
    texto_respuesta: 'Aquí está el desglose de enero por categoría.',
    componente: 'tabla_categorias',
    props: {
      mes: '2026-01',
      categorias: [
        { nombre: 'comida', monto: 3100 },
        { nombre: 'transporte', monto: 1200 },
        { nombre: 'entretenimiento', monto: 1900 },
        { nombre: 'otros', monto: 2000 },
      ],
    },
  },
}

export const initialMockEnvelope = FIXTURES.inicio

// Mimics network latency and lets the same accion_ui pipeline used against
// the real backend run fully offline — this is what your demo falls back
// to if the real backend flakes.
export async function fetchMockEnvelope(accionUI?: AccionUI): Promise<ComponentEnvelope> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  if (accionUI?.accion === 'ver_detalle_categoria') {
    return FIXTURES.detalle_categoria
  }

  return FIXTURES.inicio
}
