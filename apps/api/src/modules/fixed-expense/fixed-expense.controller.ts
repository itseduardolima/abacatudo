import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common'
import type { FixedExpense } from '@gastos/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { CreateFixedExpenseDto } from './dto/create-fixed-expense.dto'
import { UpdateFixedExpenseDto } from './dto/update-fixed-expense.dto'
import { FixedExpenseService } from './fixed-expense.service'

@Controller('fixed-expenses')
export class FixedExpenseController {
  constructor(private readonly fixedExpenses: FixedExpenseService) {}

  @Post()
  create(@CurrentUser() userId: string, @Body() body: CreateFixedExpenseDto): Promise<FixedExpense> {
    return this.fixedExpenses.create(userId, body)
  }

  @Get()
  list(@CurrentUser() userId: string, @Query('includeArchived') includeArchived?: string): Promise<FixedExpense[]> {
    return this.fixedExpenses.list(userId, includeArchived === 'true')
  }

  @Patch(':id')
  update(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateFixedExpenseDto,
  ): Promise<FixedExpense> {
    return this.fixedExpenses.update(userId, id, body)
  }

  @Patch(':id/archive')
  @HttpCode(204)
  archive(@CurrentUser() userId: string, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.fixedExpenses.archive(userId, id)
  }

  @Put(':id/paid/:half')
  @HttpCode(204)
  markPaid(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('half', ParseIntPipe) half: number,
  ): Promise<void> {
    return this.fixedExpenses.markPaid(userId, id, half)
  }

  @Delete(':id/paid/:half')
  @HttpCode(204)
  unmarkPaid(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('half', ParseIntPipe) half: number,
  ): Promise<void> {
    return this.fixedExpenses.unmarkPaid(userId, id, half)
  }
}
