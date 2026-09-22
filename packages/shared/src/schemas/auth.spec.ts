import { currentUserSchema, loginInputSchema } from './auth'

describe('loginInputSchema', () => {
  it('normaliza o e-mail (trim + minúsculas)', () => {
    const parsed = loginInputSchema.parse({ email: '  A@B.COM ', password: 'x' })
    expect(parsed.email).toBe('a@b.com')
  })

  it('rejeita e-mail inválido e senha vazia', () => {
    expect(loginInputSchema.safeParse({ email: 'nao-e-email', password: 'x' }).success).toBe(false)
    expect(loginInputSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false)
  })

  it('rejeita campo extra (mass assignment, 08-seguranca § 8)', () => {
    expect(loginInputSchema.safeParse({ email: 'a@b.com', password: 'x', role: 'admin' }).success).toBe(false)
  })
})

describe('currentUserSchema', () => {
  it('não tem campo de senha', () => {
    expect(Object.keys(currentUserSchema.shape)).not.toContain('passwordHash')
  })

  it('rejeita passwordHash como campo extra', () => {
    expect(
      currentUserSchema.safeParse({ id: '11111111-1111-1111-1111-111111111111', email: 'a@b.com', passwordHash: 'x' })
        .success,
    ).toBe(false)
  })
})
