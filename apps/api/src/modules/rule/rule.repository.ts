import { Inject, Injectable } from '@nestjs/common'
import type { Rule } from '@prisma/client'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'

@Injectable()
export class RuleRepository {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  findMany(userId: string): Promise<Rule[]> {
    return this.prisma.rule.findMany({ where: { userId } })
  }

  // "Sempre para este estabelecimento": uma regra por [userId, merchant] — corrigir de novo só troca a
  // pessoa da mesma regra, nunca duplica.
  upsert(userId: string, merchant: string, personId: string): Promise<Rule> {
    return this.prisma.rule.upsert({
      where: { userId_merchant: { userId, merchant } },
      create: { userId, merchant, personId },
      update: { personId },
    })
  }
}
