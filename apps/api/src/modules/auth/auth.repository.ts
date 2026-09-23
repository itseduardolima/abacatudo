import { Inject, Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'

export type UserForLogin = { id: string; email: string; passwordHash: string }
export type SessionRow = { id: string; userAgent: string | null; createdAt: Date; lastUsedAt: Date }

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

  listActiveSessions(userId: string, idleCutoff: Date): Promise<SessionRow[]> {
    return this.prisma.session.findMany({
      where: { userId, revokedAt: null, lastUsedAt: { gte: idleCutoff } },
      select: { id: true, userAgent: true, createdAt: true, lastUsedAt: true },
      orderBy: { lastUsedAt: 'desc' },
    })
  }
}
