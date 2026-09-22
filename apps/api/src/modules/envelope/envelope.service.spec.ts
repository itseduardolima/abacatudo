import type { BudgetMonth as BudgetMonthRow, Category as CategoryRow, Envelope as EnvelopeRow } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { ConflictError, NotFoundError } from '../../common/errors/domain.error'
import type { BudgetMonthService } from '../budget/budget-month.service'
import type { CategoryRepository } from '../category/category.repository'
import { EnvelopeService } from './envelope.service'
import type { EnvelopeRepository, EnvelopeWithBudgetMonth } from './envelope.repository'

function budgetMonthsMock() {
  return { requireId: jest.fn() } as unknown as jest.Mocked<BudgetMonthService>
}

function categoriesMock() {
  return { findActiveById: jest.fn() } as unknown as jest.Mocked<CategoryRepository>
}

function repoMock() {
  return {
    findMany: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<EnvelopeRepository>
}

function envelopeRow(overrides: Partial<EnvelopeRow> = {}): EnvelopeRow {
  return {
    id: 'env-1',
    userId: 'user-1',
    budgetMonthId: 'bm-1',
    categoryId: 'cat-1',
    amountCents: 30000,
    percent: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  }
}

function budgetMonthRow(overrides: Partial<BudgetMonthRow> = {}): BudgetMonthRow {
  return {
    id: 'bm-1',
    userId: 'user-1',
    month: '2026-09',
    incomeCents: 500000,
    benefitCents: 60000,
    fixedExpensesCents: 200000,
    savingsGoalCents: 50000,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  }
}

function categoryRow(overrides: Partial<CategoryRow> = {}): CategoryRow {
  return {
    id: 'cat-1',
    userId: 'user-1',
    name: 'Mercado',
    archivedAt: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  }
}

describe('EnvelopeService', () => {
  describe('list', () => {
    it('soma capCents dos envelopes e calcula "Livre"', async () => {
      const budgetMonths = budgetMonthsMock()
      budgetMonths.requireId.mockResolvedValue({ id: 'bm-1', month: '2026-09', variableCapCents: 310000 })
      const repo = repoMock()
      repo.findMany.mockResolvedValue([
        envelopeRow({ id: 'env-1', amountCents: 30000, percent: null }),
        envelopeRow({ id: 'env-2', amountCents: null, percent: 10 }),
      ])
      const service = new EnvelopeService(repo, budgetMonths, categoriesMock())

      const result = await service.list('user-1', '2026-09')

      expect(result.variableCapCents).toBe(310000)
      expect(result.allocatedCents).toBe(30000 + 31000)
      expect(result.freeCents).toBe(310000 - 30000 - 31000)
      expect(result.envelopes).toHaveLength(2)
    })
  })

  describe('create', () => {
    it('404 quando a categoria não existe (ou não é do usuário)', async () => {
      const budgetMonths = budgetMonthsMock()
      budgetMonths.requireId.mockResolvedValue({ id: 'bm-1', month: '2026-09', variableCapCents: 310000 })
      const categories = categoriesMock()
      categories.findActiveById.mockResolvedValue(null)
      const service = new EnvelopeService(repoMock(), budgetMonths, categories)

      await expect(
        service.create('user-1', '2026-09', { categoryId: 'cat-de-outro', amountCents: 30000 }),
      ).rejects.toBeInstanceOf(NotFoundError)
    })

    it('cria e devolve com capCents calculado', async () => {
      const budgetMonths = budgetMonthsMock()
      budgetMonths.requireId.mockResolvedValue({ id: 'bm-1', month: '2026-09', variableCapCents: 310000 })
      const categories = categoriesMock()
      categories.findActiveById.mockResolvedValue(categoryRow())
      const repo = repoMock()
      repo.create.mockResolvedValue(envelopeRow({ amountCents: null, percent: 20 }))
      const service = new EnvelopeService(repo, budgetMonths, categories)

      const result = await service.create('user-1', '2026-09', { categoryId: 'cat-1', percent: 20 })

      expect(repo.create).toHaveBeenCalledWith('user-1', 'bm-1', 'cat-1', { amountCents: null, percent: 20 })
      expect(result.capCents).toBe(62000)
    })

    it('409 quando a categoria já tem envelope neste mês', async () => {
      const budgetMonths = budgetMonthsMock()
      budgetMonths.requireId.mockResolvedValue({ id: 'bm-1', month: '2026-09', variableCapCents: 310000 })
      const categories = categoriesMock()
      categories.findActiveById.mockResolvedValue(categoryRow())
      const repo = repoMock()
      repo.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'x' }),
      )
      const service = new EnvelopeService(repo, budgetMonths, categories)

      await expect(
        service.create('user-1', '2026-09', { categoryId: 'cat-1', amountCents: 30000 }),
      ).rejects.toBeInstanceOf(ConflictError)
    })

    it('422 quando o mês do envelope já existia e está fechado', async () => {
      const budgetMonths = budgetMonthsMock()
      budgetMonths.requireId.mockResolvedValue({ id: 'bm-1', month: '2000-01', variableCapCents: 310000 })
      const service = new EnvelopeService(repoMock(), budgetMonths, categoriesMock())

      await expect(
        service.create('user-1', '2000-01', { categoryId: 'cat-1', amountCents: 30000 }),
      ).rejects.toMatchObject({ code: 'BUDGET_MONTH_CLOSED' })
    })
  })

  describe('update', () => {
    it('404 quando o envelope não existe (ou não é do usuário)', async () => {
      const repo = repoMock()
      repo.update.mockResolvedValue({ count: 0 })
      const service = new EnvelopeService(repo, budgetMonthsMock(), categoriesMock())

      await expect(service.update('user-1', 'env-de-outro', { amountCents: 1000 })).rejects.toBeInstanceOf(
        NotFoundError,
      )
    })

    it('atualiza e recalcula capCents com o teto do BudgetMonth relacionado', async () => {
      const repo = repoMock()
      repo.update.mockResolvedValue({ count: 1 })
      const withBudgetMonth: EnvelopeWithBudgetMonth = {
        ...envelopeRow({ amountCents: null, percent: 50 }),
        budgetMonth: budgetMonthRow(),
      }
      repo.findById.mockResolvedValue(withBudgetMonth)
      const service = new EnvelopeService(repo, budgetMonthsMock(), categoriesMock())

      const result = await service.update('user-1', 'env-1', { percent: 50 })

      expect(result.capCents).toBe(155000)
    })

    it('422 quando o mês do BudgetMonth relacionado já fechou', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValue({
        ...envelopeRow(),
        budgetMonth: budgetMonthRow({ month: '2000-01' }),
      })
      const service = new EnvelopeService(repo, budgetMonthsMock(), categoriesMock())

      await expect(service.update('user-1', 'env-1', { amountCents: 1000 })).rejects.toMatchObject({
        code: 'BUDGET_MONTH_CLOSED',
      })
      expect(repo.update).not.toHaveBeenCalled()
    })
  })

  describe('remove', () => {
    it('404 quando o envelope não existe (ou não é do usuário)', async () => {
      const repo = repoMock()
      repo.delete.mockResolvedValue({ count: 0 })
      const service = new EnvelopeService(repo, budgetMonthsMock(), categoriesMock())

      await expect(service.remove('user-1', 'env-de-outro')).rejects.toBeInstanceOf(NotFoundError)
    })

    it('422 quando o mês do BudgetMonth relacionado já fechou', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValue({
        ...envelopeRow(),
        budgetMonth: budgetMonthRow({ month: '2000-01' }),
      })
      const service = new EnvelopeService(repo, budgetMonthsMock(), categoriesMock())

      await expect(service.remove('user-1', 'env-1')).rejects.toMatchObject({ code: 'BUDGET_MONTH_CLOSED' })
      expect(repo.delete).not.toHaveBeenCalled()
    })
  })
})
