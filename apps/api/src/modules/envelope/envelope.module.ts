import { Module } from '@nestjs/common'
import { BudgetModule } from '../budget/budget.module'
import { CategoryModule } from '../category/category.module'
import { EnvelopeController } from './envelope.controller'
import { EnvelopeRepository } from './envelope.repository'
import { EnvelopeService } from './envelope.service'

@Module({
  imports: [BudgetModule, CategoryModule],
  controllers: [EnvelopeController],
  providers: [EnvelopeService, EnvelopeRepository],
})
export class EnvelopeModule {}
