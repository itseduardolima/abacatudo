import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Req, Res } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Throttle } from '@nestjs/throttler'
import type { Request, Response } from 'express'
import type { CurrentUser as CurrentUserDto, ResetTokenInfo } from '@gastos/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { sessionCookieOptions } from '../../common/session-cookie'
import { SESSION_COOKIE, type RequestWithUser } from '../../common/types/request'
import { AuthService } from './auth.service'
import { ChangePasswordDto } from './dto/change-password.dto'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { LoginDto } from './dto/login.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'

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

  @Patch('profile')
  updateProfile(@CurrentUser() userId: string, @Body() body: UpdateProfileDto): Promise<CurrentUserDto> {
    return this.auth.updateProfile(userId, body)
  }

  // Defesa em profundidade extra (além do login): trocar senha é um alvo natural de força bruta contra a
  // senha atual — limite mais apertado que o resto da API.
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @Patch('password')
  @HttpCode(204)
  changePassword(@CurrentUser() userId: string, @Req() request: RequestWithUser, @Body() body: ChangePasswordDto) {
    return this.auth.changePassword(userId, request.sessionId ?? '', body)
  }

  // As 3 rotas abaixo são anônimas por definição (o token na URL/body é a autorização) — @Public() pra
  // pular o AuthGuard, sem sessão nenhuma envolvida.
  @Public()
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @Post('forgot-password')
  @HttpCode(204)
  forgotPassword(@Body() body: ForgotPasswordDto): Promise<void> {
    return this.auth.forgotPassword(body.email)
  }

  @Public()
  @Get('reset-token/:token')
  inspectResetToken(@Param('token') token: string): Promise<ResetTokenInfo> {
    return this.auth.inspectResetToken(token)
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 900_000 } })
  @Post('reset-password')
  @HttpCode(204)
  resetPassword(@Body() body: ResetPasswordDto): Promise<void> {
    return this.auth.resetPassword(body.token, body.newPassword)
  }
}
