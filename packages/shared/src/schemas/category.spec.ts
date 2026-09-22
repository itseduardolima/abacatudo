import { createCategoryInputSchema } from './category'

describe('createCategoryInputSchema', () => {
  it('aceita um nome', () => {
    expect(createCategoryInputSchema.safeParse({ name: 'Mercado' }).success).toBe(true)
  })

  it('rejeita nome vazio e nome maior que 40 caracteres', () => {
    expect(createCategoryInputSchema.safeParse({ name: '' }).success).toBe(false)
    expect(createCategoryInputSchema.safeParse({ name: 'x'.repeat(41) }).success).toBe(false)
  })

  it('rejeita campo extra (mass assignment)', () => {
    expect(createCategoryInputSchema.safeParse({ name: 'Mercado', userId: 'outro' }).success).toBe(false)
  })
})
