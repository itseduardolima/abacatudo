import type { PluggyAccount, PluggyTransaction } from './pluggy/pluggy.schemas'
import { dayFromDateString, mapAccountFields, mapTransaction, resolveKind } from './banking.mapper'

function tx(overrides: Partial<PluggyTransaction> = {}): PluggyTransaction {
  return {
    id: 'tx-1',
    amount: 150.5,
    type: 'DEBIT',
    operationType: null,
    category: null,
    categoryId: null,
    status: 'POSTED',
    date: '2026-09-21',
    description: 'PAG*LOJA',
    merchant: null,
    creditCardMetadata: null,
    ...overrides,
  }
}

describe('resolveKind', () => {
  it('compra normal (DEBIT) é EXPENSE, em cartão ou movimentação', () => {
    expect(resolveKind(tx({ type: 'DEBIT' }), true)).toBe('EXPENSE')
    expect(resolveKind(tx({ type: 'DEBIT' }), false)).toBe('EXPENSE')
  })

  it('CREDIT em cartão sem categoria de pagamento é estorno (REFUND)', () => {
    expect(resolveKind(tx({ type: 'CREDIT' }), true)).toBe('REFUND')
  })

  it('CREDIT em movimentação é dinheiro entrando de verdade (INCOME), não estorno', () => {
    expect(resolveKind(tx({ type: 'CREDIT' }), false)).toBe('INCOME')
  })

  it('operationType "PAGAMENTO" sozinho não basta (o Pluggy usa o mesmo valor pra compra parcelada)', () => {
    expect(resolveKind(tx({ type: 'DEBIT', operationType: 'PAGAMENTO' }), true)).toBe('EXPENSE')
  })

  it('categoryId de pagamento de fatura é CARD_PAYMENT, nunca gasto', () => {
    expect(resolveKind(tx({ type: 'CREDIT', categoryId: '05100000' }), true)).toBe('CARD_PAYMENT')
  })

  it('category "Credit card payment" também é CARD_PAYMENT (fallback sem categoryId)', () => {
    expect(resolveKind(tx({ type: 'CREDIT', category: 'Credit card payment' }), true)).toBe('CARD_PAYMENT')
  })
})

describe('dayFromDateString', () => {
  it('data pura (AAAA-MM-DD) vira meio-dia UTC, sem cruzar dia em America/Manaus', () => {
    const result = dayFromDateString('2026-09-21')
    expect(result.toISOString()).toBe('2026-09-21T12:00:00.000Z')
  })

  it('timestamp completo é preservado', () => {
    const result = dayFromDateString('2026-09-21T23:10:00.000Z')
    expect(result.toISOString()).toBe('2026-09-21T23:10:00.000Z')
  })
})

describe('mapTransaction', () => {
  it('converte valor para centavos absolutos e mapeia metadados de parcela', () => {
    const result = mapTransaction(
      tx({
        amount: -89.9,
        merchant: { businessName: 'Loja X' },
        creditCardMetadata: { cardNumber: '1234', totalInstallments: 3, installmentNumber: 1, billId: 'bill-1' },
      }),
      true,
    )
    expect(result.amountCents).toBe(8990)
    expect(result.merchant).toBe('Loja X')
    expect(result.cardLast4).toBe('1234')
    expect(result.installmentTotal).toBe(3)
    expect(result.billId).toBe('bill-1')
  })

  it('sem metadados de cartão, os campos ficam null', () => {
    const result = mapTransaction(tx(), true)
    expect(result.cardLast4).toBeNull()
    expect(result.installmentNumber).toBeNull()
  })

  it('parcela usa purchaseDate (data real da compra), não a data da parcela na fatura', () => {
    const result = mapTransaction(
      tx({
        date: '2027-05-21',
        creditCardMetadata: {
          cardNumber: '9391',
          totalInstallments: 12,
          installmentNumber: 12,
          billId: null,
          purchaseDate: '2026-06-21T22:35:59.001Z',
        },
      }),
      true,
    )
    expect(new Date(result.occurredAt).toISOString()).toBe('2026-06-21T22:35:59.001Z')
  })

  it('sem purchaseDate, cai pra `date`', () => {
    const result = mapTransaction(tx({ date: '2026-09-21' }), true)
    expect(new Date(result.occurredAt).toISOString()).toBe('2026-09-21T12:00:00.000Z')
  })

  it('em conta de movimentação, CREDIT vira INCOME', () => {
    const result = mapTransaction(tx({ type: 'CREDIT' }), false)
    expect(result.kind).toBe('INCOME')
  })
})

describe('mapAccountFields', () => {
  function account(overrides: Partial<PluggyAccount> = {}): PluggyAccount {
    return { id: 'acc-1', type: 'CREDIT', name: 'Nubank', creditData: null, ...overrides }
  }

  it('conta CREDIT vira CREDIT_CARD, com dia de fechamento/vencimento e limite em centavos', () => {
    const result = mapAccountFields(
      account({ creditData: { creditLimit: 5000, balanceCloseDate: '2026-09-20', balanceDueDate: '2026-09-27' } }),
    )
    expect(result).toEqual({ type: 'CREDIT_CARD', closingDay: 20, dueDay: 27, creditLimitCents: 500000 })
  })

  it('conta BANK vira CHECKING, sem campos de cartão', () => {
    const result = mapAccountFields(account({ type: 'BANK', creditData: null }))
    expect(result).toEqual({ type: 'CHECKING', closingDay: null, dueDay: null, creditLimitCents: null })
  })
})
