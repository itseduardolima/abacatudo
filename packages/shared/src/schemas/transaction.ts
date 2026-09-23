import { z } from 'zod'
import { centsSchema, idSchema } from './common'

export const transactionKindSchema = z.enum(['EXPENSE', 'INCOME', 'TRANSFER', 'REFUND', 'CARD_PAYMENT'])
export type TransactionKind = z.infer<typeof transactionKindSchema>

export const transactionStatusSchema = z.enum(['POSTED', 'PENDING'])
export type TransactionStatus = z.infer<typeof transactionStatusSchema>

// Mesma forma para /transactions (só CREDIT_CARD) e /movements (o resto) — quem separa é o endpoint, não o
// schema (03-regras-negocio § Escopo, 04-padroes-codigo).
export const transactionSchema = z
  .object({
    id: idSchema,
    accountId: idSchema,
    kind: transactionKindSchema,
    status: transactionStatusSchema,
    amountCents: centsSchema,
    occurredAt: z.string().datetime(),
    description: z.string(),
    merchant: z.string().nullable(),
    categoryId: idSchema.nullable(),
    personId: idSchema.nullable(),
    note: z.string().nullable(),
    cardLast4: z.string().nullable(),
    installmentNumber: z.number().int().nullable(),
    installmentTotal: z.number().int().nullable(),
    createdAt: z.string().datetime(),
  })
  .strict()
export type Transaction = z.infer<typeof transactionSchema>

// Corrigir a pessoa de uma transação (03-regras-negocio § Atribuição de pessoa). alwaysForMerchant cria/
// atualiza a Rule do estabelecimento — a API rejeita se a transação não tiver merchant identificado.
// alwaysForCard cria/atualiza o CardHolderHint (2.3, cartão adicional/virtual) — a API rejeita se a
// transação não tiver o final do cartão identificado. Os dois podem vir juntos (não são exclusivos), e o
// hint de cartão decide antes da Rule na próxima sincronização (ver 03-regras-negocio § pipeline).
export const updateTransactionPersonInputSchema = z
  .object({
    personId: idSchema,
    alwaysForMerchant: z.boolean().default(false),
    alwaysForCard: z.boolean().default(false),
  })
  .strict()
export type UpdateTransactionPersonInput = z.infer<typeof updateTransactionPersonInputSchema>

// Corrigir a categoria de uma transação (03-regras-negocio § Categorias e regras). Mesma lógica de
// alwaysForMerchant do endpoint de pessoa, na mesma Rule do estabelecimento.
export const updateTransactionCategoryInputSchema = z
  .object({
    categoryId: idSchema,
    alwaysForMerchant: z.boolean().default(false),
  })
  .strict()
export type UpdateTransactionCategoryInput = z.infer<typeof updateTransactionCategoryInputSchema>

// Lançamento manual (3.3): só vale pra conta MANUAL/IMPORT (a API rejeita conta PLUGGY — ela é escrita só
// pelo sync). categoryId/personId só fazem sentido em conta CREDIT_CARD (03-regras-negocio § Escopo); a
// API rejeita se vierem numa conta que não é cartão. occurredAt aceita data pura ("AAAA-MM-DD", o que um
// <input type="date"> dá) ou datetime completo.
export const createTransactionInputSchema = z
  .object({
    accountId: idSchema,
    kind: z.enum(['EXPENSE', 'INCOME']),
    amountCents: centsSchema.positive(),
    occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, 'Informe uma data válida.'),
    description: z.string().trim().min(1, 'Informe uma descrição.').max(140),
    categoryId: idSchema.optional(),
    personId: idSchema.optional(),
  })
  .strict()
export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>
