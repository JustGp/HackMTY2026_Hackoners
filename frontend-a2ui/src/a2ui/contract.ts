import { z } from 'zod'

const numberOrZero = z.preprocess(
  (value) => (value === null || value === undefined ? 0 : value),
  z.number(),
)

const actionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
})

export const spendComparisonPropsSchema = z.object({
  title: z.string().optional(),
  series: z.array(z.object({ label: z.string(), value: numberOrZero })).min(1),
  variationPct: z.number().optional(),
})

export const historyChartPropsSchema = z.object({
  title: z.string().optional(),
  serie: z.array(z.object({ mes: z.string(), gasto: numberOrZero })).min(1),
})

export const summaryCardPropsSchema = z.object({
  balance: numberOrZero,
  monthlyLimit: numberOrZero,
  monthlySpend: numberOrZero,
  usedPct: numberOrZero,
})

export const investmentSimulatorPropsSchema = z.object({
  balance: numberOrZero,
  referenceSpend: numberOrZero,
  suggestedAmount: numberOrZero,
  options: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      detail: z.string(),
      estimatedAnnualGain: numberOrZero,
    }),
  ).min(1),
})

export const clarifyChipsPropsSchema = z.object({
  chips: z.array(actionSchema).min(1),
})

export const textBlockPropsSchema = z.object({
  text: z.string(),
})

const blockSchema = z.discriminatedUnion('component', [
  z.object({ block_id: z.string(), component: z.literal('spend_comparison_chart'), props: spendComparisonPropsSchema }),
  z.object({ block_id: z.string(), component: z.literal('historial_chart'), props: historyChartPropsSchema }),
  z.object({ block_id: z.string(), component: z.literal('summary_card'), props: summaryCardPropsSchema }),
  z.object({ block_id: z.string(), component: z.literal('investment_simulator'), props: investmentSimulatorPropsSchema }),
  z.object({ block_id: z.string(), component: z.literal('clarify_chips'), props: clarifyChipsPropsSchema }),
  z.object({ block_id: z.string(), component: z.literal('text_block'), props: textBlockPropsSchema }),
])

export const a2uiMessageSchema = z.object({
  version: z.literal('1.0'),
  conversation_turn_id: z.string(),
  intent: z.string(),
  message: z.string(),
  blocks: z.array(blockSchema),
  suggested_next_actions: z.array(actionSchema),
})

export type A2UIMessage = z.infer<typeof a2uiMessageSchema>
export type A2UIBlock = A2UIMessage['blocks'][number]
export type A2UIAction = {
  block_id: string
  action_id: string
  value?: unknown
}

export function parseA2UIMessage(raw: unknown) {
  return a2uiMessageSchema.safeParse(raw)
}
