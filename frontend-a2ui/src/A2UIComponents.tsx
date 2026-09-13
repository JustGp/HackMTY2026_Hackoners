import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type {
  GraficaComparativaProps,
  SimuladorInversionProps,
  TablaCategoriasProps,
  TarjetaResumenProps,
} from './a2ui'
import { Card } from './ui/primitives'

type OnAction = (accion: string, contexto: Record<string, unknown>) => void

export function SimuladorInversion({
  saldo_actual,
  gasto_ultimo_mes,
  monto_sugerido_inversion,
  sitio_recomendado_1,
  rendimiento_sitio_1,
  ganancia_anual_sitio_1,
  sitio_recomendado_2,
  rendimiento_sitio_2,
  ganancia_anual_sitio_2,
  onAction,
}: SimuladorInversionProps & { onAction?: OnAction }) {
  return (
    <Card>
      <p className="text-sm text-brand-gray">Plan de inversión sugerido</p>
      <p className="mt-1 text-2xl font-semibold text-brand-gray-dark">
        ${monto_sugerido_inversion.toLocaleString()}
      </p>
      <p className="mt-2 text-xs text-brand-gray">
        Saldo: ${saldo_actual.toLocaleString()} · Gasto mensual de referencia: $
        {gasto_ultimo_mes.toLocaleString()}
      </p>
      <div className="mt-4 grid gap-3">
        <div className="rounded-lg border border-brand-gray-light p-3">
          <p className="text-sm font-medium text-brand-gray-dark">
            {sitio_recomendado_1 ?? 'Alternativa de menor riesgo'}
          </p>
          <p className="mt-1 text-xs text-brand-gray">
            {rendimiento_sitio_1 ?? 'Consulta la tasa vigente antes de invertir.'}
          </p>
          <p className="mt-2 text-sm font-semibold text-brand-red">
            Ganancia anual estimada: ${
              (ganancia_anual_sitio_1 ?? 0).toLocaleString()
            }
          </p>
        </div>
        <div className="rounded-lg border border-brand-gray-light p-3">
          <p className="text-sm font-medium text-brand-gray-dark">
            {sitio_recomendado_2 ?? 'Alternativa de mayor rendimiento'}
          </p>
          <p className="mt-1 text-xs text-brand-gray">
            {rendimiento_sitio_2 ?? 'Consulta la tasa y protección vigente.'}
          </p>
          <p className="mt-2 text-sm font-semibold text-brand-red">
            Ganancia anual estimada: ${
              (ganancia_anual_sitio_2 ?? 0).toLocaleString()
            }
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() =>
          onAction?.('ver_detalles', {
            componente: 'simulador_inversion',
            monto_inversion: monto_sugerido_inversion,
          })
        }
        className="mt-4 rounded-lg bg-brand-red px-3 py-2 text-sm font-medium text-white hover:bg-[#b51a21]"
      >
        Actualizar simulación
      </button>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// tarjeta_resumen
// ---------------------------------------------------------------------------
export function TarjetaResumen({
  saldo_actual,
  limite_mensual_tarjeta,
  gasto_mes_actual,
  porcentaje_usado,
  onAction,
}: TarjetaResumenProps & { onAction?: OnAction }) {
  const pct = Math.min(100, Math.max(0, porcentaje_usado))

  return (
    <Card>
      <p className="text-sm text-brand-gray">Saldo actual</p>
      <p className="text-2xl font-semibold text-brand-gray-dark">
        ${saldo_actual.toLocaleString()}
      </p>

      <div className="mt-3 h-2 w-full rounded-full bg-brand-gray-light">
        <div
          className="h-2 rounded-full bg-brand-red"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-brand-gray">
        {pct}% del límite usado (${gasto_mes_actual.toLocaleString()} de $
        {limite_mensual_tarjeta.toLocaleString()})
      </p>
      <button
        type="button"
        onClick={() =>
          onAction?.('ver_detalles', {
            componente: 'tarjeta_resumen',
            mes: new Date().toISOString().slice(0, 7),
          })
        }
        className="mt-2 rounded-lg bg-brand-gray-light px-3 py-2 text-sm font-medium text-brand-gray hover:bg-[#e5e7eb]"
      >
        Ver desglose
      </button>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// grafica_comparativa
// ---------------------------------------------------------------------------
export function GraficaComparativa({
  titulo,
  etiqueta_periodo_a,
  valor_periodo_a,
  etiqueta_periodo_b,
  valor_periodo_b,
  porcentaje_cambio,
  onAction,
}: GraficaComparativaProps & { onAction?: OnAction }) {
  const data = [
    { periodo: etiqueta_periodo_a ?? 'Periodo A', gasto: valor_periodo_a ?? 0 },
    { periodo: etiqueta_periodo_b ?? 'Periodo B', gasto: valor_periodo_b ?? 0 },
  ]

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-brand-gray-light/50"
      onClick={() =>
        onAction?.('ver_detalles', {
          componente: 'grafica_comparativa',
          mes_inicio: etiqueta_periodo_a,
          mes_fin: etiqueta_periodo_b,
        })
      }
    >
      <p className="mb-2 text-sm font-medium text-brand-gray-dark">
        {titulo ?? 'Comparativa de gastos'}
      </p>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onAction?.('ver_detalles', {
            componente: 'grafica_comparativa',
            mes_inicio: etiqueta_periodo_a,
            mes_fin: etiqueta_periodo_b,
          })
        }}
        className="absolute right-4 top-4 text-xs text-brand-gray hover:text-brand-gray-dark"
      >
        Ver más
      </button>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="periodo" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="gasto" fill="#d61f26" />
        </BarChart>
      </ResponsiveContainer>
      {porcentaje_cambio !== undefined && (
        <p className="text-center text-sm font-medium text-brand-gray-dark">
          Variación: {porcentaje_cambio}%
        </p>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// tabla_categorias
// ---------------------------------------------------------------------------
export function TablaCategorias({
  mes,
  categorias,
  onAction,
}: TablaCategoriasProps & { onAction?: OnAction }) {
  return (
    <Card>
      <p className="mb-2 text-sm font-medium text-brand-gray-dark">
        Categorías — {mes}
      </p>
      <table className="w-full text-sm">
        <tbody>
          {categorias.map((cat) => (
            <tr
              key={cat.nombre}
              className="cursor-pointer border-t border-brand-gray-light hover:bg-brand-gray-light"
              onClick={() =>
                onAction?.('ver_detalle_categoria', {
                  categoria: cat.nombre,
                  mes,
                })
              }
            >
              <td className="py-2 text-brand-gray-dark">{cat.nombre}</td>
              <td className="py-2 text-right font-medium text-brand-gray-dark">
                ${cat.monto.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
