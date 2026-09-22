import type { Account as AccountRow } from '@prisma/client'
import { NotFoundError } from '../../common/errors/domain.error'
import { AccountService } from './account.service'
import type { AccountRepository, AccountWithLastSync } from './account.repository'

function repoMock() {
  return { create: jest.fn(), findMany: jest.fn(), findById: jest.fn() } as unknown as jest.Mocked<AccountRepository>
}

function row(
  overrides: Partial<AccountRow> = {},
  pluggyItem: { lastSyncAt: Date | null } | null = null,
): AccountWithLastSync {
  return {
    id: 'acc-1',
    userId: 'user-1',
    name: 'Nubank',
    type: 'CREDIT_CARD',
    source: 'MANUAL',
    closingDay: 20,
    dueDay: 27,
    creditLimitCents: 500000,
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
      row({ source: 'PLUGGY', pluggyItemId: 'item-1' }, { lastSyncAt: new Date('2026-09-22T10:00:00.000Z') }),
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
})
