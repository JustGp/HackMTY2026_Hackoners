import { parseComponentEnvelope } from '../a2ui'
import type { A2UIMessage } from './contract'

let turnCounter = 0

const capabilityBlock = (turnId: string) => ({
  block_id: `${turnId}_capabilities`,
  component: 'clarify_chips' as const,
  props: {
    chips: [
      { id: 'view_summary', label: 'Ver mi resumen' },
      { id: 'compare_months', label: 'Comparar meses' },
      { id: 'plan_investment', label: 'Planear una inversion' },
      { id: 'view_history', label: 'Ver historial de gastos' },
    ],
  },
})

function isLegacyEnvelope(raw: unknown): raw is {
  texto_respuesta: string
  componente: string
  props: Record<string, unknown>
} {
  if (!raw || typeof raw !== 'object') return false
  const value = raw as Record<string, unknown>
  return (
    typeof value.texto_respuesta === 'string' &&
    typeof value.componente === 'string' &&
    !!value.props &&
    typeof value.props === 'object'
  )
}

export function adaptLegacyEnvelope(raw: unknown, message = ''): A2UIMessage {
  const parsed = parseComponentEnvelope(raw)
  const turnId = `turn_${++turnCounter}`

  if (!parsed.success) {
    if (isLegacyEnvelope(raw)) {
      return adaptKnownLegacyEnvelope(raw, turnId)
    }

    return {
      version: '1.0',
      conversation_turn_id: turnId,
      intent: 'unknown',
      message: message || 'No se pudo interpretar la respuesta del servidor.',
      blocks: [
        { block_id: `${turnId}_text`, component: 'text_block', props: { text: message || 'No se pudo interpretar la respuesta del servidor.' } },
        capabilityBlock(turnId),
      ],
      suggested_next_actions: [],
    }
  }

  const envelope = parsed.data
  if (envelope.componente === 'grafica_comparativa') {
    return {
      version: '1.0', conversation_turn_id: turnId, intent: 'compare_spend', message: envelope.texto_respuesta,
      blocks: [{
        block_id: `${turnId}_chart`, component: 'spend_comparison_chart', props: {
          title: envelope.props.titulo,
          series: [
            { label: envelope.props.etiqueta_periodo_a ?? 'Periodo A', value: envelope.props.valor_periodo_a ?? 0 },
            { label: envelope.props.etiqueta_periodo_b ?? 'Periodo B', value: envelope.props.valor_periodo_b ?? 0 },
          ],
          variationPct: envelope.props.porcentaje_cambio,
        },
      }, capabilityBlock(turnId)],
      suggested_next_actions: [],
    }
  }

  if (envelope.componente === 'tarjeta_resumen') {
    return {
      version: '1.0', conversation_turn_id: turnId, intent: 'view_summary', message: envelope.texto_respuesta,
      blocks: [{
        block_id: `${turnId}_summary`, component: 'summary_card', props: {
          balance: envelope.props.saldo_actual,
          monthlyLimit: envelope.props.limite_mensual_tarjeta,
          monthlySpend: envelope.props.gasto_mes_actual,
          usedPct: envelope.props.porcentaje_usado,
        },
      }],
      suggested_next_actions: [],
    }
  }

  if (envelope.componente === 'simulador_inversion') {
    return {
      version: '1.0', conversation_turn_id: turnId, intent: 'plan_investment', message: envelope.texto_respuesta,
      blocks: [{
        block_id: `${turnId}_investment`, component: 'investment_simulator', props: {
          balance: envelope.props.saldo_actual ?? 0,
          referenceSpend: envelope.props.gasto_ultimo_mes ?? 0,
          suggestedAmount: envelope.props.monto_sugerido_inversion ?? 0,
          options: [
            {
              id: 'safe',
              title: envelope.props.sitio_recomendado_1 ?? 'Alternativa de menor riesgo',
              detail: envelope.props.rendimiento_sitio_1 ?? 'Consulta la tasa vigente.',
              estimatedAnnualGain: envelope.props.ganancia_anual_sitio_1 ?? 0,
            },
            {
              id: 'growth',
              title: envelope.props.sitio_recomendado_2 ?? 'Alternativa de mayor rendimiento',
              detail: envelope.props.rendimiento_sitio_2 ?? 'Consulta las condiciones vigentes.',
              estimatedAnnualGain: envelope.props.ganancia_anual_sitio_2 ?? 0,
            },
          ],
        },
      }],
      suggested_next_actions: [],
    }
  }

  return {
    version: '1.0', conversation_turn_id: turnId, intent: 'text', message: envelope.texto_respuesta,
    blocks: [
      { block_id: `${turnId}_text`, component: 'text_block', props: { text: envelope.texto_respuesta } },
      capabilityBlock(turnId),
    ],
    suggested_next_actions: [],
  }
}

