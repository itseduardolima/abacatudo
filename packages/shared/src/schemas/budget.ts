import { z } from 'zod'
import { centsSchema } from './common'

const monthKeySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mês inválido (esperado AAAA-MM).')

// teto variável = renda + benefício − gastos fixos − meta de poupança (03-regras-negocio § Orçamento
// mensal). variableCapCents é calculado, nunca guardado.
export const budgetMonthSchema = z
  .object({
    month: monthKeySchema,
    incomeCents: centsSchema,
    benefitCents: centsSchema,
    fixedExpensesCents: centsSchema,
    savingsGoalCents: centsSchema,
    variableCapCents: centsSchema,
  })
  .strict()
export type BudgetMonth = z.infer<typeof budgetMonthSchema>

export const updateBudgetMonthInputSchema = z
  .object({
    incomeCents: centsSchema.nonnegative(),
    benefitCents: centsSchema.nonnegative(),
    fixedExpensesCents: centsSchema.nonnegative(),
    savingsGoalCents: centsSchema.nonnegative(),
  })
  .strict()
export type UpdateBudgetMonthInput = z.infer<typeof updateBudgetMonthInputSchema>
