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
