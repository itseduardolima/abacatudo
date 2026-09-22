import { Module } from '@nestjs/common'
import { BudgetMonthController } from './budget-month.controller'
import { BudgetMonthRepository } from './budget-month.repository'
import { BudgetMonthService } from './budget-month.service'

@Module({
  controllers: [BudgetMonthController],
  providers: [BudgetMonthService, BudgetMonthRepository],
  exports: [BudgetMonthService, BudgetMonthRepository],
})
export class BudgetModule {}
