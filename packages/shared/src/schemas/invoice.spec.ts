import { invoiceSchema } from './invoice'

describe('invoiceSchema', () => {
  it('aceita a forma completa', () => {
    expect(invoiceSchema.safeParse({ totalCents: 200000, mineCents: 130000, notMineCents: 70000 }).success).toBe(true)
  })

  it('rejeita campo extra', () => {
    expect(invoiceSchema.safeParse({ totalCents: 0, mineCents: 0, notMineCents: 0, aClassificar: 0 }).success).toBe(
      false,
    )
  })
})
