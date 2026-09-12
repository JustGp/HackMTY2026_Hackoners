import { a2uiActionSchema } from '../schemas/a2ui'
import type { A2UIAction } from '../types/a2ui'

export function dispatchA2UIAction(action: A2UIAction) {
  const parsedAction = a2uiActionSchema.parse(action)
  return parsedAction
}
