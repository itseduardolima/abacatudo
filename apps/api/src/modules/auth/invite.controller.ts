import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { InviteCreated, InviteInfo } from '@gastos/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { AcceptInviteDto } from './dto/accept-invite.dto'
import { InviteService } from './invite.service'

@Controller('auth/invites')
export class InviteController {
  constructor(private readonly invites: InviteService) {}

  @Post()
  create(@CurrentUser() userId: string): Promise<InviteCreated> {
    return this.invites.create(userId)
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 900_000 } })
  @Post('accept')
  @HttpCode(204)
  accept(@Body() body: AcceptInviteDto): Promise<void> {
    return this.invites.accept(body)
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 900_000 } })
  @Get(':token')
  inspect(@Param('token') token: string): Promise<InviteInfo> {
    return this.invites.inspect(token)
  }
}
