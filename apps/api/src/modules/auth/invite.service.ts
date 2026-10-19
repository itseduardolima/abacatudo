import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import argon2 from 'argon2'
import { Prisma } from '@prisma/client'
import type { AcceptInviteInput, InviteCreated, InviteInfo } from '@gastos/shared'
import { ConflictError, DomainError, ForbiddenError } from '../../common/errors/domain.error'
import { assertStrongPassword } from '../../common/security/password-policy'
import { AuthRepository, type InviteRow } from './auth.repository'
import { generateSessionToken, hashSessionToken } from './token.util'

const INVITE_TTL_MS = 72 * 60 * 60 * 1000

function invalidInvite(): DomainError {
  return new DomainError('INVALID_INVITE', 'Este convite não é válido ou já expirou. Peça um novo.', 400)
}

@Injectable()
export class InviteService {
  private readonly webOrigin: string

  constructor(
    private readonly repo: AuthRepository,
    config: ConfigService,
  ) {
    this.webOrigin = config.get<string>('WEB_ORIGIN', 'http://localhost:3000')
  }

  async create(userId: string): Promise<InviteCreated> {
    const user = await this.repo.findUserById(userId)
    if (user?.role !== 'ADMIN') throw new ForbiddenError('FORBIDDEN', 'Só o administrador pode convidar.')
    const { token, tokenHash } = generateSessionToken()
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS)
    await this.repo.createInvite({ invitedById: userId, tokenHash, expiresAt })
    return { link: `${this.webOrigin}/invite?token=${token}`, expiresAt: expiresAt.toISOString() }
  }

  async inspect(token: string): Promise<InviteInfo> {
    const invite = await this.requireUsable(token)
    return { expiresAt: invite.expiresAt.toISOString() }
  }

  async accept(input: AcceptInviteInput): Promise<void> {
    const invite = await this.requireUsable(input.token)
    assertStrongPassword(input.password)
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id })
    try {
      const accepted = await this.repo.acceptInvite({
        inviteId: invite.id,
        email: input.email,
        name: input.name,
        passwordHash,
      })
      if (!accepted) throw invalidInvite()
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictError('EMAIL_IN_USE', 'Já existe uma conta com esse e-mail.')
      }
      throw error
    }
  }

  private async requireUsable(token: string): Promise<InviteRow> {
    const invite = await this.repo.findInvite(hashSessionToken(token))
    if (!invite || invite.usedAt !== null || invite.expiresAt.getTime() <= Date.now()) throw invalidInvite()
    return invite
  }
}
