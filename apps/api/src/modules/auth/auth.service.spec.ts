import type { ConfigService } from '@nestjs/config'
import argon2 from 'argon2'
import { NotFoundError, UnauthorizedError } from '../../common/errors/domain.error'
import type { AuthRepository } from './auth.repository'
import { AuthService, TooManyAttemptsError } from './auth.service'
import { LoginAttemptTracker } from './login-attempt.tracker'
import { hashSessionToken } from './token.util'

function repoMock() {
  return {
    findUserForLogin: jest.fn(),
    findUserById: jest.fn(),
    createSession: jest.fn(),
    findValidSession: jest.fn(),
    touchSession: jest.fn(),
    revokeSession: jest.fn(),
    revokeSessionForUser: jest.fn(),
    listActiveSessions: jest.fn(),
  } as unknown as jest.Mocked<AuthRepository>
}

function configMock(idleDays = 30) {
  return { get: jest.fn().mockReturnValue(idleDays) } as unknown as ConfigService
}

const META = { ip: '203.0.113.10', userAgent: 'jest' }

async function service(repo = repoMock(), attempts = new LoginAttemptTracker(), idleDays = 30) {
  const svc = new AuthService(repo, attempts, configMock(idleDays))
  await svc.onModuleInit()
  return { svc, repo, attempts }
}

describe('AuthService.login', () => {
  it('com credenciais corretas, cria a sessão e devolve token + usuário (sem passwordHash)', async () => {
    const passwordHash = await argon2.hash('correct horse battery staple', { type: argon2.argon2id })
    const repo = repoMock()
    repo.findUserForLogin.mockResolvedValue({ id: 'user-1', email: 'a@b.com', passwordHash })
    repo.createSession.mockResolvedValue({ id: 'session-1' })
    const { svc } = await service(repo)

    const result = await svc.login({ email: 'a@b.com', password: 'correct horse battery staple' }, META)

    expect(result.user).toEqual({ id: 'user-1', email: 'a@b.com' })
    expect(result.token).toHaveLength(43) // 32 bytes em base64url
    expect(repo.createSession).toHaveBeenCalledWith({
      userId: 'user-1',
      tokenHash: hashSessionToken(result.token),
      userAgent: 'jest',
    })
  })

  it('senha errada: erro genérico, sem dizer que o e-mail existe', async () => {
    const passwordHash = await argon2.hash('a-senha-certa', { type: argon2.argon2id })
    const repo = repoMock()
    repo.findUserForLogin.mockResolvedValue({ id: 'user-1', email: 'a@b.com', passwordHash })
    const { svc } = await service(repo)

    await expect(svc.login({ email: 'a@b.com', password: 'errada' }, META)).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      message: 'E-mail ou senha incorretos.',
      statusCode: 401,
    })
  })

  it('e-mail inexistente: mesmo erro genérico, e ainda assim faz um argon2.verify (tempo equalizado)', async () => {
    const repo = repoMock()
    repo.findUserForLogin.mockResolvedValue(null)
    const verifySpy = jest.spyOn(argon2, 'verify')
    const { svc } = await service(repo)

    await expect(svc.login({ email: 'nao-existe@b.com', password: 'qualquer' }, META)).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    })
    expect(verifySpy).toHaveBeenCalled()
    verifySpy.mockRestore()
  })

  it('bloqueia depois de 5 falhas do mesmo e-mail, mesmo trocando de IP', async () => {
    const repo = repoMock()
    repo.findUserForLogin.mockResolvedValue(null)
    const { svc } = await service(repo)

    for (let i = 0; i < 5; i++) {
      await svc
        .login({ email: 'alvo@b.com', password: 'x' }, { ip: `10.0.0.${i}`, userAgent: null })
        .catch(() => undefined)
    }

    await expect(
      svc.login({ email: 'alvo@b.com', password: 'x' }, { ip: '10.0.0.99', userAgent: null }),
    ).rejects.toBeInstanceOf(TooManyAttemptsError)
  })

  it('bloqueia depois de 5 falhas do mesmo IP, mesmo trocando de e-mail', async () => {
    const repo = repoMock()
    repo.findUserForLogin.mockResolvedValue(null)
    const { svc } = await service(repo)

    for (let i = 0; i < 5; i++) {
      await svc.login({ email: `alvo${i}@b.com`, password: 'x' }, META).catch(() => undefined)
    }

    await expect(svc.login({ email: 'outro@b.com', password: 'x' }, META)).rejects.toBeInstanceOf(TooManyAttemptsError)
  })

  it('login correto reseta o contador de falhas anteriores', async () => {
    const passwordHash = await argon2.hash('a-senha-certa', { type: argon2.argon2id })
    const repo = repoMock()
    repo.findUserForLogin.mockResolvedValue({ id: 'user-1', email: 'a@b.com', passwordHash })
    repo.createSession.mockResolvedValue({ id: 'session-1' })
    const { svc, attempts } = await service(repo)

    for (let i = 0; i < 4; i++) {
      repo.findUserForLogin.mockResolvedValueOnce({ id: 'user-1', email: 'a@b.com', passwordHash })
      await svc.login({ email: 'a@b.com', password: 'errada' }, META).catch(() => undefined)
    }
    await svc.login({ email: 'a@b.com', password: 'a-senha-certa' }, META)

    expect(attempts.isLocked('email:a@b.com')).toBe(false)
  })

  it('login bem-sucedido NÃO reseta o contador do IP (evita bypass do bloqueio por IP via login legítimo em outra conta)', async () => {
    const passwordHash = await argon2.hash('a-senha-certa', { type: argon2.argon2id })
    const repo = repoMock()
    repo.findUserForLogin.mockResolvedValue(null)
    const { svc, attempts } = await service(repo)

    // 4 tentativas falhas contra e-mails de OUTRAS pessoas, do mesmo IP do atacante.
    for (let i = 0; i < 4; i++) {
      await svc.login({ email: `vitima${i}@b.com`, password: 'x' }, META).catch(() => undefined)
    }

    // O atacante faz login de verdade na PRÓPRIA conta, pelo mesmo IP.
    repo.findUserForLogin.mockResolvedValueOnce({ id: 'user-1', email: 'atacante@b.com', passwordHash })
    repo.createSession.mockResolvedValueOnce({ id: 'session-1' })
    await svc.login({ email: 'atacante@b.com', password: 'a-senha-certa' }, META)

    // Se o contador do IP tivesse sido resetado pelo login legítimo, esta 5ª falha (contra mais uma
    // vítima) não bloquearia. O IP precisa continuar bloqueado assim que chegar ao limite de novo.
    repo.findUserForLogin.mockResolvedValue(null)
    await svc.login({ email: 'vitima-nova@b.com', password: 'x' }, META).catch(() => undefined)

    expect(attempts.isLocked(`ip:${META.ip}`)).toBe(true)
  })
})

