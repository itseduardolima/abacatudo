import { Inject, Injectable } from '@nestjs/common'
import type { Account, Prisma } from '@prisma/client'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'

// "Última atualização" (8.6) é do PluggyItem, não da própria linha da conta — conta manual nunca tem
// (lastSyncAt fica null pra ela); ver AccountService.toDto.
export type AccountWithLastSync = Account & { pluggyItem: { lastSyncAt: Date | null } | null }

@Injectable()
export class AccountRepository {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  create(userId: string, data: Omit<Prisma.AccountUncheckedCreateInput, 'userId'>): Promise<Account> {
    return this.prisma.account.create({ data: { ...data, userId } })
  }

  findMany(userId: string, includeArchived: boolean): Promise<AccountWithLastSync[]> {
    return this.prisma.account.findMany({
      where: { userId, ...(includeArchived ? {} : { archivedAt: null }) },
      orderBy: { createdAt: 'asc' },
      include: { pluggyItem: { select: { lastSyncAt: true } } },
    })
  }

  findById(userId: string, id: string): Promise<AccountWithLastSync | null> {
    return this.prisma.account.findFirst({
      where: { userId, id },
      include: { pluggyItem: { select: { lastSyncAt: true } } },
    })
  }

  // Upsert atômico por [userId, externalAccountId] (unique no schema) — sem isso, duas sincronizações
  // simultâneas do mesmo item podiam criar duas contas pra mesma conta real (find + create não é atômico).
  upsertFromSync(
    userId: string,
    externalAccountId: string,
    create: Omit<Prisma.AccountUncheckedCreateInput, 'userId' | 'externalAccountId'>,
    update: Prisma.AccountUpdateInput,
  ): Promise<Account> {
    return this.prisma.account.upsert({
      where: { userId_externalAccountId: { userId, externalAccountId } },
      create: { ...create, userId, externalAccountId },
      update,
    })
  }
}
