import { z } from 'zod'
import { centsSchema, idSchema } from './common'

// Só CREDIT_CARD é gerenciada (categoria, pessoa, orçamento); CHECKING/CASH são movimentação, só consulta
// (03-regras-negocio § Escopo).
export const accountTypeSchema = z.enum(['CREDIT_CARD', 'CHECKING', 'CASH'])
export type AccountType = z.infer<typeof accountTypeSchema>

export const accountSourceSchema = z.enum(['MANUAL', 'IMPORT', 'PLUGGY'])
export type AccountSource = z.infer<typeof accountSourceSchema>

const dayOfMonthSchema = z.number().int().min(1).max(31)

export const accountSchema = z
  .object({
    id: idSchema,
    name: z.string(),
    type: accountTypeSchema,
    source: accountSourceSchema,
    closingDay: z.number().int().nullable(),
    dueDay: z.number().int().nullable(),
    creditLimitCents: centsSchema.nullable(),
    archivedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
  })
  .strict()
export type Account = z.infer<typeof accountSchema>

// closingDay/dueDay/creditLimitCents só fazem sentido em CREDIT_CARD — a API rejeita se vierem para
// CHECKING/CASH (08-seguranca § 8: mass assignment é sobre aceitar campo que não devia estar ali, não só
// sobre o formato dele).
export const createAccountInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Informe um nome para a conta.').max(80),
    type: accountTypeSchema,
    source: accountSourceSchema.exclude(['PLUGGY']).default('MANUAL'), // PLUGGY só é setado pelo sync (Sprint 6), nunca pelo cliente.
    closingDay: dayOfMonthSchema.optional(),
    dueDay: dayOfMonthSchema.optional(),
    creditLimitCents: centsSchema.optional(),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (input.type !== 'CREDIT_CARD') {
      for (const field of ['closingDay', 'dueDay', 'creditLimitCents'] as const) {
        if (input[field] !== undefined) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: 'Só se aplica a cartão de crédito.' })
        }
      }
    }
  })
export type CreateAccountInput = z.infer<typeof createAccountInputSchema>
