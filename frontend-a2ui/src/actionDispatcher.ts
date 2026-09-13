import { parseAccionUI } from './a2ui'
import type { AccionUI, ComponentEnvelope } from './a2ui'

// Swap this implementation in Phase 5 for a real fetch()/WebSocket send.
// Keeping it isolated here means nothing else in the app needs to change
// when the transport changes.
type SendFn = (accionUI: AccionUI) => Promise<ComponentEnvelope>

let sendImpl: SendFn = async () => {
  throw new Error('No transport configured — call configureDispatcher() first')
}

export function configureDispatcher(fn: SendFn) {
  sendImpl = fn
}

export async function dispatchA2UIAction(raw: AccionUI): Promise<ComponentEnvelope> {
  const parsed = parseAccionUI(raw)
  if (!parsed.success) {
    throw new Error(`Invalid accion_ui payload: ${parsed.error.message}`)
  }
  return sendImpl(parsed.data)
}
