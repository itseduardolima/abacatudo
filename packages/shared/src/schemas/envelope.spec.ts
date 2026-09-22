import { createEnvelopeInputSchema, envelopeListSchema, updateEnvelopeInputSchema } from './envelope'

const CATEGORY = '11111111-1111-1111-1111-111111111111'

describe('createEnvelopeInputSchema', () => {
  it('aceita com amountCents', () => {
    expect(createEnvelopeInputSchema.safeParse({ categoryId: CATEGORY, amountCents: 30000 }).success).toBe(true)
  })

  it('aceita com percent', () => {
    expect(createEnvelopeInputSchema.safeParse({ categoryId: CATEGORY, percent: 20 }).success).toBe(true)
  })

  it('rejeita os dois preenchidos', () => {
    expect(createEnvelopeInputSchema.safeParse({ categoryId: CATEGORY, amountCents: 30000, percent: 20 }).success).toBe(
      false,
    )
  })

  it('rejeita nenhum dos dois', () => {
    expect(createEnvelopeInputSchema.safeParse({ categoryId: CATEGORY }).success).toBe(false)
  })

  it('rejeita percent fora de 1-100', () => {
    expect(createEnvelopeInputSchema.safeParse({ categoryId: CATEGORY, percent: 0 }).success).toBe(false)
    expect(createEnvelopeInputSchema.safeParse({ categoryId: CATEGORY, percent: 101 }).success).toBe(false)
  })

  it('rejeita amountCents zero ou negativo', () => {
    expect(createEnvelopeInputSchema.safeParse({ categoryId: CATEGORY, amountCents: 0 }).success).toBe(false)
    expect(createEnvelopeInputSchema.safeParse({ categoryId: CATEGORY, amountCents: -100 }).success).toBe(false)
  })
})

describe('updateEnvelopeInputSchema', () => {
  it('não aceita categoryId (não dá pra trocar a categoria do envelope)', () => {
    expect(updateEnvelopeInputSchema.safeParse({ categoryId: CATEGORY, amountCents: 30000 }).success).toBe(false)
  })
})

describe('envelopeListSchema', () => {
  it('aceita a forma completa', () => {
    const result = envelopeListSchema.safeParse({
      variableCapCents: 310000,
      allocatedCents: 100000,
      freeCents: 210000,
      envelopes: [{ id: CATEGORY, categoryId: CATEGORY, amountCents: 30000, percent: null, capCents: 30000 }],
    })
    expect(result.success).toBe(true)
  })
})
