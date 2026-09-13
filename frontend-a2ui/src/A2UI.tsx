import { A2UIRenderer } from './renderer'
import type { AccionUI, ComponentEnvelope } from './a2ui'

interface RenderizadorProps {
  llmResponse: ComponentEnvelope
  onEnviarAlLLM: (accion: AccionUI) => void
}

export function RenderizadorA2UI({ llmResponse, onEnviarAlLLM }: RenderizadorProps) {
  return (
    <A2UIRenderer
      envelope={llmResponse}
      usuarioId="demo-user"
      onAction={onEnviarAlLLM}
    />
  )
}