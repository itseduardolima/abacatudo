import { Controller, Get, Query } from '@nestjs/common'
import type { Transaction } from '@gastos/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { TransactionService } from './transaction.service'

@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactions: TransactionService) {}

  @Get()
  list(@CurrentUser() userId: string, @Query('month') month?: string): Promise<Transaction[]> {
    return this.transactions.listByMonth(userId, month)
  }
}
