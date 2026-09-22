import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common'
import type { Transaction } from '@gastos/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { UpdateTransactionPersonDto } from './dto/update-transaction-person.dto'
import { TransactionService } from './transaction.service'

@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactions: TransactionService) {}

  @Get()
  list(@CurrentUser() userId: string, @Query('month') month?: string): Promise<Transaction[]> {
    return this.transactions.listByMonth(userId, month)
  }

  @Patch(':id/person')
  updatePerson(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateTransactionPersonDto,
  ): Promise<Transaction> {
    return this.transactions.updatePerson(userId, id, body)
  }
}
