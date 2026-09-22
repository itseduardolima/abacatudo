import type { Prisma, AccountType, TransactionKind, TransactionStatus } from '@prisma/client'
import type { PluggyAccount, PluggyTransaction } from './pluggy/pluggy.schemas'

export type MappedTransaction = Omit<Prisma.TransactionUncheckedCreateInput, 'userId' | 'accountId'> & {
  externalId: string
  kind: TransactionKind
  status: TransactionStatus
}

// operationType não serve pra achar pagamento de fatura: o Pluggy manda "PAGAMENTO" tanto numa compra
// parcelada quanto no pagamento em si. O sinal confiável é a categoria que o Pluggy já classifica
// (categoryId "05100000" / category "Credit card payment") — 03-regras-negocio § Movimentações: pagamento
// de fatura nunca é gasto.
const CARD_PAYMENT_CATEGORY_ID = '05100000'

// CREDIT vira REFUND só em cartão de crédito (estorno de compra). Em conta de movimentação (corrente,
// benefício), CREDIT é dinheiro entrando de verdade (Pix recebido, depósito) — vira INCOME, não estorno.
export function resolveKind(tx: PluggyTransaction, isCreditCard: boolean): TransactionKind {
  if (tx.categoryId === CARD_PAYMENT_CATEGORY_ID || tx.category?.toLowerCase() === 'credit card payment') {
    return 'CARD_PAYMENT'
  }
  if (tx.type !== 'CREDIT') return 'EXPENSE'
  return isCreditCard ? 'REFUND' : 'INCOME'
}

// Pluggy manda data pura ("2026-09-21") às vezes; meio-dia UTC evita cruzar dia ao converter para
// America/Manaus (UTC-4) nas contas de mês/dia do produto.
export function dayFromDateString(date: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00.000Z`) : new Date(date)
}

export function mapTransaction(tx: PluggyTransaction, isCreditCard: boolean): MappedTransaction {
  const card = tx.creditCardMetadata
  return {
    externalId: tx.id,
    kind: resolveKind(tx, isCreditCard),
    status: tx.status,
    amountCents: Math.round(Math.abs(tx.amount) * 100),
    // Em parcelada, `date` é quando a parcela cai na fatura (pode ser meses à frente); purchaseDate é
    // quando a compra de fato aconteceu — é isso que conta pra "gasto do mês" (03-regras-negocio).
    occurredAt: dayFromDateString(card?.purchaseDate ?? tx.date),
    description: tx.description,
    merchant: tx.merchant?.businessName ?? null,
    cardLast4: card?.cardNumber ?? null,
    installmentNumber: card?.installmentNumber ?? null,
    installmentTotal: card?.totalInstallments ?? null,
    billId: card?.billId ?? null,
  }
}

export function mapAccountFields(pluggyAccount: PluggyAccount): {
  type: AccountType
  closingDay: number | null
  dueDay: number | null
  creditLimitCents: number | null
} {
  const isCreditCard = pluggyAccount.type === 'CREDIT'
  const credit = pluggyAccount.creditData
  return {
    type: isCreditCard ? 'CREDIT_CARD' : 'CHECKING',
    closingDay: isCreditCard ? dayOfMonth(credit?.balanceCloseDate) : null,
    dueDay: isCreditCard ? dayOfMonth(credit?.balanceDueDate) : null,
    creditLimitCents: isCreditCard && credit?.creditLimit != null ? Math.round(credit.creditLimit * 100) : null,
  }
}

function dayOfMonth(dateStr: string | null | undefined): number | null {
  const match = dateStr ? /^\d{4}-(\d{2})-(\d{2})/.exec(dateStr) : null
  return match ? Number(match[2]) : null
}
