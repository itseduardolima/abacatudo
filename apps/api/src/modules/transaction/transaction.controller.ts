import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common'
import type { SplitPreview, Transaction } from '@gastos/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { PreviewSplitDto } from './dto/preview-split.dto'
import { UpdateTransactionPersonDto } from './dto/update-transaction-person.dto'
import { UpdateTransactionSplitDto } from './dto/update-transaction-split.dto'
import { SplitService } from './split.service'
import { TransactionService } from './transaction.service'

@Controller('transactions')
export class TransactionController {
  constructor(
    private readonly transactions: TransactionService,
    private readonly splits: SplitService,
  ) {}

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

  @Post(':id/split/preview')
  previewSplit(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: PreviewSplitDto,
  ): Promise<SplitPreview> {
    return this.splits.preview(userId, id, body.personIds)
  }

  @Put(':id/split')
  replaceSplit(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateTransactionSplitDto,
  ): Promise<Transaction> {
    return this.splits.replace(userId, id, body)
  }

  @Delete(':id/split')
  clearSplit(@CurrentUser() userId: string, @Param('id', ParseUUIDPipe) id: string): Promise<Transaction> {
    return this.splits.clear(userId, id)
  }
}
