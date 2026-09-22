import type { Account as AccountRow, Person as PersonRow, PluggyItem as PluggyItemRow, Rule } from '@prisma/client'
import { NotFoundError } from '../../common/errors/domain.error'
import type { AccountRepository } from '../account/account.repository'
import type { PersonRepository } from '../person/person.repository'
import type { RuleRepository } from '../rule/rule.repository'
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
    upsertFromSync: jest.fn(),
  } as unknown as jest.Mocked<AccountRepository>
}

function syncMock() {
  return { upsertTransaction: jest.fn() } as unknown as jest.Mocked<BankingSyncRepository>
}

// findSelf resolve pra "self-1" por padrão — a maioria dos testes não olha pra atribuição de pessoa.
function peopleMock() {
  const mock = { findSelf: jest.fn() } as unknown as jest.Mocked<PersonRepository>
  mock.findSelf.mockResolvedValue(personRow())
  return mock
}

function rulesMock() {
  const mock = { findMany: jest.fn() } as unknown as jest.Mocked<RuleRepository>
  mock.findMany.mockResolvedValue([])
  return mock
}

function newService(
  overrides: {
    pluggy?: jest.Mocked<PluggyClient>
    items?: jest.Mocked<PluggyItemRepository>
    accounts?: jest.Mocked<AccountRepository>
    sync?: jest.Mocked<BankingSyncRepository>
    people?: jest.Mocked<PersonRepository>
    rules?: jest.Mocked<RuleRepository>
  } = {},
) {
  return new BankingService(
    overrides.pluggy ?? pluggyMock(),
    overrides.items ?? itemsMock(),
    overrides.accounts ?? accountsMock(),
    overrides.sync ?? syncMock(),
    overrides.people ?? peopleMock(),
    overrides.rules ?? rulesMock(),
  )
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

function personRow(overrides: Partial<PersonRow> = {}): PersonRow {
  return {
    id: 'self-1',
    userId: 'user-1',
    name: 'Eu',
    isSelf: true,
    archivedAt: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  }
}

function ruleRow(overrides: Partial<Rule> = {}): Rule {
  return {
    id: 'rule-1',
    userId: 'user-1',
    merchant: 'loja da família',
    personId: 'person-2',
    categoryId: null,
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
    const service = newService({ pluggy, items })

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
    const service = newService({ items })

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
    const service = newService({ pluggy, items })

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
    const service = newService({ pluggy, items })

    await service.checkStatus('user-1', 'item-1')

    expect(items.update).toHaveBeenCalledWith('user-1', 'item-1', {
      status: 'UPDATED',
      consentExpiresAt: null,
      lastErrorCode: null,
    })
    expect(pluggy.listAccounts).toHaveBeenCalledWith('pluggy-item-1')
  })

  it('checkStatus: LOGIN_ERROR persiste o código do erro, pra não deixar o usuário sem saber o motivo', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow())
    const pluggy = pluggyMock()
    pluggy.getItem.mockResolvedValue({
      id: 'pluggy-item-1',
      status: 'LOGIN_ERROR',
      connector: { id: 200, name: 'Meu Pluggy' },
      error: { code: 'INVALID_CREDENTIALS' },
    })
    const service = newService({ pluggy, items })

    await service.checkStatus('user-1', 'item-1')

    expect(items.update).toHaveBeenCalledWith('user-1', 'item-1', {
      status: 'LOGIN_ERROR',
      consentExpiresAt: null,
      lastErrorCode: 'INVALID_CREDENTIALS',
    })
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
    const service = newService({ pluggy, items })

    await service.checkStatus('user-1', 'item-1')

    expect(pluggy.listAccounts).not.toHaveBeenCalled()
  })

  it('manualSync: sincroniza conta e transações por upsert atômico, sem duplicar', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow())
    const accounts = accountsMock()
    accounts.upsertFromSync.mockResolvedValue(accountRow())
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
            category: null,
            categoryId: null,
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
    const service = newService({ pluggy, items, accounts, sync })

    const result = await service.manualSync('user-1', 'item-1')

    expect(accounts.upsertFromSync).toHaveBeenCalledWith(
      'user-1',
      'ext-acc-1',
      expect.objectContaining({ name: 'Nubank', source: 'PLUGGY' }),
      expect.any(Object),
    )
    expect(sync.upsertTransaction).toHaveBeenCalledTimes(1)
    expect(sync.upsertTransaction).toHaveBeenCalledWith(
      'user-1',
      'acc-1',
      'self-1',
      null,
      expect.objectContaining({ externalId: 'tx-1' }),
    )
    expect(pluggy.listTransactions).toHaveBeenNthCalledWith(
      2,
      'ext-acc-1',
      'https://api.pluggy.ai/v2/transactions?cursor=abc',
    )
    expect(result).toEqual({ accountsSynced: 1, transactionsSynced: 1 })
  })

  it('manualSync: duas contas do mesmo item cada uma vira um upsert por seu próprio externalAccountId', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow())
    const accounts = accountsMock()
    accounts.upsertFromSync
      .mockResolvedValueOnce(accountRow({ id: 'acc-1', externalAccountId: 'ext-acc-1' }))
      .mockResolvedValueOnce(accountRow({ id: 'acc-2', externalAccountId: 'ext-acc-2', type: 'CHECKING' }))
    const pluggy = pluggyMock()
    pluggy.listAccounts.mockResolvedValue([
      { id: 'ext-acc-1', type: 'CREDIT', name: 'Nubank cartão', creditData: null },
      { id: 'ext-acc-2', type: 'BANK', name: 'Nubank conta', creditData: null },
    ])
    pluggy.listTransactions.mockResolvedValue({ results: [], next: null })
    const service = newService({ pluggy, items, accounts })

    const result = await service.manualSync('user-1', 'item-1')

    expect(accounts.upsertFromSync).toHaveBeenCalledTimes(2)
    expect(accounts.upsertFromSync).toHaveBeenNthCalledWith(
      1,
      'user-1',
      'ext-acc-1',
      expect.objectContaining({ type: 'CREDIT_CARD' }),
      expect.any(Object),
    )
    expect(accounts.upsertFromSync).toHaveBeenNthCalledWith(
      2,
      'user-1',
      'ext-acc-2',
      expect.objectContaining({ type: 'CHECKING' }),
      expect.any(Object),
    )
    expect(result.accountsSynced).toBe(2)
  })

  it('manualSync: sem regra, a transação nasce "Meu" (personId do self)', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow())
    const accounts = accountsMock()
    accounts.upsertFromSync.mockResolvedValue(accountRow())
    const pluggy = pluggyMock()
    pluggy.listAccounts.mockResolvedValue([{ id: 'ext-acc-1', type: 'CREDIT', name: 'Nubank', creditData: null }])
    pluggy.listTransactions.mockResolvedValue({
      results: [
        {
          id: 'tx-1',
          amount: 50,
          type: 'DEBIT',
          operationType: null,
          category: null,
          categoryId: null,
          status: 'POSTED',
          date: '2026-09-21',
          description: 'PAG*MERCADO',
          merchant: { businessName: 'Mercado Livre' },
          creditCardMetadata: null,
        },
      ],
      next: null,
    })
    const sync = syncMock()
    const people = peopleMock()
    people.findSelf.mockResolvedValue(personRow({ id: 'self-42' }))
    const rules = rulesMock()
    const service = newService({ pluggy, items, accounts, sync, people, rules })

    await service.manualSync('user-1', 'item-1')

    expect(sync.upsertTransaction).toHaveBeenCalledWith('user-1', 'acc-1', 'self-42', null, expect.any(Object))
  })

  it('manualSync: com Rule pro estabelecimento (normalizado), atribui a pessoa e a categoria da regra', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow())
    const accounts = accountsMock()
    accounts.upsertFromSync.mockResolvedValue(accountRow())
    const pluggy = pluggyMock()
    pluggy.listAccounts.mockResolvedValue([{ id: 'ext-acc-1', type: 'CREDIT', name: 'Nubank', creditData: null }])
    pluggy.listTransactions.mockResolvedValue({
      results: [
        {
          id: 'tx-1',
          amount: 50,
          type: 'DEBIT',
          operationType: null,
          category: null,
          categoryId: null,
          status: 'POSTED',
          date: '2026-09-21',
          description: 'PAG*LOJA DA FAMILIA',
          merchant: { businessName: '  Loja da Família  ' },
          creditCardMetadata: null,
        },
      ],
      next: null,
    })
    const sync = syncMock()
    const rules = rulesMock()
    rules.findMany.mockResolvedValue([
      ruleRow({ merchant: 'loja da família', personId: 'person-2', categoryId: 'cat-mercado' }),
    ])
    const service = newService({ pluggy, items, accounts, sync, rules })

    await service.manualSync('user-1', 'item-1')

    expect(sync.upsertTransaction).toHaveBeenCalledWith(
      'user-1',
      'acc-1',
      'person-2',
      'cat-mercado',
      expect.any(Object),
    )
  })

  it('manualSync: Rule só de categoria (sem pessoa) deixa a pessoa cair no padrão "Meu"', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow())
    const accounts = accountsMock()
    accounts.upsertFromSync.mockResolvedValue(accountRow())
    const pluggy = pluggyMock()
    pluggy.listAccounts.mockResolvedValue([{ id: 'ext-acc-1', type: 'CREDIT', name: 'Nubank', creditData: null }])
    pluggy.listTransactions.mockResolvedValue({
      results: [
        {
          id: 'tx-1',
          amount: 50,
          type: 'DEBIT',
          operationType: null,
          category: null,
          categoryId: null,
          status: 'POSTED',
          date: '2026-09-21',
          description: 'PAG*MERCADO',
          merchant: { businessName: 'Mercado Central' },
          creditCardMetadata: null,
        },
      ],
      next: null,
    })
    const sync = syncMock()
    const people = peopleMock()
    people.findSelf.mockResolvedValue(personRow({ id: 'self-1' }))
    const rules = rulesMock()
    rules.findMany.mockResolvedValue([
      ruleRow({ merchant: 'mercado central', personId: null, categoryId: 'cat-mercado' }),
    ])
    const service = newService({ pluggy, items, accounts, sync, people, rules })

    await service.manualSync('user-1', 'item-1')

    expect(sync.upsertTransaction).toHaveBeenCalledWith('user-1', 'acc-1', 'self-1', 'cat-mercado', expect.any(Object))
  })

  it('manualSync: sem Pessoa self cadastrada, falha alto (invariante quebrada)', async () => {
    const items = itemsMock()
    items.findById.mockResolvedValue(itemRow())
    const people = peopleMock()
    people.findSelf.mockResolvedValue(null)
    const service = newService({ items, people })

    await expect(service.manualSync('user-1', 'item-1')).rejects.toThrow('Pessoa "Eu" não encontrada.')
  })
})
