import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common'
import type { Account } from '@gastos/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AccountService } from './account.service'
import { CreateAccountDto } from './dto/create-account.dto'

@Controller('accounts')
export class AccountController {
  constructor(private readonly accounts: AccountService) {}

  @Post()
  create(@CurrentUser() userId: string, @Body() body: CreateAccountDto): Promise<Account> {
    return this.accounts.create(userId, body)
  }

  @Get()
  list(@CurrentUser() userId: string, @Query('includeArchived') includeArchived?: string): Promise<Account[]> {
    return this.accounts.list(userId, includeArchived === 'true')
  }

  @Get(':id')
  getById(@CurrentUser() userId: string, @Param('id', ParseUUIDPipe) id: string): Promise<Account> {
    return this.accounts.getById(userId, id)
  }
}
