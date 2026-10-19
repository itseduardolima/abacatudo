import type { PrismaService } from '../../prisma/prisma.client'
import { FixedExpenseRepository } from './fixed-expense.repository'

function fakePrisma() {
  const fixedExpensePayment = {
    createMany: jest.fn().mockResolvedValue({ count: 1 }),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    findMany: jest.fn().mockResolvedValue([]),
  }
  return { prisma: { fixedExpensePayment } as unknown as PrismaService, fixedExpensePayment }
}

describe('FixedExpenseRepository: marca de pago', () => {
  it('markPaid grava com skipDuplicates, então marcar duas vezes ao mesmo tempo não falha', async () => {
    const { prisma, fixedExpensePayment } = fakePrisma()

    await new FixedExpenseRepository(prisma).markPaid('user-1', 'fe-1', '2026-10', 2)

    expect(fixedExpensePayment.createMany).toHaveBeenCalledWith({
      data: [{ userId: 'user-1', fixedExpenseId: 'fe-1', month: '2026-10', half: 2 }],
      skipDuplicates: true,
    })
  })

  it('unmarkPaid só apaga a marca do usuário, do gasto, do mês e da quinzena pedidos', async () => {
    const { prisma, fixedExpensePayment } = fakePrisma()

    await new FixedExpenseRepository(prisma).unmarkPaid('user-1', 'fe-1', '2026-10', 1)

    expect(fixedExpensePayment.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', fixedExpenseId: 'fe-1', month: '2026-10', half: 1 },
    })
  })

  it('deleteStalePayments apaga só as quinzenas fora da lista, do usuário e do gasto', async () => {
    const { prisma, fixedExpensePayment } = fakePrisma()

    await new FixedExpenseRepository(prisma).deleteStalePayments('user-1', 'fe-1', [1])

    expect(fixedExpensePayment.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', fixedExpenseId: 'fe-1', half: { notIn: [1] } },
    })
  })

  it('findPaidHalves filtra pelo usuário e pelo mês', async () => {
    const { prisma, fixedExpensePayment } = fakePrisma()
    fixedExpensePayment.findMany.mockResolvedValue([{ fixedExpenseId: 'fe-1', half: 2 }])

    const result = await new FixedExpenseRepository(prisma).findPaidHalves('user-1', '2026-10')

    expect(fixedExpensePayment.findMany.mock.calls[0][0].where).toEqual({ userId: 'user-1', month: '2026-10' })
    expect([...result]).toEqual(['fe-1:2'])
  })
})
