import { z } from 'zod'
import { centsSchema } from './common'

// null quando não há base de comparação (mês/média anterior zerada) — nunca um percentual inventado.
export const spendingBreakdownItemSchema = z
  .object({
    key: z.string(),
    label: z.string(),
    amountCents: centsSchema,
    previousMonthCents: centsSchema,
    vsPreviousMonthPercent: z.number().int().nullable(),
    averageLast3MonthsCents: centsSchema,
    vsAverageLast3MonthsPercent: z.number().int().nullable(),
  })
  .strict()
export type SpendingBreakdownItem = z.infer<typeof spendingBreakdownItemSchema>

// HU 9.1 — "para onde vai o dinheiro": só compra no cartão (03-regras-negocio § Relatórios e insights).
// Cada lista só traz os agrupamentos com gasto no mês pedido, ordenados do maior pro menor.
export const spendingReportSchema = z
  .object({
    month: z.string(),
    totalCents: centsSchema,
    byCategory: z.array(spendingBreakdownItemSchema),
    byMerchant: z.array(spendingBreakdownItemSchema),
    byPerson: z.array(spendingBreakdownItemSchema),
  })
  .strict()
export type SpendingReport = z.infer<typeof spendingReportSchema>
