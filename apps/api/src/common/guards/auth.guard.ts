import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PUBLIC_KEY } from '../decorators/public.decorator'
import { UnauthorizedError } from '../errors/domain.error'

// Global e FECHADO por padrão: toda rota que não for @Public() é recusada. A sessão real (cookie,
// tabela Session, userId no contexto) entra na Sprint 1; até lá nada além de /health responde.
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [context.getHandler(), context.getClass()])
    if (isPublic) return true
    throw new UnauthorizedError()
  }
}
