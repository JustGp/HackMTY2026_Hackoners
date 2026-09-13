import React, { useState } from 'react';
import { RenderizadorA2UI } from './A2UI';
import { parseComponentEnvelope, type AccionUI } from './a2ui.schema';

// 1. Mock para el Resumen (El plano)
const rawMockResumen = {
  texto_respuesta: "Aquí está tu estado financiero actual.",
  componente: "tarjeta_resumen",
  props: {
    saldo_actual: 24500,
    limite_mensual_tarjeta: 10000,
    gasto_mes_actual: 4200,
    porcentaje_usado: 42
  }
};

// 2. Mock Roto (Para probar Zod)
const rawMockInvalido = {
  texto_respuesta: "Me faltan campos importantes.",
  componente: "tarjeta_resumen",
  props: { saldo_actual: 100 }
};

// 3. NUEVO MOCK: La Gráfica Comparativa con datos del Backend
const rawMockComparativa = {
  texto_respuesta: "¡Ouch! Este mes gastaste más que el pasado. Aquí tienes la comparativa.",
  componente: "grafica_comparativa",
  props: {
    titulo: "Comparativa Agosto vs Septiembre",
    etiqueta_periodo_a: "Agosto",
    valor_periodo_a: 8500,
    etiqueta_periodo_b: "Septiembre",
    valor_periodo_b: 12400,
    porcentaje_cambio: 45.8
  }
};

export default function App() {
  const [respuestaRaw, setRespuestaRaw] = useState<unknown>(null);

  const manejarAccionUsuario = (contratoD: AccionUI) => {
    console.log("📤 Enviando al LLM (Contrato D):", contratoD);
    alert(`El componente envió la acción: ${contratoD.accion}`);
  };

  let contenidoPrincipal = (
    <div className="text-center text-gray-400 mb-10">
      Esperando respuesta del LLM...
    </div>
  );

  if (respuestaRaw) {
    const validacion = parseComponentEnvelope(respuestaRaw);
    
    if (validacion.success) {
      contenidoPrincipal = (
        <RenderizadorA2UI 
          llmResponse={validacion.data} 
          onEnviarAlLLM={manejarAccionUsuario} 
        />
      );
    } else {
      contenidoPrincipal = (
        <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-sm overflow-auto max-w-full">
          <h4 className="text-red-700 font-bold mb-2">Error del LLM (Contrato Roto):</h4>
          <pre className="text-red-600">{JSON.stringify(validacion.error.format(), null, 2)}</pre>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans flex flex-col md:flex-row">
      <div className="w-full md:w-1/3 bg-gray-50 border-r p-6 flex flex-col gap-4">
        <h1 className="text-xl font-black mb-4">Simulador Zod + A2UI</h1>
        
        <button onClick={() => setRespuestaRaw(rawMockResumen)} className="p-3 text-left bg-white border shadow-sm rounded-xl hover:border-black">
          ✅ Simular Resumen Mensual
        </button>

        {/* ¡AQUÍ ESTÁ EL TERCER BOTÓN! */}
        <button onClick={() => setRespuestaRaw(rawMockComparativa)} className="p-3 text-left bg-blue-50 border border-blue-200 text-blue-700 font-bold shadow-sm rounded-xl hover:bg-blue-100">
          📊 Simular Gráfica (Comparar Meses)
        </button>
        
        <button onClick={() => setRespuestaRaw(rawMockInvalido)} className="p-3 text-left border border-red-300 bg-red-50 text-red-700 rounded-xl hover:bg-red-100">
          ❌ Simular LLM Alucinado
        </button>
      </div>

      <div className="w-full md:w-2/3 p-6 flex justify-center items-center bg-gray-200">
        <div className="w-full max-w-md h-[700px] bg-white rounded-3xl shadow-2xl p-6 overflow-y-auto border-8 border-gray-100 flex flex-col justify-end">
          {contenidoPrincipal}
        </div>
      </div>
    </div>
  );
}