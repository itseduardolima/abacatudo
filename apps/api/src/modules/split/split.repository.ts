import { Inject, Injectable } from '@nestjs/common'
import type { Split } from '@prisma/client'
import { PRISMA, setUserInTransaction, type PrismaService } from '../../prisma/prisma.client'

@Injectable()
export class SplitRepository {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  findMany(userId: string, transactionId: string): Promise<Split[]> {
    return this.prisma.split.findMany({ where: { userId, transactionId } })
  }

  // Sem tocar em Transaction.personId — quem chama (ex.: corrigir a pessoa direto) já cuida disso.
  async deleteAll(userId: string, transactionId: string): Promise<void> {
    await this.prisma.split.deleteMany({ where: { userId, transactionId } })
  }

  // Atômico: zera personId (a transação passa a valer pela soma dos splits) e substitui os splits
  // inteiros — nunca mistura splits antigos com novos.
  async replaceAll(
    userId: string,
    transactionId: string,
    splits: { personId: string; amountCents: number }[],
  ): Promise<Split[]> {
    return this.prisma.$transaction(async (tx) => {
      await setUserInTransaction(tx, userId)
      await tx.transaction.updateMany({ where: { userId, id: transactionId }, data: { personId: null } })
      await tx.split.deleteMany({ where: { userId, transactionId } })
      await tx.split.createMany({
        data: splits.map((split) => ({ userId, transactionId, ...split })),
      })
      return tx.split.findMany({ where: { userId, transactionId } })
    })
  }

  // Desfaz a divisão: remove os splits e devolve a transação pra um dono só.
  async clear(userId: string, transactionId: string, personId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await setUserInTransaction(tx, userId)
      await tx.split.deleteMany({ where: { userId, transactionId } })
      await tx.transaction.updateMany({ where: { userId, id: transactionId }, data: { personId } })
    })
  }
}
