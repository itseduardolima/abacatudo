import type { ConfigService } from '@nestjs/config'
import type { Request, Response } from 'express'
import type { RequestWithUser } from '../../common/types/request'
import { AuthController } from './auth.controller'
import type { AuthService } from './auth.service'

function authMock() {
  return {
    login: jest.fn(),
    logout: jest.fn(),
    me: jest.fn(),
    listSessions: jest.fn(),
    revokeSession: jest.fn(),
  } as unknown as jest.Mocked<AuthService>
}

function configMock() {
  return { get: jest.fn().mockReturnValue(30) } as unknown as ConfigService
}

function responseMock() {
  return { cookie: jest.fn(), clearCookie: jest.fn() } as unknown as jest.Mocked<Response>
}

describe('AuthController', () => {
  it('login: seta o cookie de sessão e devolve o usuário, nunca o token no corpo', async () => {
    const auth = authMock()
    auth.login.mockResolvedValue({ token: 'tok-123', user: { id: 'user-1', email: 'a@b.com' } })
    const response = responseMock()
    const request = { ip: '203.0.113.5', get: () => 'jest-agent' } as unknown as Request
    const controller = new AuthController(auth, configMock())

    const result = await controller.login({ email: 'a@b.com', password: 'x' }, request, response)

    expect(result).toEqual({ id: 'user-1', email: 'a@b.com' })
    expect(JSON.stringify(result)).not.toContain('tok-123')
    expect(response.cookie).toHaveBeenCalledWith(
      '__Host-gastos_session',
      'tok-123',
      expect.objectContaining({ httpOnly: true }),
    )
  })

  it('logout: revoga a sessão do request e limpa o cookie', async () => {
    const auth = authMock()
    const response = responseMock()
    const request = { sessionId: 'session-1' } as unknown as RequestWithUser
    const controller = new AuthController(auth, configMock())

    await controller.logout(request, response)

    expect(auth.logout).toHaveBeenCalledWith('session-1')
    expect(response.clearCookie).toHaveBeenCalledWith(
      '__Host-gastos_session',
      expect.not.objectContaining({ maxAge: expect.anything() }),
    )
  })

  it('logout sem sessionId no request não chama o Service (nada a revogar), mas ainda limpa o cookie', async () => {
    const auth = authMock()
    const response = responseMock()
    const request = {} as unknown as RequestWithUser
    const controller = new AuthController(auth, configMock())

    await controller.logout(request, response)

    expect(auth.logout).not.toHaveBeenCalled()
    expect(response.clearCookie).toHaveBeenCalled()
  })

  it('me repassa o userId do decorator para o Service', async () => {
    const auth = authMock()
    auth.me.mockResolvedValue({ id: 'user-1', email: 'a@b.com' })
    const controller = new AuthController(auth, configMock())
    await expect(controller.me('user-1')).resolves.toEqual({ id: 'user-1', email: 'a@b.com' })
    expect(auth.me).toHaveBeenCalledWith('user-1')
  })

  it('revokeSession repassa userId e o id validado como UUID pelo pipe', async () => {
    const auth = authMock()
    const controller = new AuthController(auth, configMock())
    await controller.revokeSession('user-1', '11111111-1111-1111-1111-111111111111')
    expect(auth.revokeSession).toHaveBeenCalledWith('user-1', '11111111-1111-1111-1111-111111111111')
  })
})
