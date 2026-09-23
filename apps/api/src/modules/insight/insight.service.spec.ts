import { monthRange } from '../../common/date/timezone'
import { InsightRepository } from './insight.repository'
import { InsightService } from './insight.service'
import type { SpendingRow } from './insight.mapper'

function repoMock() {
  return { findSpendingRows: jest.fn().mockResolvedValue([]) } as unknown as jest.Mocked<InsightRepository>
}

function row(overrides: Partial<SpendingRow> = {}): SpendingRow {
  return {
    kind: 'EXPENSE',
    amountCents: 10000,
    categoryId: 'cat-1',
    categoryName: 'Mercado',
    merchant: 'Loja X',
    personId: 'person-1',
    personName: 'Eu',
    splits: [],
    ...overrides,
  }
}

describe('InsightService', () => {
  describe('spendingReport', () => {
    it('rejeita mês em formato inválido', async () => {
      const service = new InsightService(repoMock())
      await expect(service.spendingReport('user-1', '2026/09')).rejects.toThrow('Mês inválido')
    })

    it('busca 4 meses (o pedido + 3 anteriores) e devolve o total do mês pedido', async () => {
      const repo = repoMock()
      repo.findSpendingRows.mockResolvedValueOnce([row({ amountCents: 12000 })]).mockResolvedValue([])
      const service = new InsightService(repo)

      const result = await service.spendingReport('user-1', '2026-09')

      expect(repo.findSpendingRows).toHaveBeenCalledTimes(4)
      expect(result.month).toBe('2026-09')
      expect(result.totalCents).toBe(12000)
    })

    it('vira o ano ao buscar meses anteriores a janeiro', async () => {
      const repo = repoMock()
      const service = new InsightService(repo)

      await service.spendingReport('user-1', '2026-01')

      // 2026-01 (atual), 2025-12, 2025-11, 2025-10.
      expect(repo.findSpendingRows).toHaveBeenNthCalledWith(1, 'user-1', monthRange('2026-01'))
      expect(repo.findSpendingRows).toHaveBeenNthCalledWith(2, 'user-1', monthRange('2025-12'))
      expect(repo.findSpendingRows).toHaveBeenNthCalledWith(3, 'user-1', monthRange('2025-11'))
      expect(repo.findSpendingRows).toHaveBeenNthCalledWith(4, 'user-1', monthRange('2025-10'))
    })

    it('monta byCategory/byMerchant/byPerson a partir das linhas do mês pedido', async () => {
      const repo = repoMock()
      repo.findSpendingRows
        .mockResolvedValueOnce([
          row({
            categoryId: 'cat-1',
            categoryName: 'Mercado',
            merchant: 'Loja X',
            personId: 'person-1',
            personName: 'Eu',
          }),
        ])
        .mockResolvedValue([])
      const service = new InsightService(repo)

      const result = await service.spendingReport('user-1', '2026-09')

      expect(result.byCategory).toEqual([
        expect.objectContaining({ key: 'cat-1', label: 'Mercado', amountCents: 10000 }),
      ])
      expect(result.byMerchant).toEqual([
        expect.objectContaining({ key: 'loja x', label: 'Loja X', amountCents: 10000 }),
      ])
      expect(result.byPerson).toEqual([expect.objectContaining({ key: 'person-1', label: 'Eu', amountCents: 10000 })])
    })
  })
})
