import { Inject, Injectable } from '@nestjs/common'
import type { Account, Prisma, PluggyItemStatus } from '@prisma/client'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'

// "Última atualização" (8.6) e "desconectada" (8.5) vêm do PluggyItem por trás da conta, não de campo
// próprio — conta manual nunca tem um (fica null pra ela); ver AccountService.toDto.
export type AccountWithPluggyItem = Account & {
  pluggyItem: { lastSyncAt: Date | null; status: PluggyItemStatus } | null
}

@Injectable()
export class AccountRepository {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  create(userId: string, data: Omit<Prisma.AccountUncheckedCreateInput, 'userId'>): Promise<Account> {
    return this.prisma.account.create({ data: { ...data, userId } })
  }

  findMany(userId: string, includeArchived: boolean): Promise<AccountWithPluggyItem[]> {
    return this.prisma.account.findMany({
      where: { userId, ...(includeArchived ? {} : { archivedAt: null }) },
      orderBy: { createdAt: 'asc' },
      include: { pluggyItem: { select: { lastSyncAt: true, status: true } } },
    })
  }

  findById(userId: string, id: string): Promise<AccountWithPluggyItem | null> {
    return this.prisma.account.findFirst({
      where: { userId, id },
      include: { pluggyItem: { select: { lastSyncAt: true, status: true } } },
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
