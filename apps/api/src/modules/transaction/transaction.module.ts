import { Module } from '@nestjs/common'
import { PersonModule } from '../person/person.module'
import { RuleModule } from '../rule/rule.module'
import { SplitModule } from '../split/split.module'
import { MovementController } from './movement.controller'
import { MovementRepository } from './movement.repository'
import { MovementService } from './movement.service'
import { SplitService } from './split.service'
import { TransactionController } from './transaction.controller'
import { TransactionRepository } from './transaction.repository'
import { TransactionService } from './transaction.service'

@Module({
  imports: [PersonModule, RuleModule, SplitModule],
  controllers: [TransactionController, MovementController],
  providers: [TransactionService, TransactionRepository, MovementService, MovementRepository, SplitService],
})
export class TransactionModule {}
