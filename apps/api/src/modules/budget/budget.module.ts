import { Module } from '@nestjs/common'
import { PersonModule } from '../person/person.module'
import { AlertRepository } from './alert.repository'
import { AlertService } from './alert.service'
import { BudgetMonthController } from './budget-month.controller'
import { BudgetMonthRepository } from './budget-month.repository'
import { BudgetMonthService } from './budget-month.service'

@Module({
  imports: [PersonModule],
  controllers: [BudgetMonthController],
  providers: [BudgetMonthService, BudgetMonthRepository, AlertService, AlertRepository],
  exports: [BudgetMonthService, BudgetMonthRepository, AlertService],
})
export class BudgetModule {}
