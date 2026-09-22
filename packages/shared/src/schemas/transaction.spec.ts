import { transactionSchema, updateTransactionPersonInputSchema } from './transaction'

const VALID = {
  id: '11111111-1111-1111-1111-111111111111',
  accountId: '22222222-2222-2222-2222-222222222222',
  kind: 'EXPENSE',
  status: 'POSTED',
  amountCents: 1500,
  occurredAt: '2026-09-21T12:00:00.000Z',
  description: 'PAG*LOJA',
  merchant: null,
  categoryId: null,
  personId: null,
  note: null,
  cardLast4: null,
  installmentNumber: null,
  installmentTotal: null,
  createdAt: '2026-09-21T12:00:00.000Z',
}

describe('transactionSchema', () => {
  it('aceita a forma completa', () => {
    expect(transactionSchema.safeParse(VALID).success).toBe(true)
  })

  it('rejeita campo extra (a mesma forma serve pra /transactions e /movements, sem vazar nada a mais)', () => {
    expect(transactionSchema.safeParse({ ...VALID, userId: 'x' }).success).toBe(false)
  })

  it('rejeita kind ou status fora do enum', () => {
    expect(transactionSchema.safeParse({ ...VALID, kind: 'PIX' }).success).toBe(false)
    expect(transactionSchema.safeParse({ ...VALID, status: 'DONE' }).success).toBe(false)
  })
})

describe('updateTransactionPersonInputSchema', () => {
  it('alwaysForMerchant é opcional, padrão false', () => {
    const result = updateTransactionPersonInputSchema.safeParse({ personId: VALID.id })
    expect(result.success).toBe(true)
    expect(result.success && result.data.alwaysForMerchant).toBe(false)
  })

  it('rejeita personId inválido e campo extra', () => {
    expect(updateTransactionPersonInputSchema.safeParse({ personId: 'não-é-uuid' }).success).toBe(false)
    expect(updateTransactionPersonInputSchema.safeParse({ personId: VALID.id, note: 'x' }).success).toBe(false)
  })
})
