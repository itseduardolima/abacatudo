import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Req, Res } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Throttle } from '@nestjs/throttler'
import type { Request, Response } from 'express'
import type { CurrentUser as CurrentUserDto } from '@gastos/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { sessionCookieOptions } from '../../common/session-cookie'
import { SESSION_COOKIE, type RequestWithUser } from '../../common/types/request'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  // Defesa em profundidade além do LoginAttemptTracker (que é por e-mail/IP): limite bruto de tentativas
  // na rota, independente de quem está sendo atacado (08-seguranca § 5).
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<CurrentUserDto> {
    const { token, user } = await this.auth.login(body, {
      ip: request.ip ?? 'unknown',
      userAgent: request.get('user-agent') ?? null,
    })
    response.cookie(SESSION_COOKIE, token, sessionCookieOptions(this.config))
    return user
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() request: RequestWithUser, @Res({ passthrough: true }) response: Response): Promise<void> {
    if (request.sessionId) await this.auth.logout(request.sessionId)
    // clearCookie precisa dos mesmos atributos usados para setar (exceto maxAge) para o navegador casar o cookie.
    const { maxAge: _maxAge, ...options } = sessionCookieOptions(this.config)
    response.clearCookie(SESSION_COOKIE, options)
  }

  @Get('me')
  me(@CurrentUser() userId: string): Promise<CurrentUserDto> {
    return this.auth.me(userId)
  }

  @Get('sessions')
  listSessions(@CurrentUser() userId: string) {
    return this.auth.listSessions(userId)
  }

  @Delete('sessions/:id')
  @HttpCode(204)
  revokeSession(@CurrentUser() userId: string, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.auth.revokeSession(userId, id)
  }
}
