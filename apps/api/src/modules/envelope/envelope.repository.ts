import { Inject, Injectable } from '@nestjs/common'
import type { BudgetMonth, Envelope, Prisma } from '@prisma/client'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'

export interface EnvelopeValues {
  amountCents: number | null
  percent: number | null
}

export type EnvelopeWithBudgetMonth = Envelope & { budgetMonth: BudgetMonth }

@Injectable()
export class EnvelopeRepository {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  findMany(userId: string, budgetMonthId: string): Promise<Envelope[]> {
    return this.prisma.envelope.findMany({ where: { userId, budgetMonthId } })
  }

  // Com o BudgetMonth junto — quem chama precisa do teto variável pra calcular capCents de um percentual.
  findById(userId: string, id: string): Promise<EnvelopeWithBudgetMonth | null> {
    return this.prisma.envelope.findFirst({ where: { userId, id }, include: { budgetMonth: true } })
  }

  create(userId: string, budgetMonthId: string, categoryId: string, values: EnvelopeValues): Promise<Envelope> {
    return this.prisma.envelope.create({ data: { ...values, userId, budgetMonthId, categoryId } })
  }

  async update(userId: string, id: string, values: EnvelopeValues): Promise<Prisma.BatchPayload> {
    return this.prisma.envelope.updateMany({ where: { userId, id }, data: values })
  }

  async delete(userId: string, id: string): Promise<Prisma.BatchPayload> {
    return this.prisma.envelope.deleteMany({ where: { userId, id } })
  }
}
