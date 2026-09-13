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
  TablaCategoriasProps,
  TarjetaResumenProps,
} from './a2ui'

type OnAction = (accion: string, contexto: Record<string, unknown>) => void

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
    <div className="rounded-xl border border-neutral-200 p-4 shadow-sm">
      <p className="text-sm text-neutral-500">Saldo actual</p>
      <p className="text-2xl font-semibold">${saldo_actual.toLocaleString()}</p>

      <div className="mt-3 h-2 w-full rounded-full bg-neutral-100">
        <div
          className="h-2 rounded-full bg-blue-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-neutral-500">
        {pct}% del límite usado (${gasto_mes_actual.toLocaleString()} de $
        {limite_mensual_tarjeta.toLocaleString()})
      </p>
      <button
        type="button"
        onClick={() => onAction?.('ver_detalles', { componente: 'tarjeta_resumen' })}
        className="mt-2 rounded-lg bg-neutral-100 px-3 py-2 text-sm font-medium hover:bg-neutral-200"
      >
        Ver desglose
      </button>
    </div>
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
}: GraficaComparativaProps & { onAction?: OnAction }) {
  const data = [
    { periodo: etiqueta_periodo_a ?? 'Periodo A', gasto: valor_periodo_a ?? 0 },
    { periodo: etiqueta_periodo_b ?? 'Periodo B', gasto: valor_periodo_b ?? 0 },
  ]

  return (
    <div className="rounded-xl border border-neutral-200 p-4 shadow-sm">
      <p className="mb-2 text-sm font-medium">{titulo ?? 'Comparativa de gastos'}</p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="periodo" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="gasto" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
      {porcentaje_cambio !== undefined && (
        <p className="text-center text-sm font-medium">
          Variación: {porcentaje_cambio}%
        </p>
      )}
    </div>
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
    <div className="rounded-xl border border-neutral-200 p-4 shadow-sm">
      <p className="mb-2 text-sm font-medium">Categorías — {mes}</p>
      <table className="w-full text-sm">
        <tbody>
          {categorias.map((cat) => (
            <tr
              key={cat.nombre}
              className="cursor-pointer border-t border-neutral-100 hover:bg-neutral-50"
              onClick={() =>
                onAction?.('ver_detalle_categoria', {
                  categoria: cat.nombre,
                  mes,
                })
              }
            >
              <td className="py-2">{cat.nombre}</td>
              <td className="py-2 text-right font-medium">
                ${cat.monto.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
