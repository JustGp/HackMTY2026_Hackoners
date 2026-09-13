import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { TarjetaResumenProps, GraficaComparativaProps, AccionUI } from './a2ui.schema';

export function TarjetaResumen({ props, onAction }: { props: TarjetaResumenProps; onAction: (a: AccionUI) => void }) {
  return (
    <div className="w-full bg-white p-6 rounded-3xl border border-gray-100 shadow-md flex flex-col gap-4">
      <h3 className="text-xl font-bold text-gray-800 text-center">Resumen del Mes</h3>
      <div className="text-center">
        <span className="text-3xl font-black text-gray-900">${props.gasto_mes_actual}</span>
        <span className="text-lg text-gray-400 font-medium"> / ${props.limite_mensual_tarjeta}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
        <div 
          className="bg-blue-600 h-4 rounded-full transition-all duration-1000 ease-out" 
          style={{ width: `${props.porcentaje_usado}%` }}
        ></div>
      </div>
      <button 
        onClick={() => onAction({ accion: 'ver_detalles', contexto: { componente: 'tarjeta_resumen' } })}
        className="mt-2 w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-xl transition-colors"
      >
        Ver desglose detallado
      </button>
    </div>
  );
}

export function GraficaComparativa({ props, onAction }: { props: GraficaComparativaProps; onAction: (a: AccionUI) => void }) {
  const datosGrafica = [
    { periodo: props.etiqueta_periodo_a || 'Mes 1', Gasto: props.valor_periodo_a || 0 },
    { periodo: props.etiqueta_periodo_b || 'Mes 2', Gasto: props.valor_periodo_b || 0 }
  ];

  const subioGasto = (props.porcentaje_cambio || 0) > 0;

  // Formateador para que los números del eje Y se vean como dinero ($8,500)
  const formatearDinero = (valor: number) => {
    return `$${valor.toLocaleString()}`;
  };

  return (
    <div className="w-full bg-white p-6 rounded-3xl border border-gray-100 shadow-md flex flex-col gap-6">
      <h3 className="text-xl font-bold text-gray-800 text-center">{props.titulo}</h3>
      
      <div style={{ width: '100%', height: '220px' }}>
        {/* 1. Arreglamos el margen (left: 20) para que quepan los números */}
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datosGrafica} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            
            <XAxis dataKey="periodo" stroke="#6b7280" tick={{fill: '#6b7280'}} tickLine={false} axisLine={false} />
            
            {/* 2. Formateamos los números y le damos un ancho fijo (width={65}) */}
            <YAxis 
              stroke="#6b7280" 
              tick={{fill: '#6b7280'}} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={formatearDinero}
              width={65} 
            />
            
            {/* 3. Apagamos el rectángulo gris de fondo (cursor={false}) */}
            <Tooltip 
              cursor={false} 
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Gasto']}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
            />
            
            {/* 4. Efecto "pop": al pasar el mouse la barra se pone de un azul más oscuro y brillante */}
            <Bar 
              dataKey="Gasto" 
              fill="#3b82f6" 
              radius={[6, 6, 0, 0]} 
              barSize={55} 
              activeBar={{ fill: '#1d4ed8', stroke: '#93c5fd', strokeWidth: 2 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {props.porcentaje_cambio !== undefined && (
        <div className={`text-center font-black text-lg p-3 rounded-xl ${subioGasto ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {subioGasto ? '📈 Subió un ' : '📉 Bajó un '} 
          {Math.abs(props.porcentaje_cambio)}% respecto al mes anterior
        </div>
      )}
    </div>
  );
}