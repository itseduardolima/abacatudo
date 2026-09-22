import { Inject, Injectable } from '@nestjs/common'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'
import type { InvoiceRow } from './invoice.mapper'

@Injectable()
export class InvoiceRepository {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  // EXPENSE/REFUND só de conta CREDIT_CARD — CARD_PAYMENT nunca entra na fatura (03-regras-negocio §
  // Movimentações: a linha de pagamento é excluída do gasto).
  async findRows(userId: string, range: { start: Date; end: Date }, accountId?: string): Promise<InvoiceRow[]> {
    const rows = await this.prisma.transaction.findMany({
      where: {
        userId,
        occurredAt: { gte: range.start, lt: range.end },
        kind: { in: ['EXPENSE', 'REFUND'] },
        account: { type: 'CREDIT_CARD', ...(accountId ? { id: accountId } : {}) },
      },
      include: { splits: { select: { personId: true, amountCents: true } } },
    })
    return rows.map((row) => ({
      kind: row.kind as 'EXPENSE' | 'REFUND',
      amountCents: row.amountCents,
      personId: row.personId,
      splits: row.splits,
    }))
  }
}
