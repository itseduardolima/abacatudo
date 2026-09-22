import { Inject, Injectable } from '@nestjs/common'
import type { Prisma, Transaction } from '@prisma/client'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'

// Só CREDIT_CARD (03-regras-negocio § Escopo) — o resto é MovementRepository, mesma tabela.
@Injectable()
export class TransactionRepository {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  findMany(userId: string, range: { start: Date; end: Date }): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: { userId, occurredAt: { gte: range.start, lt: range.end }, account: { type: 'CREDIT_CARD' } },
      orderBy: { occurredAt: 'desc' },
    })
  }

  findById(userId: string, id: string): Promise<Transaction | null> {
    return this.prisma.transaction.findFirst({ where: { userId, id, account: { type: 'CREDIT_CARD' } } })
  }

  async updatePerson(userId: string, id: string, personId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.transaction.updateMany({
      where: { userId, id, account: { type: 'CREDIT_CARD' } },
      data: { personId },
    })
  }
}
