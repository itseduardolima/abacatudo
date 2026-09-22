import { z } from 'zod'
import { centsSchema, idSchema } from './common'

const percentSchema = z.number().int().min(1).max(100)

// 70/90/100% do envelope e do teto total (03-regras-negocio § Orçamento mensal) — cada um dispara uma vez
// por mês; firedThresholds é o que já disparou até agora, nunca reseta dentro do mesmo BudgetMonth.
export const alertThresholdSchema = z.union([z.literal(70), z.literal(90), z.literal(100)])
export type AlertThreshold = z.infer<typeof alertThresholdSchema>

export const envelopeSchema = z
  .object({
    id: idSchema,
    categoryId: idSchema,
    amountCents: centsSchema.nullable(),
    percent: percentSchema.nullable(),
    capCents: centsSchema,
    spentCents: centsSchema,
    percentUsed: z.number().int(),
    firedThresholds: z.array(alertThresholdSchema),
  })
  .strict()
export type Envelope = z.infer<typeof envelopeSchema>

// Exatamente um dos dois — valor fixo em centavos, ou percentual do teto variável (03-regras-negocio §
// Orçamento mensal).
const exactlyOneAmountOrPercent = (v: { amountCents?: number; percent?: number }) =>
  (v.amountCents != null) !== (v.percent != null)
const AMOUNT_OR_PERCENT_MESSAGE = 'Informe amountCents ou percent, nunca os dois nem nenhum.'

export const createEnvelopeInputSchema = z
  .object({
    categoryId: idSchema,
    amountCents: centsSchema.positive().optional(),
    percent: percentSchema.optional(),
  })
  .strict()
  .refine(exactlyOneAmountOrPercent, { message: AMOUNT_OR_PERCENT_MESSAGE })
export type CreateEnvelopeInput = z.infer<typeof createEnvelopeInputSchema>

export const updateEnvelopeInputSchema = z
  .object({
    amountCents: centsSchema.positive().optional(),
    percent: percentSchema.optional(),
  })
  .strict()
  .refine(exactlyOneAmountOrPercent, { message: AMOUNT_OR_PERCENT_MESSAGE })
export type UpdateEnvelopeInput = z.infer<typeof updateEnvelopeInputSchema>

// "Livre" é o que sobra do teto variável sem envelope nenhum (03-regras-negocio § Orçamento mensal).
// total* é o alerta do teto variável inteiro (todas as categorias somadas), não de um envelope só.
export const envelopeListSchema = z
  .object({
    variableCapCents: centsSchema,
    allocatedCents: centsSchema,
    freeCents: centsSchema,
    totalSpentCents: centsSchema,
    totalPercentUsed: z.number().int(),
    totalFiredThresholds: z.array(alertThresholdSchema),
    envelopes: z.array(envelopeSchema),
  })
  .strict()
export type EnvelopeList = z.infer<typeof envelopeListSchema>
