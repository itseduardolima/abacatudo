import type { Prisma, AccountType, TransactionKind, TransactionStatus } from '@prisma/client'
import type { PluggyAccount, PluggyTransaction } from './pluggy/pluggy.schemas'

export type MappedTransaction = Omit<Prisma.TransactionUncheckedCreateInput, 'userId' | 'accountId'> & {
  externalId: string
  kind: TransactionKind
  status: TransactionStatus
}

// O Pluggy não diz "isso é pagamento de fatura" direto: operationType costuma trazer algo como
// "credit_card_payment" para isso. type CREDIT sem esse rótulo é estorno (03-regras-negocio §
// Movimentações: pagamento de fatura nunca é gasto).
export function resolveKind(tx: PluggyTransaction): TransactionKind {
  const operation = tx.operationType?.toUpperCase() ?? ''
  if (operation.includes('PAYMENT')) return 'CARD_PAYMENT'
  if (tx.type === 'CREDIT') return 'REFUND'
  return 'EXPENSE'
}

// Pluggy manda data pura ("2026-09-21") às vezes; meio-dia UTC evita cruzar dia ao converter para
// America/Manaus (UTC-4) nas contas de mês/dia do produto.
export function dayFromDateString(date: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00.000Z`) : new Date(date)
}

export function mapTransaction(tx: PluggyTransaction): MappedTransaction {
  const card = tx.creditCardMetadata
  return {
    externalId: tx.id,
    kind: resolveKind(tx),
    status: tx.status,
    amountCents: Math.round(Math.abs(tx.amount) * 100),
    occurredAt: dayFromDateString(tx.date),
    description: tx.description,
    merchant: tx.merchant?.name ?? null,
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
