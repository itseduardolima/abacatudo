import type { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Public } from '../decorators/public.decorator'
import { UnauthorizedError } from '../errors/domain.error'
import { AuthGuard } from './auth.guard'

class Ctrl {
  @Public()
  open() {}
  closed() {}
}

function contextFor(method: 'open' | 'closed'): ExecutionContext {
  return { getHandler: () => Ctrl.prototype[method], getClass: () => Ctrl } as unknown as ExecutionContext
}

describe('AuthGuard', () => {
  const guard = new AuthGuard(new Reflector())

  it('deixa passar rota @Public()', () => {
    expect(guard.canActivate(contextFor('open'))).toBe(true)
  })

  it('recusa por padrão qualquer rota sem @Public() (falha fechada)', () => {
    expect(() => guard.canActivate(contextFor('closed'))).toThrow(UnauthorizedError)
  })

  it('o erro é 401 UNAUTHENTICATED com mensagem em português', () => {
    try {
      guard.canActivate(contextFor('closed'))
      throw new Error('deveria ter lançado')
    } catch (error) {
      expect(error).toMatchObject({ statusCode: 401, code: 'UNAUTHENTICATED', message: 'Faça login para continuar.' })
    }
  })
})