describe('AuthService.resolveSession', () => {
  it('sessão válida: toca lastUsedAt e devolve userId + sessionId', async () => {
    const repo = repoMock()
    repo.findValidSession.mockResolvedValue({ id: 'session-1', userId: 'user-1' })
    const { svc } = await service(repo)

    await expect(svc.resolveSession('token-qualquer')).resolves.toEqual({ userId: 'user-1', sessionId: 'session-1' })
    expect(repo.touchSession).toHaveBeenCalledWith('session-1')
  })

  it('sessão inexistente, revogada ou expirada (fora da janela idle): devolve null, nunca lança', async () => {
    const repo = repoMock()
    repo.findValidSession.mockResolvedValue(null)
    const { svc } = await service(repo)

    await expect(svc.resolveSession('token-invalido')).resolves.toBeNull()
    expect(repo.touchSession).not.toHaveBeenCalled()
  })

  it('usa o corte de 30 dias por padrão para calcular a janela idle', async () => {
    const repo = repoMock()
    repo.findValidSession.mockResolvedValue(null)
    const now = Date.parse('2026-09-22T00:00:00.000Z')
    jest.spyOn(Date, 'now').mockReturnValue(now)
    const { svc } = await service(repo, new LoginAttemptTracker(), 30)

    await svc.resolveSession('t')

    const [, idleCutoff] = repo.findValidSession.mock.calls[0] as [string, Date]
    expect(idleCutoff.toISOString()).toBe('2026-08-23T00:00:00.000Z')
    jest.restoreAllMocks()
  })
})

describe('AuthService.logout/me/sessions', () => {
  it('logout revoga a sessão informada', async () => {
    const repo = repoMock()
    const { svc } = await service(repo)
    await svc.logout('session-1')
    expect(repo.revokeSession).toHaveBeenCalledWith('session-1')
  })

  it('me devolve o usuário sem passwordHash', async () => {
    const repo = repoMock()
    repo.findUserById.mockResolvedValue({ id: 'user-1', email: 'a@b.com' })
    const { svc } = await service(repo)
    await expect(svc.me('user-1')).resolves.toEqual({ id: 'user-1', email: 'a@b.com' })
  })

  it('me lança se o usuário sumiu (ex.: excluído entre requests)', async () => {
    const repo = repoMock()
    repo.findUserById.mockResolvedValue(null)
    const { svc } = await service(repo)
    await expect(svc.me('user-fantasma')).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('revokeSession de sessão de outro usuário (ou inexistente) devolve 404, nunca revoga', async () => {
    const repo = repoMock()
    repo.revokeSessionForUser.mockResolvedValue({ count: 0 })
    const { svc } = await service(repo)
    await expect(svc.revokeSession('user-1', 'session-de-outro')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('revokeSession da própria sessão funciona', async () => {
    const repo = repoMock()
    repo.revokeSessionForUser.mockResolvedValue({ count: 1 })
    const { svc } = await service(repo)
    await expect(svc.revokeSession('user-1', 'session-1')).resolves.toBeUndefined()
    expect(repo.revokeSessionForUser).toHaveBeenCalledWith('session-1', 'user-1')
  })

  it('listSessions repassa para a Repository', async () => {
    const repo = repoMock()
    repo.listActiveSessions.mockResolvedValue([])
    const { svc } = await service(repo)
    await svc.listSessions('user-1')
    expect(repo.listActiveSessions).toHaveBeenCalledWith('user-1', expect.any(Date))
  })
})
