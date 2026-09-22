import type { Person as PersonRow, Transaction as TransactionRow } from '@prisma/client'
import { DomainError, NotFoundError } from '../../common/errors/domain.error'
import type { PersonRepository } from '../person/person.repository'
import type { RuleRepository } from '../rule/rule.repository'
import type { SplitRepository } from '../split/split.repository'
import { TransactionService } from './transaction.service'
import type { TransactionRepository } from './transaction.repository'

function repoMock() {
  return {
    findMany: jest.fn(),
    findById: jest.fn(),
    updatePerson: jest.fn(),
  } as unknown as jest.Mocked<TransactionRepository>
}

function peopleMock() {
  return { findById: jest.fn() } as unknown as jest.Mocked<PersonRepository>
}

function rulesMock() {
  return { upsert: jest.fn() } as unknown as jest.Mocked<RuleRepository>
}

function splitsMock() {
  return { deleteAll: jest.fn() } as unknown as jest.Mocked<SplitRepository>
}

function row(overrides: Partial<TransactionRow> = {}): TransactionRow {
  return {
    id: 'tx-1',
    userId: 'user-1',
    accountId: 'acc-1',
    externalId: 'ext-1',
    kind: 'EXPENSE',
    status: 'POSTED',
    amountCents: 1500,
    occurredAt: new Date('2026-09-21T12:00:00.000Z'),
    description: 'PAG*LOJA',
    merchant: null,
    categoryId: null,
    personId: null,
    note: null,
    cardLast4: null,
    installmentNumber: null,
    installmentTotal: null,
    billId: null,
    createdAt: new Date('2026-09-21T12:00:00.000Z'),
    updatedAt: new Date('2026-09-21T12:00:00.000Z'),
    ...overrides,
  }
}

function personRow(overrides: Partial<PersonRow> = {}): PersonRow {
  return {
    id: 'person-2',
    userId: 'user-1',
    name: 'Família',
    isSelf: false,
    archivedAt: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  }
}

describe('TransactionService', () => {
  it('listByMonth: sem mês, usa o mês atual em America/Manaus', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-21T12:00:00.000Z'))
    const repo = repoMock()
    repo.findMany.mockResolvedValue([row()])
    const service = new TransactionService(repo, peopleMock(), rulesMock(), splitsMock())

    const result = await service.listByMonth('user-1')

    expect(repo.findMany).toHaveBeenCalledWith('user-1', { start: expect.any(Date), end: expect.any(Date) })
    expect(result).toHaveLength(1)
    jest.useRealTimers()
  })

  it('listByMonth: mês em formato inválido é rejeitado antes de tocar no banco', async () => {
    const repo = repoMock()
    const service = new TransactionService(repo, peopleMock(), rulesMock(), splitsMock())

    await expect(service.listByMonth('user-1', '2026-13')).rejects.toBeInstanceOf(DomainError)
    expect(repo.findMany).not.toHaveBeenCalled()
  })

  it('updatePerson: 404 quando a transação não é do usuário (ou não é cartão)', async () => {
    const repo = repoMock()
    repo.findById.mockResolvedValue(null)
    const service = new TransactionService(repo, peopleMock(), rulesMock(), splitsMock())

    await expect(
      service.updatePerson('user-1', 'tx-de-outro', { personId: 'person-2', alwaysForMerchant: false }),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('updatePerson: 404 quando a pessoa não existe (ou não é do usuário)', async () => {
    const repo = repoMock()
    repo.findById.mockResolvedValue(row())
    const people = peopleMock()
    people.findById.mockResolvedValue(null)
    const service = new TransactionService(repo, people, rulesMock(), splitsMock())

    await expect(
      service.updatePerson('user-1', 'tx-1', { personId: 'person-de-outro', alwaysForMerchant: false }),
    ).rejects.toBeInstanceOf(NotFoundError)
    expect(repo.updatePerson).not.toHaveBeenCalled()
  })

  it('updatePerson: troca a pessoa, desfaz split se tiver, devolve a transação atualizada', async () => {
    const repo = repoMock()
    repo.findById.mockResolvedValueOnce(row()).mockResolvedValueOnce(row({ personId: 'person-2' }))
    repo.updatePerson.mockResolvedValue({ count: 1 })
    const people = peopleMock()
    people.findById.mockResolvedValue(personRow())
    const splits = splitsMock()
    const service = new TransactionService(repo, people, rulesMock(), splits)

    const result = await service.updatePerson('user-1', 'tx-1', { personId: 'person-2', alwaysForMerchant: false })

    expect(repo.updatePerson).toHaveBeenCalledWith('user-1', 'tx-1', 'person-2')
    expect(splits.deleteAll).toHaveBeenCalledWith('user-1', 'tx-1')
    expect(result.personId).toBe('person-2')
  })

  it('updatePerson: alwaysForMerchant sem merchant na transação é rejeitado, sem criar Rule', async () => {
    const repo = repoMock()
    repo.findById.mockResolvedValue(row({ merchant: null }))
    const people = peopleMock()
    people.findById.mockResolvedValue(personRow())
    const rules = rulesMock()
    const service = new TransactionService(repo, people, rules, splitsMock())

    await expect(
      service.updatePerson('user-1', 'tx-1', { personId: 'person-2', alwaysForMerchant: true }),
    ).rejects.toBeInstanceOf(DomainError)
    expect(rules.upsert).not.toHaveBeenCalled()
    expect(repo.updatePerson).not.toHaveBeenCalled()
  })

  it('updatePerson: alwaysForMerchant cria/atualiza a Rule com o merchant normalizado', async () => {
    const repo = repoMock()
    repo.findById
      .mockResolvedValueOnce(row({ merchant: '  Loja da Família  ' }))
      .mockResolvedValueOnce(row({ merchant: '  Loja da Família  ', personId: 'person-2' }))
    repo.updatePerson.mockResolvedValue({ count: 1 })
    const people = peopleMock()
    people.findById.mockResolvedValue(personRow())
    const rules = rulesMock()
    const service = new TransactionService(repo, people, rules, splitsMock())

    await service.updatePerson('user-1', 'tx-1', { personId: 'person-2', alwaysForMerchant: true })

    expect(rules.upsert).toHaveBeenCalledWith('user-1', 'loja da família', 'person-2')
  })
})
