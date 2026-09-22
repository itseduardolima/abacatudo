import { Module } from '@nestjs/common'
import { AccountModule } from '../account/account.module'
import { PersonModule } from '../person/person.module'
import { RuleModule } from '../rule/rule.module'
import { BankingSyncRepository } from './banking-sync.repository'
import { BankingController } from './banking.controller'
import { BankingService } from './banking.service'
import { PluggyClient } from './pluggy/pluggy.client'
import { PluggyItemRepository } from './pluggy-item.repository'

@Module({
  imports: [AccountModule, PersonModule, RuleModule],
  controllers: [BankingController],
  providers: [BankingService, PluggyClient, PluggyItemRepository, BankingSyncRepository],
})
export class BankingModule {}
