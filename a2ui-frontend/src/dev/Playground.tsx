import { renderA2UIComponent } from '../lib/renderer'
import type { A2UIScreen } from '../types/a2ui'

export function Playground({ screen }: { screen: A2UIScreen }) {
  return (
    <section>
      <h1>{screen.title}</h1>
      {screen.components.map((component) => (
        <div key={component.id}>{renderA2UIComponent(component)}</div>
      ))}
    </section>
  )
}
