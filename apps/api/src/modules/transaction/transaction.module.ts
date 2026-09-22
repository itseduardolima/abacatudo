import { Module } from '@nestjs/common'
import { PersonModule } from '../person/person.module'
import { RuleModule } from '../rule/rule.module'
import { MovementController } from './movement.controller'
import { MovementRepository } from './movement.repository'
import { MovementService } from './movement.service'
import { TransactionController } from './transaction.controller'
import { TransactionRepository } from './transaction.repository'
import { TransactionService } from './transaction.service'

@Module({
  imports: [PersonModule, RuleModule],
  controllers: [TransactionController, MovementController],
  providers: [TransactionService, TransactionRepository, MovementService, MovementRepository],
})
export class TransactionModule {}
