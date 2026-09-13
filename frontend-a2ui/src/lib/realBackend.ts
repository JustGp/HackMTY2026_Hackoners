import { parseComponentEnvelope } from '../a2ui'
import type { AccionUI, ComponentEnvelope } from '../a2ui'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export async function sendToRealBackend(
  accionUI: AccionUI,
): Promise<ComponentEnvelope> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not configured')
  }

  const response = await fetch(`${API_BASE_URL}/interact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(accionUI),
  })

  if (!response.ok) {
    throw new Error(`Backend error: ${response.status}`)
  }

  const parsed = parseComponentEnvelope(await response.json())

  if (!parsed.success) {
    throw new Error(`Backend returned invalid envelope: ${parsed.error.message}`)
  }

  return parsed.data
}