import { Module } from '@nestjs/common'
import { AccountModule } from '../account/account.module'
import { BankingSyncRepository } from './banking-sync.repository'
import { BankingController } from './banking.controller'
import { BankingService } from './banking.service'
import { PluggyClient } from './pluggy/pluggy.client'
import { PluggyItemRepository } from './pluggy-item.repository'

@Module({
  imports: [AccountModule],
  controllers: [BankingController],
  providers: [BankingService, PluggyClient, PluggyItemRepository, BankingSyncRepository],
})
export class BankingModule {}
