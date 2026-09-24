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
// `name` vem da Person isSelf (não existe User.name — mesmo dado, uma fonte só), não é opcional porque todo
// User tem uma Person isSelf desde o seed.
export const currentUserSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
  })
  .strict()
export type CurrentUser = z.infer<typeof currentUserSchema>

// Nome + e-mail num formulário só (mesma tela "Meu perfil"); senha é outro formulário/endpoint — trocar
// senha tem regra de segurança diferente (confirmar a atual), não faz sentido misturar payload.
export const updateProfileInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Informe o nome.').max(100, 'Nome muito longo.'),
    email: z.string().trim().toLowerCase().email('Informe um e-mail válido.'),
  })
  .strict()
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>

// Sem confirmação da senha nova (repetir o campo) — nenhum form do app pede isso hoje. Tamanho mínimo de
// verdade é responsabilidade do backend (assertStrongPassword, MIN_PASSWORD_LENGTH) — aqui só barra vazio.
export const changePasswordInputSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual.'),
    newPassword: z.string().min(1, 'Informe a nova senha.'),
  })
  .strict()
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>

export const forgotPasswordInputSchema = z
  .object({ email: z.string().trim().toLowerCase().email('Informe um e-mail válido.') })
  .strict()
export type ForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>

// Devolvido pra tela de redefinir senha confirmar "é essa a sua conta" antes de mostrar o formulário —
// nunca mais que o e-mail (sem nome: evitaria vazar dado a quem só tem o link, ex. encaminhado por engano).
export const resetTokenInfoSchema = z.object({ email: z.string().email() }).strict()
export type ResetTokenInfo = z.infer<typeof resetTokenInfoSchema>

export const resetPasswordInputSchema = z
  .object({
    token: z.string().min(1, 'Link inválido.'),
    newPassword: z.string().min(1, 'Informe a nova senha.'),
  })
  .strict()
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>
