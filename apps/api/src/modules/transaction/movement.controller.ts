import { Controller, Get, Query } from '@nestjs/common'
import type { Transaction } from '@gastos/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { MovementService } from './movement.service'

@Controller('movements')
export class MovementController {
  constructor(private readonly movements: MovementService) {}

  @Get()
  list(@CurrentUser() userId: string, @Query('month') month?: string): Promise<Transaction[]> {
    return this.movements.listByMonth(userId, month)
  }
}
