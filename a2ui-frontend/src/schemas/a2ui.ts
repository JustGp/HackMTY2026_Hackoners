import { z } from 'zod'

const componentBaseSchema = z.object({
  id: z.string().min(1),
})

export const a2uiComponentSchema = z.discriminatedUnion('type', [
  componentBaseSchema.extend({
    type: z.literal('text'),
    text: z.string(),
  }),
  componentBaseSchema.extend({
    type: z.literal('button'),
    label: z.string(),
    action: z.string(),
  }),
  componentBaseSchema.extend({
    type: z.literal('comparison-chart'),
    title: z.string(),
    data: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
  }),
])

export const a2uiScreenSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  components: z.array(a2uiComponentSchema),
})

export const a2uiActionSchema = z.object({
  type: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
})
