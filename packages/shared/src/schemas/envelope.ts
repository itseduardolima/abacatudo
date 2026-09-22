import { z } from 'zod'
import { centsSchema, idSchema } from './common'

const percentSchema = z.number().int().min(1).max(100)

export const envelopeSchema = z
  .object({
    id: idSchema,
    categoryId: idSchema,
    amountCents: centsSchema.nullable(),
    percent: percentSchema.nullable(),
    capCents: centsSchema,
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
export const envelopeListSchema = z
  .object({
    variableCapCents: centsSchema,
    allocatedCents: centsSchema,
    freeCents: centsSchema,
    envelopes: z.array(envelopeSchema),
  })
  .strict()
export type EnvelopeList = z.infer<typeof envelopeListSchema>
