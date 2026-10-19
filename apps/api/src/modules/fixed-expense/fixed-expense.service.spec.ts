import type { FixedExpense as FixedExpenseRow } from '@prisma/client'
import { NotFoundError } from '../../common/errors/domain.error'
import { FixedExpenseService } from './fixed-expense.service'
import type { FixedExpenseRepository } from './fixed-expense.repository'

function repoMock() {
  return {
    create: jest.fn(),
    findMany: jest.fn(),
    archive: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    findPaidHalves: jest.fn().mockResolvedValue(new Set<string>()),
    markPaid: jest.fn().mockResolvedValue(undefined),
    unmarkPaid: jest.fn().mockResolvedValue({ count: 1 }),
    deleteStalePayments: jest.fn().mockResolvedValue({ count: 0 }),
  } as unknown as jest.Mocked<FixedExpenseRepository>
}

function row(overrides: Partial<FixedExpenseRow> = {}): FixedExpenseRow {
  return {
    id: 'fe-1',
    userId: 'user-1',
    name: 'Aluguel',
    amountCents: 120000,
    half: 1,
    archivedAt: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  }
}

describe('FixedExpenseService', () => {
  it('create: devolve o DTO', async () => {
    const repo = repoMock()
    repo.create.mockResolvedValue(row())
    const service = new FixedExpenseService(repo)

    await expect(service.create('user-1', { name: 'Aluguel', amountCents: 120000, half: 2 })).resolves.toEqual({
      id: 'fe-1',
      name: 'Aluguel',
      amountCents: 120000,
      half: 1,
      shares: [{ half: 1, amountCents: 120000, paid: false }],
      archivedAt: null,
      createdAt: '2026-09-01T00:00:00.000Z',
    })
    expect(repo.create).toHaveBeenCalledWith('user-1', 'Aluguel', 120000, 2)
  })

  it('list: mapeia todas as linhas', async () => {
    const repo = repoMock()
    repo.findMany.mockResolvedValue([row(), row({ id: 'fe-2', name: 'Internet', amountCents: 10000 })])
    const service = new FixedExpenseService(repo)

    const result = await service.list('user-1', false)

    expect(result).toHaveLength(2)
    expect(repo.findMany).toHaveBeenCalledWith('user-1', false)
  })

  it('archive: 404 quando não existe (ou é de outro usuário)', async () => {
    const repo = repoMock()
    repo.archive.mockResolvedValue({ count: 0 })
    const service = new FixedExpenseService(repo)

    await expect(service.archive('user-1', 'fe-1')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('archive: sucesso não lança', async () => {
    const repo = repoMock()
    repo.archive.mockResolvedValue({ count: 1 })
    const service = new FixedExpenseService(repo)

    await expect(service.archive('user-1', 'fe-1')).resolves.toBeUndefined()
  })

  it('update: grava nome, valor e quinzena e devolve o DTO', async () => {
    const repo = repoMock()
    repo.update.mockResolvedValue({ count: 1 })
    repo.findById.mockResolvedValue(row({ half: 2, amountCents: 130000 }))
    const service = new FixedExpenseService(repo)

    const result = await service.update('user-1', 'fe-1', { name: 'Aluguel', amountCents: 130000, half: 2 })

    expect(repo.update).toHaveBeenCalledWith('user-1', 'fe-1', { name: 'Aluguel', amountCents: 130000, half: 2 })
    expect(result).toMatchObject({ id: 'fe-1', half: 2, amountCents: 130000 })
  })

  it('update: gasto de outro usuário ou inexistente é 404 e nada é lido', async () => {
    const repo = repoMock()
    repo.update.mockResolvedValue({ count: 0 })
    const service = new FixedExpenseService(repo)

    await expect(service.update('user-2', 'fe-1', { name: 'Aluguel', amountCents: 1, half: 1 })).rejects.toBeInstanceOf(
      NotFoundError,
    )
    expect(repo.findById).not.toHaveBeenCalled()
  })

  it('getFigures: soma total e quinzenas; o dividido conta metade em cada, o centavo ímpar na 2ª', async () => {
    const repo = repoMock()
    repo.findMany.mockResolvedValue([
      row({ amountCents: 10001, half: 3 }),
      row({ id: 'fe-2', amountCents: 5000, half: 1 }),
      row({ id: 'fe-3', amountCents: 7000, half: 2 }),
    ])
    const service = new FixedExpenseService(repo)

    await expect(service.getFigures('user-1', '2026-10')).resolves.toEqual({
      totalCents: 22001,
      firstHalfCents: 5000 + 5000,
      secondHalfCents: 5001 + 7000,
      paidCents: 0,
    })
    expect(repo.findMany).toHaveBeenCalledWith('user-1', false)
  })

  it('getFigures: sem nenhum gasto fixo, tudo zero', async () => {
    const repo = repoMock()
    repo.findMany.mockResolvedValue([])
    const service = new FixedExpenseService(repo)

    await expect(service.getFigures('user-1', '2026-10')).resolves.toEqual({
      totalCents: 0,
      firstHalfCents: 0,
      secondHalfCents: 0,
      paidCents: 0,
    })
  })

  describe('gasto fixo pago no mês e na quinzena', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-10-19T15:00:00.000Z'))
    })
    afterEach(() => jest.useRealTimers())

    it('markPaid grava a marca da quinzena do mês atual do próprio usuário', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValue(row({ half: 2 }))
      const service = new FixedExpenseService(repo)

      await service.markPaid('user-1', 'fe-1', 2)

      expect(repo.findById).toHaveBeenCalledWith('user-1', 'fe-1')
      expect(repo.markPaid).toHaveBeenCalledWith('user-1', 'fe-1', '2026-10', 2)
    })

    it('gasto dividido aceita marca nas duas quinzenas', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValue(row({ half: 3 }))
      const service = new FixedExpenseService(repo)

      await service.markPaid('user-1', 'fe-1', 1)
      await service.markPaid('user-1', 'fe-1', 2)

      expect(repo.markPaid).toHaveBeenCalledTimes(2)
    })

    it('quinzena que o gasto não tem é 404 e nada é gravado', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValue(row({ half: 1 }))
      const service = new FixedExpenseService(repo)

      await expect(service.markPaid('user-1', 'fe-1', 2)).rejects.toBeInstanceOf(NotFoundError)
      await expect(service.markPaid('user-1', 'fe-1', 3)).rejects.toBeInstanceOf(NotFoundError)
      expect(repo.markPaid).not.toHaveBeenCalled()
    })

    it('markPaid: gasto de outro usuário ou inexistente é 404 e nada é gravado', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValue(null)
      const service = new FixedExpenseService(repo)

      await expect(service.markPaid('user-2', 'fe-1', 1)).rejects.toBeInstanceOf(NotFoundError)
      expect(repo.markPaid).not.toHaveBeenCalled()
    })

    it('markPaid: gasto fixo arquivado é 404', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValue(row({ archivedAt: new Date('2026-10-01T00:00:00.000Z') }))
      const service = new FixedExpenseService(repo)

      await expect(service.markPaid('user-1', 'fe-1', 1)).rejects.toBeInstanceOf(NotFoundError)
      expect(repo.markPaid).not.toHaveBeenCalled()
    })

    it('unmarkPaid apaga a marca da quinzena; de outro usuário é 404', async () => {
      const repo = repoMock()
      repo.findById.mockResolvedValueOnce(row()).mockResolvedValueOnce(null)
      const service = new FixedExpenseService(repo)

      await service.unmarkPaid('user-1', 'fe-1', 1)
      expect(repo.unmarkPaid).toHaveBeenCalledWith('user-1', 'fe-1', '2026-10', 1)

      await expect(service.unmarkPaid('user-2', 'fe-1', 1)).rejects.toBeInstanceOf(NotFoundError)
      expect(repo.unmarkPaid).toHaveBeenCalledTimes(1)
    })

    it('list devolve uma parte por quinzena; o dividido tem duas, o centavo ímpar na 2ª, cada uma com sua marca', async () => {
      const repo = repoMock()
      repo.findMany.mockResolvedValue([
        row({ id: 'fe-1', half: 1, amountCents: 5000 }),
        row({ id: 'fe-2', half: 2, amountCents: 7000 }),
        row({ id: 'fe-3', half: 3, amountCents: 10001 }),
      ])
      repo.findPaidHalves.mockResolvedValue(new Set(['fe-2:2', 'fe-3:1']))
      const service = new FixedExpenseService(repo)

      const result = await service.list('user-1', false)

      expect(repo.findPaidHalves).toHaveBeenCalledWith('user-1', '2026-10')
      expect(result.map((item) => item.shares)).toEqual([
        [{ half: 1, amountCents: 5000, paid: false }],
        [{ half: 2, amountCents: 7000, paid: true }],
        [
          { half: 1, amountCents: 5000, paid: true },
          { half: 2, amountCents: 5001, paid: false },
        ],
      ])
    })

    it('update devolve o estado de pago atual', async () => {
      const repo = repoMock()
      repo.update.mockResolvedValue({ count: 1 })
      repo.findById.mockResolvedValue(row())
      repo.findPaidHalves.mockResolvedValue(new Set(['fe-1:1']))
      const service = new FixedExpenseService(repo)

      const result = await service.update('user-1', 'fe-1', { name: 'Aluguel', amountCents: 120000, half: 1 })

      expect(result.shares).toEqual([{ half: 1, amountCents: 120000, paid: true }])
    })

    it('getFigures soma só as partes marcadas: o dividido conta a metade de cada marca, e arquivado fica fora', async () => {
      const repo = repoMock()
      repo.findMany.mockResolvedValue([
        row({ id: 'fe-1', amountCents: 10001, half: 3 }),
        row({ id: 'fe-2', amountCents: 5000, half: 1 }),
        row({ id: 'fe-3', amountCents: 7000, half: 2 }),
      ])
      repo.findPaidHalves.mockResolvedValue(new Set(['fe-1:2', 'fe-3:2', 'fe-arquivado:1']))
      const service = new FixedExpenseService(repo)

      const result = await service.getFigures('user-1', '2026-10')

      expect(result.paidCents).toBe(5001 + 7000)
      expect(repo.findPaidHalves).toHaveBeenCalledWith('user-1', '2026-10')
    })

    it('update apaga as marcas das quinzenas que o gasto deixou de ter (dividido virou só 1ª)', async () => {
      const repo = repoMock()
      repo.update.mockResolvedValue({ count: 1 })
      repo.findById.mockResolvedValue(row({ half: 1 }))
      const service = new FixedExpenseService(repo)

      await service.update('user-1', 'fe-1', { name: 'Aluguel', amountCents: 120000, half: 1 })

      expect(repo.deleteStalePayments).toHaveBeenCalledWith('user-1', 'fe-1', [1])
    })

    it('update de um gasto dividido mantém as marcas das duas quinzenas', async () => {
      const repo = repoMock()
      repo.update.mockResolvedValue({ count: 1 })
      repo.findById.mockResolvedValue(row({ half: 3 }))
      const service = new FixedExpenseService(repo)

      await service.update('user-1', 'fe-1', { name: 'Aluguel', amountCents: 120000, half: 3 })

      expect(repo.deleteStalePayments).toHaveBeenCalledWith('user-1', 'fe-1', [1, 2])
    })

    it('update de gasto de outro usuário é 404 e nenhuma marca é apagada', async () => {
      const repo = repoMock()
      repo.update.mockResolvedValue({ count: 0 })
      const service = new FixedExpenseService(repo)

      await expect(
        service.update('user-2', 'fe-1', { name: 'Aluguel', amountCents: 1, half: 1 }),
      ).rejects.toBeInstanceOf(NotFoundError)
      expect(repo.deleteStalePayments).not.toHaveBeenCalled()
    })
  })
})
