import { adaptLegacyEnvelope } from '../a2ui/adaptLegacy'
import type { A2UIAction, A2UIMessage } from '../a2ui/contract'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export async function sendEvent(event: A2UIAction, usuarioId: string): Promise<A2UIMessage> {
  const value = (event.value ?? {}) as Record<string, unknown>
  return request('/interact', {
    tipo: 'accion_ui',
    accion: event.action_id,
    usuario_id: usuarioId,
    contexto: { ...value, componente: value.componente ?? event.block_id, event },
  })
}

export async function sendAppOpened(usuarioId: string): Promise<A2UIMessage> {
  return request('/agent/turn', {
    usuario_id: usuarioId,
    event: { type: 'app_opened' },
  })
}

export async function sendText(texto: string, usuarioId: string): Promise<A2UIMessage> {
  return request('/mensaje', { texto, usuario_id: usuarioId })
}

async function request(path: string, body: Record<string, unknown>): Promise<A2UIMessage> {
  if (!API_BASE_URL) throw new Error('VITE_API_BASE_URL is not configured')

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    let detail = response.statusText || 'Unknown server error'
    try {
      const body = (await response.json()) as { detail?: string }
      detail = body.detail ?? detail
    } catch {
      // Keep the HTTP status when the server did not return JSON.
    }
    throw new Error(`Backend error ${response.status}: ${detail}`)
  }

  return adaptLegacyEnvelope(await response.json())
}