import { Inject, Injectable } from '@nestjs/common'
import type { AlertThreshold } from '@gastos/shared'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'
import type { AlertExpenseRow } from './alert.mapper'

@Injectable()
export class AlertRepository {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  // Só EXPENSE de cartão de crédito entra no orçamento — nunca REFUND, nunca CARD_PAYMENT, nunca fora de
  // cartão (03-regras-negocio § Orçamento mensal; diferente da fatura, que também neteia REFUND).
  // categoryId opcional: sem ele, devolve todas as categorias do mês numa query só (usado no `list`, que
  // precisa do total E do por-categoria ao mesmo tempo).
  async findExpenseRows(
    userId: string,
    range: { start: Date; end: Date },
    categoryId?: string,
  ): Promise<AlertExpenseRow[]> {
    const rows = await this.prisma.transaction.findMany({
      where: {
        userId,
        occurredAt: { gte: range.start, lt: range.end },
        kind: 'EXPENSE',
        account: { type: 'CREDIT_CARD' },
        ...(categoryId ? { categoryId } : {}),
      },
      include: { splits: { select: { personId: true, amountCents: true } } },
    })
    return rows.map((row) => ({
      categoryId: row.categoryId,
      amountCents: row.amountCents,
      personId: row.personId,
      splits: row.splits,
    }))
  }

  async findFiredEnvelopeThresholds(userId: string, envelopeId: string): Promise<AlertThreshold[]> {
    const rows = await this.prisma.envelopeAlert.findMany({
      where: { userId, envelopeId },
      select: { threshold: true },
    })
    return rows.map((row) => row.threshold as AlertThreshold)
  }

  // Idempotente: a linha existir É o "já disparou" (@@unique trava, update vazio não muda nada se já tinha
  // disparado — mesmo padrão do createIfMissing do BudgetMonth).
  async recordEnvelopeThreshold(userId: string, envelopeId: string, threshold: AlertThreshold): Promise<void> {
    await this.prisma.envelopeAlert.upsert({
      where: { envelopeId_threshold: { envelopeId, threshold } },
      create: { userId, envelopeId, threshold },
      update: {},
    })
  }

  async findFiredBudgetMonthThresholds(userId: string, budgetMonthId: string): Promise<AlertThreshold[]> {
    const rows = await this.prisma.budgetMonthAlert.findMany({
      where: { userId, budgetMonthId },
      select: { threshold: true },
    })
    return rows.map((row) => row.threshold as AlertThreshold)
  }

  async recordBudgetMonthThreshold(userId: string, budgetMonthId: string, threshold: AlertThreshold): Promise<void> {
    await this.prisma.budgetMonthAlert.upsert({
      where: { budgetMonthId_threshold: { budgetMonthId, threshold } },
      create: { userId, budgetMonthId, threshold },
      update: {},
    })
  }
}
