import { LOGIN_WINDOW_MS, LoginAttemptTracker, MAX_LOGIN_ATTEMPTS } from './login-attempt.tracker'

describe('LoginAttemptTracker', () => {
  afterEach(() => jest.restoreAllMocks())

  it('não bloqueia uma chave nunca usada', () => {
    expect(new LoginAttemptTracker().isLocked('email:a@b.com')).toBe(false)
  })

  it(`bloqueia depois de ${MAX_LOGIN_ATTEMPTS} falhas na mesma janela`, () => {
    const tracker = new LoginAttemptTracker()
    for (let i = 0; i < MAX_LOGIN_ATTEMPTS - 1; i++) tracker.recordFailure('email:a@b.com')
    expect(tracker.isLocked('email:a@b.com')).toBe(false)
    tracker.recordFailure('email:a@b.com')
    expect(tracker.isLocked('email:a@b.com')).toBe(true)
  })

  it('reset libera a chave imediatamente', () => {
    const tracker = new LoginAttemptTracker()
    for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) tracker.recordFailure('email:a@b.com')
    tracker.reset('email:a@b.com')
    expect(tracker.isLocked('email:a@b.com')).toBe(false)
  })

  it('a janela expira depois de 15 minutos', () => {
    const tracker = new LoginAttemptTracker()
    const now = Date.now()
    jest.spyOn(Date, 'now').mockReturnValue(now)
    for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) tracker.recordFailure('email:a@b.com')
    expect(tracker.isLocked('email:a@b.com')).toBe(true)
    jest.spyOn(Date, 'now').mockReturnValue(now + LOGIN_WINDOW_MS)
    expect(tracker.isLocked('email:a@b.com')).toBe(false)
  })

  it('e-mail e IP são chaves independentes — bloquear uma não bloqueia a outra', () => {
    const tracker = new LoginAttemptTracker()
    for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) tracker.recordFailure('email:a@b.com')
    expect(tracker.isLocked('email:a@b.com')).toBe(true)
    expect(tracker.isLocked('ip:1.2.3.4')).toBe(false)
  })
})
