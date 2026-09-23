import { Module } from '@nestjs/common'
import { InvoiceModule } from '../invoice/invoice.module'
import { PersonModule } from '../person/person.module'
import { AlertRepository } from './alert.repository'
import { AlertService } from './alert.service'
import { BudgetMonthController } from './budget-month.controller'
import { BudgetMonthRepository } from './budget-month.repository'
import { BudgetMonthService } from './budget-month.service'
import { BudgetPaceController } from './budget-pace.controller'
import { BudgetPaceService } from './budget-pace.service'

@Module({
  imports: [PersonModule, InvoiceModule],
  controllers: [BudgetMonthController, BudgetPaceController],
  providers: [BudgetMonthService, BudgetMonthRepository, AlertService, AlertRepository, BudgetPaceService],
  exports: [BudgetMonthService, BudgetMonthRepository, AlertService],
})
export class BudgetModule {}
