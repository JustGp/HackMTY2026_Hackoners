import React from 'react';
import { TarjetaResumen, GraficaComparativa } from './Componentes';
import type { ComponentEnvelope, AccionUI } from './a2ui.schema';

// Un diccionario fuertemente tipado
const COMPONENT_REGISTRY: Record<string, React.FC<any>> = {
  tarjeta_resumen: TarjetaResumen,
  grafica_comparativa: GraficaComparativa,
};

interface RenderizadorProps {
  llmResponse: ComponentEnvelope; // Recibe la unión discriminada de Zod
  onEnviarAlLLM: (accion: AccionUI) => void;
}

export const RenderizadorA2UI: React.FC<RenderizadorProps> = ({ llmResponse, onEnviarAlLLM }) => {
  // TypeScript ya sabe que llmResponse.componente existe gracias a Zod
  const ComponenteRenderizado = COMPONENT_REGISTRY[llmResponse.componente];

  if (!ComponenteRenderizado) {
    return <div className="p-4 text-red-500 bg-red-50 rounded-xl">Error: Componente no registrado.</div>;
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-sm mx-auto">
      <div className="text-gray-800 bg-gray-100 p-4 rounded-2xl rounded-tl-sm text-[15px] leading-relaxed">
        {llmResponse.texto_respuesta}
      </div>
      
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <ComponenteRenderizado 
          props={llmResponse.props} 
          onAction={onEnviarAlLLM} 
        />
      </div>
    </div>
  );
};