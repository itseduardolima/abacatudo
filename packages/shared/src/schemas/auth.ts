import { z } from 'zod'

// Allowlist explícita (.strict()): campo extra é rejeitado, não ignorado (08-seguranca § 8).
export const loginInputSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Informe um e-mail válido.'),
    password: z.string().min(1, 'Informe a senha.'),
  })
  .strict()
export type LoginInput = z.infer<typeof loginInputSchema>

// Nunca inclui passwordHash (08-seguranca § 9): resposta montada a partir deste schema, não do registro do Prisma.
export const currentUserSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email(),
  })
  .strict()
export type CurrentUser = z.infer<typeof currentUserSchema>
