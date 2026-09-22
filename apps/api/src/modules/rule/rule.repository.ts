import { Inject, Injectable } from '@nestjs/common'
import type { Rule } from '@prisma/client'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'

@Injectable()
export class RuleRepository {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  findMany(userId: string): Promise<Rule[]> {
    return this.prisma.rule.findMany({ where: { userId } })
  }
}
