import { Inject, Injectable } from '@nestjs/common'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'
import type { SpendingRow } from './insight.mapper'

@Injectable()
export class InsightRepository {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  // Só compra no cartão entra no relatório (03-regras-negocio § Relatórios e insights); EXPENSE/REFUND
  // netados como na fatura — CARD_PAYMENT nunca é gasto.
  async findSpendingRows(userId: string, range: { start: Date; end: Date }): Promise<SpendingRow[]> {
    const rows = await this.prisma.transaction.findMany({
      where: {
        userId,
        occurredAt: { gte: range.start, lt: range.end },
        kind: { in: ['EXPENSE', 'REFUND'] },
        account: { type: 'CREDIT_CARD' },
      },
      include: {
        category: { select: { name: true } },
        person: { select: { name: true } },
        splits: { select: { personId: true, amountCents: true, person: { select: { name: true } } } },
      },
    })
    return rows.map((row) => ({
      kind: row.kind as 'EXPENSE' | 'REFUND',
      amountCents: row.amountCents,
      categoryId: row.categoryId,
      categoryName: row.category?.name ?? null,
      merchant: row.merchant,
      personId: row.personId,
      personName: row.person?.name ?? null,
      splits: row.splits.map((split) => ({
        personId: split.personId,
        personName: split.person.name,
        amountCents: split.amountCents,
      })),
    }))
  }
}
