import { z } from 'zod'

// Placeholders que scripts/deploy-check.sh também recusa: última linha de defesa dentro do processo.
const PLACEHOLDER = /seudominio|gere-|change-me|placeholder|^localhost/i

const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET precisa de 32+ caracteres (openssl rand -hex 32).'),
  // Sessão de 30 dias sem uso (janela deslizante) — 08-seguranca § 4.
  SESSION_IDLE_DAYS: z.coerce.number().int().positive().default(30),
  DATA_ENCRYPTION_KEY: z.string().optional(),
  RATE_LIMIT_ENABLED: z.enum(['true', 'false']).default('true'),
})

export const envSchema = baseSchema.superRefine((env, ctx) => {
  if (env.NODE_ENV !== 'production') return
  const fail = (path: string, message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message })

  if (PLACEHOLDER.test(env.SESSION_SECRET)) fail('SESSION_SECRET', 'Ainda com valor de exemplo. Gere um segredo real.')
  if (!env.DATA_ENCRYPTION_KEY || !/^[0-9a-f]{64}$/i.test(env.DATA_ENCRYPTION_KEY)) {
    fail('DATA_ENCRYPTION_KEY', 'Em produção precisa de 64 caracteres hex (openssl rand -hex 32).')
  }
  if (env.RATE_LIMIT_ENABLED === 'false')
    fail('RATE_LIMIT_ENABLED', 'O rate limit nunca pode ficar desligado em produção.')
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw)
  if (parsed.success) return parsed.data
  const problems = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
  throw new Error(`Configuração inválida: ${problems}`)
}
