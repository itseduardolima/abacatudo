import { Inject, Injectable } from '@nestjs/common'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'
import type { MappedTransaction } from './banking.mapper'

@Injectable()
export class BankingSyncRepository {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  // Upsert por [accountId, externalId] (idempotente: sincronizar de novo nunca duplica). personId só entra
  // na criação (padrão "Meu" ou Rule, ver banking.service.ts); o update nunca toca
  // categoryId/personId/note — são do usuário, o Pluggy não manda isso (03-regras-negocio).
  async upsertTransaction(userId: string, accountId: string, personId: string, data: MappedTransaction): Promise<void> {
    await this.prisma.transaction.upsert({
      where: { accountId_externalId: { accountId, externalId: data.externalId } },
      create: { ...data, accountId, userId, personId },
      update: {
        kind: data.kind,
        status: data.status,
        amountCents: data.amountCents,
        occurredAt: data.occurredAt,
        description: data.description,
        merchant: data.merchant,
        cardLast4: data.cardLast4,
        installmentNumber: data.installmentNumber,
        installmentTotal: data.installmentTotal,
        billId: data.billId,
      },
    })
  }
}
