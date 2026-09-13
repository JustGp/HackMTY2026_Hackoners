import type { ComponentType } from 'react'
import {
  GraficaComparativa,
  HistorialChart,
  SimuladorInversion,
  TarjetaResumen,
} from '../A2UIComponents'
import type { A2UIAction, A2UIBlock } from './contract'

type BlockProps = {
  block: A2UIBlock
  onAction: (action: A2UIAction) => void
}

function TextBlock({ block }: BlockProps) {
  if (block.component !== 'text_block') return null
  return <p className="text-sm text-brand-gray">{block.props.text}</p>
}

function ClarifyChips({ block, onAction }: BlockProps) {
  if (block.component !== 'clarify_chips') return null
  return (
    <div className="flex flex-wrap gap-2">
      {block.props.chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => onAction({ block_id: block.block_id, action_id: chip.id })}
          className="rounded-full border border-brand-red/30 bg-white px-3 py-2 text-sm font-medium text-brand-red transition-colors hover:bg-brand-red hover:text-white"
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}

function SpendComparisonChart({ block, onAction }: BlockProps) {
  if (block.component !== 'spend_comparison_chart') return null
  const [first, second] = block.props.series
  return (
    <GraficaComparativa
      titulo={block.props.title}
      etiqueta_periodo_a={first?.label}
      valor_periodo_a={first?.value}
      etiqueta_periodo_b={second?.label ?? 'Periodo B'}
      valor_periodo_b={second?.value ?? 0}
      porcentaje_cambio={block.props.variationPct}
      onAction={(action, context) => onAction({ block_id: block.block_id, action_id: action, value: context })}
    />
  )
}

function HistoryChart({ block }: BlockProps) {
  if (block.component !== 'historial_chart') return null
  return <HistorialChart titulo={block.props.title} serie={block.props.serie} />
}

function SummaryCard({ block, onAction }: BlockProps) {
  if (block.component !== 'summary_card') return null
  return (
    <TarjetaResumen
      saldo_actual={block.props.balance}
      limite_mensual_tarjeta={block.props.monthlyLimit}
      gasto_mes_actual={block.props.monthlySpend}
      porcentaje_usado={block.props.usedPct}
      onAction={(action, context) => onAction({ block_id: block.block_id, action_id: action, value: context })}
    />
  )
}

function InvestmentSimulator({ block, onAction }: BlockProps) {
  if (block.component !== 'investment_simulator') return null
  const [safe, growth] = block.props.options
  return (
    <SimuladorInversion
      saldo_actual={block.props.balance}
      gasto_ultimo_mes={block.props.referenceSpend}
      monto_sugerido_inversion={block.props.suggestedAmount}
      sitio_recomendado_1={safe?.title}
      rendimiento_sitio_1={safe?.detail}
      ganancia_anual_sitio_1={safe?.estimatedAnnualGain}
      sitio_recomendado_2={growth?.title}
      rendimiento_sitio_2={growth?.detail}
      ganancia_anual_sitio_2={growth?.estimatedAnnualGain}
      onAction={(action, context) => onAction({ block_id: block.block_id, action_id: action, value: context })}
    />
  )
}

export const COMPONENT_REGISTRY: Record<A2UIBlock['component'], ComponentType<BlockProps>> = {
  text_block: TextBlock,
  clarify_chips: ClarifyChips,
  spend_comparison_chart: SpendComparisonChart,
  historial_chart: HistoryChart,
  summary_card: SummaryCard,
  investment_simulator: InvestmentSimulator,
}
