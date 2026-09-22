import type { Account as AccountRow, PluggyItem as PluggyItemRow } from '@prisma/client'
import { NotFoundError } from '../../common/errors/domain.error'
import type { AccountRepository } from '../account/account.repository'
import type { BankingSyncRepository } from './banking-sync.repository'
import { BankingService } from './banking.service'
import type { PluggyClient } from './pluggy/pluggy.client'
import type { PluggyItemRepository } from './pluggy-item.repository'

function pluggyMock() {
  return {
    createMeuPluggyItem: jest.fn(),
    getItem: jest.fn(),
    listAccounts: jest.fn(),
    listTransactions: jest.fn(),
  } as unknown as jest.Mocked<PluggyClient>
}

function itemsMock() {
  return {
    create: jest.fn(),
    findMany: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<PluggyItemRepository>
}

function accountsMock() {
  return {
    create: jest.fn(),
    findMany: jest.fn(),
    findById: jest.fn(),
    findByExternalAccountId: jest.fn(),
    updateFromSync: jest.fn(),
  } as unknown as jest.Mocked<AccountRepository>
}

function syncMock() {
  return { upsertTransaction: jest.fn() } as unknown as jest.Mocked<BankingSyncRepository>
}

function itemRow(overrides: Partial<PluggyItemRow> = {}): PluggyItemRow {
  return {
    id: 'item-1',
    userId: 'user-1',
    pluggyItemId: 'pluggy-item-1',
    institutionName: 'Meu Pluggy',
    status: 'WAITING_USER_INPUT',
    lastErrorCode: null,
    consentExpiresAt: null,
    lastSyncAt: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  }
}

function accountRow(overrides: Partial<AccountRow> = {}): AccountRow {
  return {
    id: 'acc-1',
    userId: 'user-1',
    name: 'Nubank',
    type: 'CREDIT_CARD',
    source: 'PLUGGY',
    closingDay: 20,
    dueDay: 27,
    creditLimitCents: 500000,
    pluggyItemId: 'item-1',
    externalAccountId: 'ext-acc-1',
    archivedAt: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  }
}

describe('BankingService', () => {
  it('connect: cria o item Meu Pluggy e devolve a URL de autorização', async () => {
    const pluggy = pluggyMock()
    pluggy.createMeuPluggyItem.mockResolvedValue({
      pluggyItemId: 'pluggy-item-1',
      authorizeUrl: 'https://my.pluggy.ai/x',
    })
    const items = itemsMock()
    items.create.mockResolvedValue(itemRow())
    const service = new BankingService(pluggy, items, accountsMock(), syncMock())

    const result = await service.connect('user-1')

    expect(items.create).toHaveBeenCalledWith('user-1', {
      pluggyItemId: 'pluggy-item-1',
      institutionName: 'Meu Pluggy',
      status: 'WAITING_USER_INPUT',
    })
    expect(result).toEqual({ id: 'item-1', authorizeUrl: 'https://my.pluggy.ai/x' })
  })

  it('checkStatus: 404 quando a conexão não é do usuário', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(null)
    const service = new BankingService(pluggyMock(), items, accountsMock(), syncMock())

    await expect(service.checkStatus('user-1', 'item-de-outro')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('checkStatus: status UPDATING é transiente, nunca persistido', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow())
    const pluggy = pluggyMock()
    pluggy.getItem.mockResolvedValue({
      id: 'pluggy-item-1',
      status: 'UPDATING',
      connector: { id: 200, name: 'Meu Pluggy' },
    })
    const service = new BankingService(pluggy, items, accountsMock(), syncMock())

    await service.checkStatus('user-1', 'item-1')

    expect(items.update).not.toHaveBeenCalled()
  })

  it('checkStatus: primeira vez que vira UPDATED dispara a sincronização', async () => {
    const items = itemsMock()
    items.findById
      .mockResolvedValueOnce(itemRow({ status: 'WAITING_USER_INPUT' }))
      .mockResolvedValueOnce(itemRow({ status: 'WAITING_USER_INPUT' }))
      .mockResolvedValueOnce(itemRow({ status: 'UPDATED' }))
    const pluggy = pluggyMock()
    pluggy.getItem.mockResolvedValue({
      id: 'pluggy-item-1',
      status: 'UPDATED',
      connector: { id: 200, name: 'Meu Pluggy' },
    })
    pluggy.listAccounts.mockResolvedValue([])
    const service = new BankingService(pluggy, items, accountsMock(), syncMock())

    await service.checkStatus('user-1', 'item-1')

    expect(items.update).toHaveBeenCalledWith('user-1', 'item-1', { status: 'UPDATED', consentExpiresAt: null })
    expect(pluggy.listAccounts).toHaveBeenCalledWith('pluggy-item-1')
  })

  it('checkStatus: já estava UPDATED antes, não sincroniza de novo', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow({ status: 'UPDATED' }))
    const pluggy = pluggyMock()
    pluggy.getItem.mockResolvedValue({
      id: 'pluggy-item-1',
      status: 'UPDATED',
      connector: { id: 200, name: 'Meu Pluggy' },
    })
    const service = new BankingService(pluggy, items, accountsMock(), syncMock())

    await service.checkStatus('user-1', 'item-1')

    expect(pluggy.listAccounts).not.toHaveBeenCalled()
  })

  it('manualSync: cria conta nova, paginação de transações e upsert idempotente', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow())
    const accounts = accountsMock()
    accounts.findByExternalAccountId.mockResolvedValue(null)
    accounts.create.mockResolvedValue(accountRow())
    const pluggy = pluggyMock()
    pluggy.listAccounts.mockResolvedValue([{ id: 'ext-acc-1', type: 'CREDIT', name: 'Nubank', creditData: null }])
    pluggy.listTransactions
      .mockResolvedValueOnce({
        results: [
          {
            id: 'tx-1',
            amount: 50,
            type: 'DEBIT',
            operationType: null,
            status: 'POSTED',
            date: '2026-09-21',
            description: 'PAG*LOJA',
            merchant: null,
            creditCardMetadata: null,
          },
        ],
        next: 'https://api.pluggy.ai/v2/transactions?cursor=abc',
      })
      .mockResolvedValueOnce({ results: [], next: null })
    const sync = syncMock()
    const service = new BankingService(pluggy, items, accounts, sync)

    const result = await service.manualSync('user-1', 'item-1')

    expect(accounts.create).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ name: 'Nubank', source: 'PLUGGY', externalAccountId: 'ext-acc-1' }),
    )
    expect(sync.upsertTransaction).toHaveBeenCalledTimes(1)
    expect(sync.upsertTransaction).toHaveBeenCalledWith(
      'user-1',
      'acc-1',
      expect.objectContaining({ externalId: 'tx-1' }),
    )
    expect(pluggy.listTransactions).toHaveBeenNthCalledWith(
      2,
      'ext-acc-1',
      'https://api.pluggy.ai/v2/transactions?cursor=abc',
    )
    expect(result).toEqual({ accountsSynced: 1, transactionsSynced: 1 })
  })

  it('manualSync: conta já existente é atualizada, nunca duplicada', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow())
    const accounts = accountsMock()
    accounts.findByExternalAccountId.mockResolvedValue(accountRow())
    const pluggy = pluggyMock()
    pluggy.listAccounts.mockResolvedValue([{ id: 'ext-acc-1', type: 'CREDIT', name: 'Nubank', creditData: null }])
    pluggy.listTransactions.mockResolvedValue({ results: [], next: null })
    const service = new BankingService(pluggy, items, accounts, syncMock())

    await service.manualSync('user-1', 'item-1')

    expect(accounts.create).not.toHaveBeenCalled()
    expect(accounts.updateFromSync).toHaveBeenCalledWith('user-1', 'acc-1', expect.any(Object))
  })
})