function adaptKnownLegacyEnvelope(
  envelope: { texto_respuesta: string; componente: string; props: Record<string, unknown> },
  turnId: string,
): A2UIMessage {
  const props = envelope.props
  const numberValue = (key: string) => {
    const value = props[key]
    return typeof value === 'number' && Number.isFinite(value) ? value : 0
  }
  const textValue = (key: string, fallback: string) =>
    typeof props[key] === 'string' ? props[key] as string : fallback

  if (envelope.componente === 'grafica_comparativa') {
    return {
      version: '1.0', conversation_turn_id: turnId, intent: 'compare_spend', message: envelope.texto_respuesta,
      blocks: [{
        block_id: `${turnId}_chart`, component: 'spend_comparison_chart', props: {
          title: textValue('titulo', 'Comparativa de gastos'),
          series: [
            { label: textValue('etiqueta_periodo_a', 'Periodo A'), value: numberValue('valor_periodo_a') },
            { label: textValue('etiqueta_periodo_b', 'Periodo B'), value: numberValue('valor_periodo_b') },
          ],
          variationPct: numberValue('porcentaje_cambio'),
        },
      }, capabilityBlock(turnId)],
      suggested_next_actions: [],
    }
  }

  if (envelope.componente === 'tarjeta_resumen') {
    return {
      version: '1.0', conversation_turn_id: turnId, intent: 'view_summary', message: envelope.texto_respuesta,
      blocks: [{
        block_id: `${turnId}_summary`, component: 'summary_card', props: {
          balance: numberValue('saldo_actual'),
          monthlyLimit: numberValue('limite_mensual_tarjeta'),
          monthlySpend: numberValue('gasto_mes_actual'),
          usedPct: numberValue('porcentaje_usado'),
        },
      }, capabilityBlock(turnId)],
      suggested_next_actions: [],
    }
  }

  if (envelope.componente === 'simulador_inversion') {
    return {
      version: '1.0', conversation_turn_id: turnId, intent: 'plan_investment', message: envelope.texto_respuesta,
      blocks: [{
        block_id: `${turnId}_investment`, component: 'investment_simulator', props: {
          balance: numberValue('saldo_actual'),
          referenceSpend: numberValue('gasto_ultimo_mes'),
          suggestedAmount: numberValue('monto_sugerido_inversion'),
          options: [
            { id: 'safe', title: textValue('sitio_recomendado_1', 'Alternativa de menor riesgo'), detail: textValue('rendimiento_sitio_1', 'Consulta la tasa vigente.'), estimatedAnnualGain: numberValue('ganancia_anual_sitio_1') },
            { id: 'growth', title: textValue('sitio_recomendado_2', 'Alternativa de mayor rendimiento'), detail: textValue('rendimiento_sitio_2', 'Consulta las condiciones vigentes.'), estimatedAnnualGain: numberValue('ganancia_anual_sitio_2') },
          ],
        },
      }, capabilityBlock(turnId)],
      suggested_next_actions: [],
    }
  }

  if (envelope.componente === 'historial_chart') {
    const rawSerie = Array.isArray(props.serie) ? props.serie : []
    return {
      version: '1.0', conversation_turn_id: turnId, intent: 'view_history', message: envelope.texto_respuesta,
      blocks: [{
        block_id: `${turnId}_history`, component: 'historial_chart', props: {
          title: textValue('titulo', 'Historial de gastos'),
          serie: rawSerie.map((item: unknown) => {
            const row = item as Record<string, unknown>
            return {
              mes: typeof row.mes === 'string' ? row.mes : 'Periodo',
              gasto: typeof row.gasto === 'number' && Number.isFinite(row.gasto) ? row.gasto : 0,
            }
          }),
        },
      }, capabilityBlock(turnId)],
      suggested_next_actions: [],
    }
  }

  return {
    version: '1.0', conversation_turn_id: turnId, intent: 'text', message: envelope.texto_respuesta,
    blocks: [
      { block_id: `${turnId}_text`, component: 'text_block', props: { text: envelope.texto_respuesta } },
      capabilityBlock(turnId),
    ],
    suggested_next_actions: [],
  }
}
