import type { Person } from '@prisma/client'
import type { PersonRepository } from '../person/person.repository'
import { AlertRepository } from './alert.repository'
import { AlertService } from './alert.service'

function personRow(overrides: Partial<Person> = {}): Person {
  return {
    id: 'self-1',
    userId: 'user-1',
    name: 'Eu',
    isSelf: true,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function repoMock() {
  return {
    findExpenseRows: jest.fn(),
    findFiredEnvelopeThresholds: jest.fn().mockResolvedValue([]),
    recordEnvelopeThreshold: jest.fn().mockResolvedValue(undefined),
    findFiredBudgetMonthThresholds: jest.fn().mockResolvedValue([]),
    recordBudgetMonthThreshold: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<AlertRepository>
}

function peopleMock() {
  return { findSelf: jest.fn().mockResolvedValue(personRow()) } as unknown as jest.Mocked<PersonRepository>
}

describe('AlertService', () => {
  describe('monthSpend', () => {
    it('busca as linhas do mês inteiro (sem categoryId) e devolve total + por categoria', async () => {
      const repo = repoMock()
      repo.findExpenseRows.mockResolvedValue([
        { categoryId: 'cat-1', amountCents: 10000, personId: 'self-1', splits: [] },
      ])
      const service = new AlertService(repo, peopleMock())

      const result = await service.monthSpend('user-1', '2026-09')

      expect(repo.findExpenseRows).toHaveBeenCalledWith('user-1', expect.anything())
      expect(result.totalCents).toBe(10000)
      expect(result.byCategoryCents.get('cat-1')).toBe(10000)
    })
  })

  describe('categorySpentCents', () => {
    it('filtra por categoryId', async () => {
      const repo = repoMock()
      repo.findExpenseRows.mockResolvedValue([
        { categoryId: 'cat-1', amountCents: 5000, personId: 'self-1', splits: [] },
      ])
      const service = new AlertService(repo, peopleMock())

      const result = await service.categorySpentCents('user-1', 'cat-1', '2026-09')

      expect(repo.findExpenseRows).toHaveBeenCalledWith('user-1', expect.anything(), 'cat-1')
      expect(result).toBe(5000)
    })
  })

  describe('envelopeAlert', () => {
    it('registra (idempotente) só os limiares batidos e devolve todos os já disparados', async () => {
      const repo = repoMock()
      repo.findFiredEnvelopeThresholds.mockResolvedValue([70])
      const service = new AlertService(repo, peopleMock())

      const result = await service.envelopeAlert('user-1', 'env-1', 21000, 30000)

      expect(repo.recordEnvelopeThreshold).toHaveBeenCalledTimes(1)
      expect(repo.recordEnvelopeThreshold).toHaveBeenCalledWith('user-1', 'env-1', 70)
      expect(result).toEqual({ spentCents: 21000, percentUsed: 70, firedThresholds: [70] })
    })

    it('não registra nada quando nenhum limiar foi batido', async () => {
      const repo = repoMock()
      const service = new AlertService(repo, peopleMock())

      await service.envelopeAlert('user-1', 'env-1', 1000, 30000)

      expect(repo.recordEnvelopeThreshold).not.toHaveBeenCalled()
    })

    it('bate os 3 limiares de uma vez quando o gasto já é >= 100%', async () => {
      const repo = repoMock()
      const service = new AlertService(repo, peopleMock())

      await service.envelopeAlert('user-1', 'env-1', 30000, 30000)

      expect(repo.recordEnvelopeThreshold).toHaveBeenCalledTimes(3)
      expect(repo.recordEnvelopeThreshold).toHaveBeenNthCalledWith(1, 'user-1', 'env-1', 70)
      expect(repo.recordEnvelopeThreshold).toHaveBeenNthCalledWith(2, 'user-1', 'env-1', 90)
      expect(repo.recordEnvelopeThreshold).toHaveBeenNthCalledWith(3, 'user-1', 'env-1', 100)
    })
  })

  describe('budgetMonthAlert', () => {
    it('registra e devolve os limiares do teto total (mesma lógica do envelope, escopo diferente)', async () => {
      const repo = repoMock()
      repo.findFiredBudgetMonthThresholds.mockResolvedValue([70, 90])
      const service = new AlertService(repo, peopleMock())

      const result = await service.budgetMonthAlert('user-1', 'bm-1', 280000, 310000)

      expect(repo.recordBudgetMonthThreshold).toHaveBeenCalledWith('user-1', 'bm-1', 70)
      expect(repo.recordBudgetMonthThreshold).toHaveBeenCalledWith('user-1', 'bm-1', 90)
      expect(result.firedThresholds).toEqual([70, 90])
    })
  })
})
