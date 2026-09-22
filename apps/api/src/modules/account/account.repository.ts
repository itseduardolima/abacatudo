import { Inject, Injectable } from '@nestjs/common'
import type { Account, Prisma } from '@prisma/client'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'

@Injectable()
export class AccountRepository {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  create(userId: string, data: Omit<Prisma.AccountUncheckedCreateInput, 'userId'>): Promise<Account> {
    return this.prisma.account.create({ data: { ...data, userId } })
  }

  findMany(userId: string, includeArchived: boolean): Promise<Account[]> {
    return this.prisma.account.findMany({
      where: { userId, ...(includeArchived ? {} : { archivedAt: null }) },
      orderBy: { createdAt: 'asc' },
    })
  }

  findById(userId: string, id: string): Promise<Account | null> {
    return this.prisma.account.findFirst({ where: { userId, id } })
  }

  findByExternalAccountId(userId: string, externalAccountId: string): Promise<Account | null> {
    return this.prisma.account.findFirst({ where: { userId, externalAccountId } })
  }

  async updateFromSync(userId: string, id: string, data: Prisma.AccountUpdateInput): Promise<void> {
    await this.prisma.account.updateMany({ where: { userId, id }, data })
  }
}
