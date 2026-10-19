import { Inject, Injectable } from '@nestjs/common'
import type { FixedExpense, Prisma } from '@prisma/client'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'

@Injectable()
export class FixedExpenseRepository {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  create(userId: string, name: string, amountCents: number, half: number): Promise<FixedExpense> {
    return this.prisma.fixedExpense.create({ data: { userId, name, amountCents, half } })
  }

  findMany(userId: string, includeArchived: boolean): Promise<FixedExpense[]> {
    return this.prisma.fixedExpense.findMany({
      where: { userId, ...(includeArchived ? {} : { archivedAt: null }) },
      orderBy: { createdAt: 'asc' },
    })
  }

  update(
    userId: string,
    id: string,
    data: { name: string; amountCents: number; half: number },
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.fixedExpense.updateMany({ where: { userId, id, archivedAt: null }, data })
  }

  findById(userId: string, id: string): Promise<FixedExpense | null> {
    return this.prisma.fixedExpense.findFirst({ where: { userId, id } })
  }

  archive(userId: string, id: string): Promise<Prisma.BatchPayload> {
    return this.prisma.fixedExpense.updateMany({ where: { userId, id }, data: { archivedAt: new Date() } })
  }

  async findPaidIds(userId: string, month: string): Promise<Set<string>> {
    const rows = await this.prisma.fixedExpensePayment.findMany({
      where: { userId, month },
      select: { fixedExpenseId: true },
    })
    return new Set(rows.map((row) => row.fixedExpenseId))
  }

  markPaid(userId: string, fixedExpenseId: string, month: string): Promise<unknown> {
    return this.prisma.fixedExpensePayment.upsert({
      where: { fixedExpenseId_month: { fixedExpenseId, month } },
      create: { userId, fixedExpenseId, month },
      update: {},
    })
  }

  unmarkPaid(userId: string, fixedExpenseId: string, month: string): Promise<Prisma.BatchPayload> {
    return this.prisma.fixedExpensePayment.deleteMany({ where: { userId, fixedExpenseId, month } })
  }
}
