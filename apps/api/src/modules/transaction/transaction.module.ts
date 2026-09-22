import { Module } from '@nestjs/common'
import { MovementController } from './movement.controller'
import { MovementRepository } from './movement.repository'
import { MovementService } from './movement.service'
import { TransactionController } from './transaction.controller'
import { TransactionRepository } from './transaction.repository'
import { TransactionService } from './transaction.service'

@Module({
  controllers: [TransactionController, MovementController],
  providers: [TransactionService, TransactionRepository, MovementService, MovementRepository],
})
export class TransactionModule {}
