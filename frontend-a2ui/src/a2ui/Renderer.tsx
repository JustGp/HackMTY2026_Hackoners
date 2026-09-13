import { COMPONENT_REGISTRY } from './registry'
import type { A2UIAction, A2UIMessage } from './contract'

type RendererProps = {
  message: A2UIMessage
  onAction: (action: A2UIAction) => void
}

export function Renderer({ message, onAction }: RendererProps) {
  return (
    <div className="space-y-5">
      {message.message && (
        <p className="max-w-2xl text-base leading-7 text-brand-gray-dark">{message.message}</p>
      )}
      {message.blocks.map((block) => {
        const isKnownComponent = block.component in COMPONENT_REGISTRY
        const Component = isKnownComponent
          ? COMPONENT_REGISTRY[block.component]
          : COMPONENT_REGISTRY.text_block
        const renderBlock = isKnownComponent
          ? block
          : { block_id: block.block_id, component: 'text_block' as const, props: { text: message.message } }
        if (!isKnownComponent) {
          console.warn(`Unknown A2UI component: ${block.component}`)
        }
        return <Component key={block.block_id} block={renderBlock} onAction={onAction} />
      })}
      {message.suggested_next_actions.length > 0 && (
        <div className="border-t border-brand-gray-light pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-gray">
            Siguiente
          </p>
          <div className="flex flex-wrap gap-2">
            {message.suggested_next_actions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => onAction({ block_id: 'suggestions', action_id: action.id })}
                className="rounded-full bg-brand-gray-light px-3 py-2 text-sm text-brand-gray-dark hover:bg-brand-red/10 hover:text-brand-red"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
