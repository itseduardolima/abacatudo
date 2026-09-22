import { Injectable } from '@nestjs/common'
import type { Transaction } from '@gastos/shared'
import { monthKey, monthRange } from '../../common/date/timezone'
import { DomainError } from '../../common/errors/domain.error'
import { toTransactionDto } from './transaction.mapper'
import { TransactionRepository } from './transaction.repository'

@Injectable()
export class TransactionService {
  constructor(private readonly repo: TransactionRepository) {}

  async listByMonth(userId: string, month?: string): Promise<Transaction[]> {
    const key = month ?? monthKey(new Date())
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) {
      throw new DomainError('INVALID_MONTH', 'Mês inválido (esperado AAAA-MM).', 400)
    }
    return (await this.repo.findMany(userId, monthRange(key))).map(toTransactionDto)
  }
}
