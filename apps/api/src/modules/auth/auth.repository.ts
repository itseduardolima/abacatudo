import { Inject, Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PRISMA, type PrismaService, setUserInTransaction } from '../../prisma/prisma.client'

export type UserForLogin = { id: string; email: string; passwordHash: string }
export type SessionRow = { id: string; userAgent: string | null; createdAt: Date; lastUsedAt: Date }
export type ResetTokenRow = {
  id: string
  userId: string
  expiresAt: Date
  usedAt: Date | null
  userEmail: string
}

// Único módulo que toca User e Session — as duas tabelas sem RLS (08-seguranca § 1). Reforçado por lint
// (eslint.config.mjs). Todo método aqui existe porque o Service precisa, nada de acesso genérico.
@Injectable()
export class AuthRepository {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  findUserForLogin(email: string): Promise<UserForLogin | null> {
    return this.prisma.user.findUnique({ where: { email }, select: { id: true, email: true, passwordHash: true } })
  }

  findUserById(id: string): Promise<{ id: string; email: string } | null> {
    return this.prisma.user.findUnique({ where: { id }, select: { id: true, email: true } })
  }

  findUserWithPasswordById(id: string): Promise<UserForLogin | null> {
    return this.prisma.user.findUnique({ where: { id }, select: { id: true, email: true, passwordHash: true } })
  }

  findUserByEmail(email: string): Promise<{ id: string } | null> {
    return this.prisma.user.findUnique({ where: { email }, select: { id: true } })
  }

  // Transação (não dois updates soltos): Person tem RLS, User não — setUserInTransaction dentro da mesma
  // transação cobre a escrita em Person. Exceção deliberada de "AuthRepository só toca User": perfil é
  // inerentemente as duas coisas juntas (e-mail é User, nome é a Person isSelf — não existe User.name,
  // mesmo dado nunca duplicado em duas tabelas).
  updateProfile(userId: string, data: { email: string; name: string }): Promise<{ id: string; email: string }> {
    return this.prisma.$transaction(async (tx) => {
      await setUserInTransaction(tx, userId)
      const user = await tx.user.update({
        where: { id: userId },
        data: { email: data.email },
        select: { id: true, email: true },
      })
      await tx.person.updateMany({ where: { userId, isSelf: true }, data: { name: data.name } })
      return user
    })
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } })
  }

  // Emitir um link novo invalida qualquer token não usado anterior do mesmo User (usedAt marcado, nunca
  // apagado — mantém rastro de quantos pedidos de reset existiram, útil pra investigar abuso).
  async createResetToken(data: { userId: string; tokenHash: string; expiresAt: Date }): Promise<{ id: string }> {
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: data.userId, usedAt: null },
      data: { usedAt: new Date() },
    })
    return this.prisma.passwordResetToken.create({ data, select: { id: true } })
  }

  async findResetToken(tokenHash: string): Promise<ResetTokenRow | null> {
    const row = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { email: true } } },
    })
    if (!row) return null
    return { id: row.id, userId: row.userId, expiresAt: row.expiresAt, usedAt: row.usedAt, userEmail: row.user.email }
  }

  // Queima o token, grava a senha nova e derruba toda sessão aberta — tudo na mesma transação (um crash no
  // meio nunca deixa "senha trocada, token ainda válido" nem "senha trocada, sessão antiga sobrevivendo").
  // Sempre TODAS as sessões aqui (sem `exceptSessionId`): quem passou pelo reset não tinha sessão nenhuma.
  async consumeResetToken(tokenId: string, userId: string, passwordHash: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await setUserInTransaction(tx, userId)
      await tx.passwordResetToken.update({ where: { id: tokenId }, data: { usedAt: new Date() } })
      await tx.user.update({ where: { id: userId }, data: { passwordHash } })
      await tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })
    })
  }

  createSession(data: { userId: string; tokenHash: string; userAgent: string | null }): Promise<{ id: string }> {
    return this.prisma.session.create({ data, select: { id: true } })
  }

  findValidSession(tokenHash: string, idleCutoff: Date): Promise<{ id: string; userId: string } | null> {
    return this.prisma.session.findFirst({
      where: { tokenHash, revokedAt: null, lastUsedAt: { gte: idleCutoff } },
      select: { id: true, userId: true },
    })
  }

  // Sem `userId` no where (auditoria de segurança 2026-09-23, achado de baixa severidade): seguro só porque
  // NENHUM dos dois chamadores aceita um id vindo do cliente. `touchSession` só recebe o id que
  // `findValidSession` acabou de devolver (mesma chamada de `resolveSession`, nunca um id solto — testado em
  // `auth.service.spec.ts` § resolveSession, `touchSession` sempre chamado com o id da sessão validada).
  touchSession(id: string): Promise<Prisma.BatchPayload> {
    // updateMany (não update): se a sessão tiver sido revogada por outra aba entre o find e o touch, não
    // deve reviver nem lançar "record not found" — vira um no-op silencioso.
    return this.prisma.session.updateMany({ where: { id, revokedAt: null }, data: { lastUsedAt: new Date() } })
  }

  // `revokeSession` só é chamado por `AuthService.logout(request.sessionId)`, e `request.sessionId` é
  // escrito só pelo `SessionMiddleware` depois de validar o cookie — o controller não tem `@Body()`/`@Param()`
  // pra sessionId, então não existe caminho pra um cliente forjar outra sessão aqui (testado em
  // `auth.controller.spec.ts`). Revogar a sessão de outra pessoa por id passa sempre por
  // `revokeSessionForUser`, que filtra por `userId`.
  revokeSession(id: string): Promise<Prisma.BatchPayload> {
    return this.prisma.session.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } })
  }

  // updateMany com userId na cláusula: "não existe" e "não é sua" resultam no mesmo count=0 — o Service
  // decide o que responder sem a Repository vazar qual dos dois casos era.
  revokeSessionForUser(id: string, userId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.session.updateMany({ where: { id, userId, revokedAt: null }, data: { revokedAt: new Date() } })
  }

  // Trocar a senha (por perfil ou por reset) invalida toda sessão aberta — inclusive a de quem trocou, no
  // caso do reset (a pessoa nem estava logada). No caso do perfil, `exceptSessionId` mantém a aba atual
  // logada (mudar a própria senha não devia derrubar quem acabou de fazer isso).
  revokeAllSessions(userId: string, exceptSessionId?: string): Promise<Prisma.BatchPayload> {
    return this.prisma.session.updateMany({
      where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
      data: { revokedAt: new Date() },
    })
  }

  listActiveSessions(userId: string, idleCutoff: Date): Promise<SessionRow[]> {
    return this.prisma.session.findMany({
      where: { userId, revokedAt: null, lastUsedAt: { gte: idleCutoff } },
      select: { id: true, userAgent: true, createdAt: true, lastUsedAt: true },
      orderBy: { lastUsedAt: 'desc' },
    })
  }
}
