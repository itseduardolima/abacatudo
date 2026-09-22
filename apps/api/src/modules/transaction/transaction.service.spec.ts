import type { Transaction as TransactionRow } from '@prisma/client'
import { DomainError } from '../../common/errors/domain.error'
import { TransactionService } from './transaction.service'
import type { TransactionRepository } from './transaction.repository'

function repoMock() {
  return { findMany: jest.fn() } as unknown as jest.Mocked<TransactionRepository>
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

describe('TransactionService', () => {
  it('listByMonth: sem mês, usa o mês atual em America/Manaus', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-21T12:00:00.000Z'))
    const repo = repoMock()
    repo.findMany.mockResolvedValue([row()])
    const service = new TransactionService(repo)

    const result = await service.listByMonth('user-1')

    expect(repo.findMany).toHaveBeenCalledWith('user-1', { start: expect.any(Date), end: expect.any(Date) })
    expect(result).toHaveLength(1)
    jest.useRealTimers()
  })

  it('listByMonth: mês em formato inválido é rejeitado antes de tocar no banco', async () => {
    const repo = repoMock()
    const service = new TransactionService(repo)

    await expect(service.listByMonth('user-1', '2026-13')).rejects.toBeInstanceOf(DomainError)
    expect(repo.findMany).not.toHaveBeenCalled()
  })
})
