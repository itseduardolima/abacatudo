import { Controller, Get, Query } from '@nestjs/common'
import type { SpendingReport } from '@gastos/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { InsightService } from './insight.service'

@Controller('insights')
export class InsightController {
  constructor(private readonly insights: InsightService) {}

  @Get('spending')
  spendingReport(@CurrentUser() userId: string, @Query('month') month?: string): Promise<SpendingReport> {
    return this.insights.spendingReport(userId, month)
  }
}
