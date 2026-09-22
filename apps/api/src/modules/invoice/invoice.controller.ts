import { Controller, Get, Query } from '@nestjs/common'
import type { Invoice } from '@gastos/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { DomainError } from '../../common/errors/domain.error'
import { InvoiceService } from './invoice.service'

@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoices: InvoiceService) {}

  @Get()
  getForAccount(
    @CurrentUser() userId: string,
    @Query('accountId') accountId?: string,
    @Query('month') month?: string,
  ): Promise<Invoice> {
    if (!accountId) throw new DomainError('ACCOUNT_ID_REQUIRED', 'Informe accountId.', 400)
    return this.invoices.getForAccount(userId, accountId, month)
  }

  @Get('summary')
  getSummary(@CurrentUser() userId: string, @Query('month') month?: string): Promise<Invoice> {
    return this.invoices.getSummary(userId, month)
  }
}
