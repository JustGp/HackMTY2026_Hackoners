import { A2UIButton, A2UIChart, A2UIText } from '../components/a2ui'
import type { A2UIComponent } from '../types/a2ui'

export function renderA2UIComponent(component: A2UIComponent) {
  switch (component.type) {
    case 'text':
      return <A2UIText>{component.text}</A2UIText>
    case 'button':
      return <A2UIButton label={component.label} />
    case 'comparison-chart':
      return <A2UIChart title={component.title} />
  }
}
