import type { A2UIScreen } from '../types/a2ui'

export async function fetchMockScreen(): Promise<A2UIScreen> {
  return {
    id: 'playground-screen',
    title: 'A2UI Playground',
    components: [
      {
        type: 'text',
        id: 'welcome',
        text: 'A2UI renderer is ready.',
      },
    ],
  }
}
