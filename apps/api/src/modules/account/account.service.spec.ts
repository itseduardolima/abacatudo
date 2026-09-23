import type { Account as AccountRow, PluggyItemStatus } from '@prisma/client'
import { DomainError, NotFoundError } from '../../common/errors/domain.error'
import { AccountService } from './account.service'
import type { AccountRepository, AccountWithPluggyItem } from './account.repository'

function repoMock() {
  return {
    create: jest.fn(),
    findMany: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    clearBenefitAccountFlag: jest.fn(),
  } as unknown as jest.Mocked<AccountRepository>
}

function row(
  overrides: Partial<AccountRow> = {},
  pluggyItem: { lastSyncAt: Date | null; status: PluggyItemStatus } | null = null,
): AccountWithPluggyItem {
  return {
    id: 'acc-1',
    userId: 'user-1',
    name: 'Nubank',
    type: 'CREDIT_CARD',
    source: 'MANUAL',
    closingDay: 20,
    dueDay: 27,
    creditLimitCents: 500000,
    balanceCents: null,
    isBenefitAccount: false,
    pluggyItemId: null,
    externalAccountId: null,
    archivedAt: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
    pluggyItem,
  }
}

describe('AccountService', () => {
  it('create: passa o userId explícito para a Repository e devolve o DTO sem userId', async () => {
    const repo = repoMock()
    repo.create.mockResolvedValue(row())
    const service = new AccountService(repo)

    const result = await service.create('user-1', {
      name: 'Nubank',
      type: 'CREDIT_CARD',
      source: 'MANUAL',
      closingDay: 20,
      dueDay: 27,
      creditLimitCents: 500000,
    })

    expect(repo.create).toHaveBeenCalledWith('user-1', {
      name: 'Nubank',
      type: 'CREDIT_CARD',
      source: 'MANUAL',
      closingDay: 20,
      dueDay: 27,
      creditLimitCents: 500000,
    })
    expect(result).not.toHaveProperty('userId')
    expect(result.createdAt).toBe('2026-09-01T00:00:00.000Z')
  })

  it('create: campos de cartão ausentes viram null, nunca undefined', async () => {
    const repo = repoMock()
    repo.create.mockResolvedValue(row({ type: 'CHECKING', closingDay: null, dueDay: null, creditLimitCents: null }))
    const service = new AccountService(repo)

    await service.create('user-1', { name: 'Conta corrente', type: 'CHECKING', source: 'MANUAL' })

    expect(repo.create).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ closingDay: null, dueDay: null, creditLimitCents: null }),
    )
  })

  it('list: por padrão não inclui arquivadas', async () => {
    const repo = repoMock()
    repo.findMany.mockResolvedValue([row()])
    const service = new AccountService(repo)

    const result = await service.list('user-1', false)

    expect(repo.findMany).toHaveBeenCalledWith('user-1', false)
    expect(result).toHaveLength(1)
  })

  it('getById: 404 quando a conta não existe (ou não é do usuário)', async () => {
    const repo = repoMock()
    repo.findById.mockResolvedValue(null)
    const service = new AccountService(repo)

    await expect(service.getById('user-1', 'acc-de-outro')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('getById: devolve a conta encontrada', async () => {
    const repo = repoMock()
    repo.findById.mockResolvedValue(row())
    const service = new AccountService(repo)

    await expect(service.getById('user-1', 'acc-1')).resolves.toMatchObject({ id: 'acc-1', name: 'Nubank' })
  })

  it('lastSyncAt vem do PluggyItem por trás da conta (8.6)', async () => {
    const repo = repoMock()
    repo.findById.mockResolvedValue(
      row(
        { source: 'PLUGGY', pluggyItemId: 'item-1' },
        { lastSyncAt: new Date('2026-09-22T10:00:00.000Z'), status: 'UPDATED' },
      ),
    )
    const service = new AccountService(repo)

    const result = await service.getById('user-1', 'acc-1')

    expect(result.lastSyncAt).toBe('2026-09-22T10:00:00.000Z')
  })

  it('lastSyncAt é null pra conta manual (nunca sincroniza)', async () => {
    const repo = repoMock()
    repo.findById.mockResolvedValue(row())
    const service = new AccountService(repo)

    const result = await service.getById('user-1', 'acc-1')

    expect(result.lastSyncAt).toBeNull()
  })

  it('create: uma conta recém-criada nunca tem PluggyItem, lastSyncAt é null', async () => {
    const repo = repoMock()
    repo.create.mockResolvedValue(row())
    const service = new AccountService(repo)

    const result = await service.create('user-1', { name: 'Nubank', type: 'CREDIT_CARD', source: 'MANUAL' })

    expect(result.lastSyncAt).toBeNull()
  })

  it('disconnected é true quando o PluggyItem por trás foi desconectado (8.5)', async () => {
    const repo = repoMock()
    repo.findById.mockResolvedValue(
      row({ source: 'PLUGGY', pluggyItemId: 'item-1' }, { lastSyncAt: null, status: 'DISCONNECTED' }),
    )
    const service = new AccountService(repo)

    const result = await service.getById('user-1', 'acc-1')

    expect(result.disconnected).toBe(true)
  })

  it('disconnected é false pra conta manual e pra conta com PluggyItem ainda conectado', async () => {
    const repo = repoMock()
    repo.findById
      .mockResolvedValueOnce(row())
      .mockResolvedValueOnce(row({ source: 'PLUGGY', pluggyItemId: 'item-1' }, { lastSyncAt: null, status: 'UPDATED' }))
    const service = new AccountService(repo)

    expect((await service.getById('user-1', 'acc-1')).disconnected).toBe(false)
    expect((await service.getById('user-1', 'acc-1')).disconnected).toBe(false)
  })

  it('create: uma conta recém-criada nunca é desconectada', async () => {
    const repo = repoMock()
    repo.create.mockResolvedValue(row())
    const service = new AccountService(repo)

    const result = await service.create('user-1', { name: 'Nubank', type: 'CREDIT_CARD', source: 'MANUAL' })

    expect(result.disconnected).toBe(false)
  })

  describe('setBenefitAccount', () => {
    it('404 quando a conta não existe (ou não é do usuário)', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValue(null)
      const service = new AccountService(repo)

      await expect(service.setBenefitAccount('user-1', 'acc-1', true)).rejects.toBeInstanceOf(NotFoundError)
    })

    it('422 quando a conta não é CHECKING', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValue(row({ type: 'CREDIT_CARD' }))
      const service = new AccountService(repo)

      await expect(service.setBenefitAccount('user-1', 'acc-1', true)).rejects.toBeInstanceOf(DomainError)
      expect(repo.update).not.toHaveBeenCalled()
    })

    it('marcar: desmarca qualquer outra conta de benefício antes de marcar esta', async () => {
      const repo = repoMock()
      repo.findById
        .mockResolvedValueOnce(row({ type: 'CHECKING' }))
        .mockResolvedValueOnce(row({ type: 'CHECKING', isBenefitAccount: true, balanceCents: 15000 }))
      const service = new AccountService(repo)

      const result = await service.setBenefitAccount('user-1', 'acc-1', true)

      expect(repo.clearBenefitAccountFlag).toHaveBeenCalledWith('user-1')
      expect(repo.update).toHaveBeenCalledWith('user-1', 'acc-1', { isBenefitAccount: true })
      expect(result.isBenefitAccount).toBe(true)
      expect(result.balanceCents).toBe(15000)
    })

    it('desmarcar: não mexe nas outras contas', async () => {
      const repo = repoMock()
      repo.findById
        .mockResolvedValueOnce(row({ type: 'CHECKING', isBenefitAccount: true }))
        .mockResolvedValueOnce(row({ type: 'CHECKING', isBenefitAccount: false }))
      const service = new AccountService(repo)

      await service.setBenefitAccount('user-1', 'acc-1', false)

      expect(repo.clearBenefitAccountFlag).not.toHaveBeenCalled()
      expect(repo.update).toHaveBeenCalledWith('user-1', 'acc-1', { isBenefitAccount: false })
    })
  })
})
