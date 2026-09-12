export type A2UIComponent =
  | {
      type: 'text'
      id: string
      text: string
    }
  | {
      type: 'button'
      id: string
      label: string
      action: string
    }
  | {
      type: 'comparison-chart'
      id: string
      title: string
      data: Array<Record<string, string | number>>
    }

export type A2UIScreen = {
  id: string
  title: string
  components: A2UIComponent[]
}

export type A2UIAction = {
  type: string
  payload?: Record<string, unknown>
}
