import { Injectable, type OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import argon2 from 'argon2'
import type { CurrentUser, LoginInput } from '@gastos/shared'
import { DomainError, NotFoundError, UnauthorizedError } from '../../common/errors/domain.error'
import { AuthRepository, type SessionRow } from './auth.repository'
import { LoginAttemptTracker } from './login-attempt.tracker'
import { generateSessionToken, hashSessionToken } from './token.util'

export interface LoginResult {
  token: string
  user: CurrentUser
}

export interface LoginMeta {
  ip: string
  userAgent: string | null
}

export interface ResolvedSession {
  userId: string
  sessionId: string
}

export class TooManyAttemptsError extends DomainError {
  constructor() {
    super('TOO_MANY_ATTEMPTS', 'Muitas tentativas. Aguarde alguns minutos e tente de novo.', 429)
  }
}

// Mensagem sempre genérica — nunca diferenciar "e-mail não existe" de "senha errada" (08-seguranca § 4).
const INVALID_CREDENTIALS = () => new UnauthorizedError('INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')

@Injectable()
export class AuthService implements OnModuleInit {
  // Hash fictício verificado quando o e-mail não existe, para o tempo de resposta não revelar quais
  // contas são reais (08-seguranca § 4: "tempo de resposta equalizado").
  private dummyHash = ''
  private readonly idleDays: number

  constructor(
    private readonly repo: AuthRepository,
    private readonly attempts: LoginAttemptTracker,
    config: ConfigService,
  ) {
    this.idleDays = config.get<number>('SESSION_IDLE_DAYS', 30)
  }

  async onModuleInit(): Promise<void> {
    this.dummyHash = await argon2.hash('a-password-that-never-matches-anything', { type: argon2.argon2id })
  }

  async login(input: LoginInput, meta: LoginMeta): Promise<LoginResult> {
    const emailKey = `email:${input.email}`
    const ipKey = `ip:${meta.ip}`
    if (this.attempts.isLocked(emailKey) || this.attempts.isLocked(ipKey)) throw new TooManyAttemptsError()

    const user = await this.repo.findUserForLogin(input.email)
    const hash = user?.passwordHash ?? this.dummyHash
    const passwordMatches = await argon2.verify(hash, input.password)

    if (!user || !passwordMatches) {
      this.attempts.recordFailure(emailKey)
      this.attempts.recordFailure(ipKey)
      throw INVALID_CREDENTIALS()
    }
    this.attempts.reset(emailKey)
    this.attempts.reset(ipKey)

    const { token, tokenHash } = generateSessionToken()
    await this.repo.createSession({ userId: user.id, tokenHash, userAgent: meta.userAgent })
    return { token, user: { id: user.id, email: user.email } }
  }

  // Chamado pelo SessionMiddleware a cada request; nunca lança — sessão inválida só significa "sem
  // contexto", quem decide se isso é um problema é o AuthGuard (rota pública x fechada).
  async resolveSession(token: string): Promise<ResolvedSession | null> {
    const session = await this.repo.findValidSession(hashSessionToken(token), this.idleCutoff())
    if (!session) return null
    await this.repo.touchSession(session.id)
    return { userId: session.userId, sessionId: session.id }
  }

  async logout(sessionId: string): Promise<void> {
    await this.repo.revokeSession(sessionId)
  }

  async me(userId: string): Promise<CurrentUser> {
    const user = await this.repo.findUserById(userId)
    if (!user) throw new UnauthorizedError('INVALID_SESSION', 'Sessão inválida. Faça login novamente.')
    return user
  }

  listSessions(userId: string): Promise<SessionRow[]> {
    return this.repo.listActiveSessions(userId, this.idleCutoff())
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const result = await this.repo.revokeSessionForUser(sessionId, userId)
    if (result.count === 0) throw new NotFoundError('SESSION_NOT_FOUND', 'Sessão não encontrada.')
  }

  private idleCutoff(): Date {
    return new Date(Date.now() - this.idleDays * 24 * 60 * 60 * 1000)
  }
}
