import { Inject, Injectable } from '@nestjs/common'
import type { Transaction } from '@prisma/client'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'

// Tudo que não é CREDIT_CARD (03-regras-negocio § Escopo): só consulta, sem categoria/pessoa/orçamento/IA.
@Injectable()
export class MovementRepository {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  findMany(userId: string, range: { start: Date; end: Date }): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: { userId, occurredAt: { gte: range.start, lt: range.end }, account: { type: { not: 'CREDIT_CARD' } } },
      orderBy: { occurredAt: 'desc' },
    })
  }
}
