import { BudgetPaceService } from './budget-pace.service'
import type { BudgetMonthService } from './budget-month.service'
import type { FixedExpenseService } from '../fixed-expense/fixed-expense.service'
import type { InvoiceService, SummaryWithAdvance } from '../invoice/invoice.service'

function budgetMonthMock(incomeCents: number, month = '2026-09') {
  return {
    getOrCreate: jest.fn().mockResolvedValue({
      month,
      incomeCents,
      firstHalfIncomeCents: incomeCents / 2,
      secondHalfIncomeCents: incomeCents / 2,
      benefitCents: 0,
      fixedExpensesCents: 0,
      savingsGoalCents: 0,
      variableCapCents: 0,
    }),
  } as unknown as jest.Mocked<BudgetMonthService>
}

function invoicesMock(mineCents: number, advancePaidCents = 0) {
  const summary: SummaryWithAdvance = {
    totalCents: mineCents + 1000,
    mineCents,
    notMineCents: 1000,
    advancePaidCents,
    firstHalfMineCents: (mineCents + advancePaidCents) / 2,
    secondHalfMineCents: (mineCents + advancePaidCents) / 2,
  }
  return {
    getSummaryWithAdvance: jest.fn().mockResolvedValue(summary),
  } as unknown as jest.Mocked<InvoiceService>
}

function fixedExpensesMock(sumCents: number, paidCents = 0) {
  return {
    getFigures: jest.fn().mockResolvedValue({
      totalCents: sumCents,
      firstHalfCents: sumCents / 2,
      secondHalfCents: sumCents / 2,
      paidCents,
    }),
  } as unknown as jest.Mocked<FixedExpenseService>
}

describe('BudgetPaceService', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-15T12:00:00.000Z'))
  })
  afterEach(() => jest.useRealTimers())

  it('teto = renda; gasto = fatura aberta (todos os cartões) + gastos fixos ativos', async () => {
    const budgetMonth = budgetMonthMock(300_000)
    const invoices = invoicesMock(50_000)
    const fixedExpenses = fixedExpensesMock(20_000)
    const service = new BudgetPaceService(budgetMonth, invoices, fixedExpenses)

    const result = await service.getPace('user-1')

    expect(budgetMonth.getOrCreate).toHaveBeenCalledWith('user-1', undefined)
    expect(invoices.getSummaryWithAdvance).toHaveBeenCalledWith('user-1', undefined)
    expect(fixedExpenses.getFigures).toHaveBeenCalledWith('user-1', '2026-09')
    expect(result.capCents).toBe(300_000)
    expect(result.spentCents).toBe(70_000)
    expect(result.cardsMineCents).toBe(50_000)
    expect(result.month).toBe('2026-09')
    expect(result.firstHalfCapCents).toBe(150_000)
    expect(result.firstHalfSpentCents).toBe(35_000)
    expect(result.currentHalf).toBe(1)
    expect(result.currentHalfRemainingCents).toBe(115_000)
  })

  it('gasto bruto soma de volta o pagamento antecipado que o gasto abatido já descontou', async () => {
    const service = new BudgetPaceService(
      budgetMonthMock(300_000),
      invoicesMock(50_000, 12_000),
      fixedExpensesMock(20_000),
    )

    const result = await service.getPace('user-1')

    expect(result.spentCents).toBe(70_000)
    expect(result.advancePaidCents).toBe(12_000)
    expect(result.grossSpentCents).toBe(82_000)
  })

  it('sem pagamento antecipado, gasto bruto e abatido são iguais', async () => {
    const service = new BudgetPaceService(budgetMonthMock(300_000), invoicesMock(50_000), fixedExpensesMock(20_000))

    const result = await service.getPace('user-1')

    expect(result.advancePaidCents).toBe(0)
    expect(result.grossSpentCents).toBe(result.spentCents)
  })

  it('sem gasto fixo nenhum, gasto é só a fatura', async () => {
    const budgetMonth = budgetMonthMock(100_000)
    const invoices = invoicesMock(15_000)
    const fixedExpenses = fixedExpensesMock(0)
    const service = new BudgetPaceService(budgetMonth, invoices, fixedExpenses)

    const result = await service.getPace('user-1', '2026-08')

    expect(budgetMonth.getOrCreate).toHaveBeenCalledWith('user-1', '2026-08')
    expect(invoices.getSummaryWithAdvance).toHaveBeenCalledWith('user-1', '2026-08')
    expect(result.spentCents).toBe(15_000)
  })

  it('gasto da 1ª quinzena só existe no mês atual', async () => {
    const service = new BudgetPaceService(
      budgetMonthMock(100_000, '2026-10'),
      invoicesMock(10_000),
      fixedExpensesMock(0),
    )

    const result = await service.getPace('user-1', '2026-10')

    expect(result.firstHalfSpentCents).toBeNull()
    expect(result.currentHalf).toBeNull()
    expect(result.currentHalfRemainingCents).toBeNull()
  })

  it('a partir do dia 16, o que sobra é o da 2ª quinzena, contra o segundo salário', async () => {
    jest.setSystemTime(new Date('2026-09-20T12:00:00.000Z'))
    const service = new BudgetPaceService(budgetMonthMock(300_000), invoicesMock(50_000), fixedExpensesMock(20_000))

    const result = await service.getPace('user-1')

    expect(result.currentHalf).toBe(2)
    expect(result.currentHalfRemainingCents).toBe(150_000 - 35_000)
    expect(result.firstHalfSpentCents).toBe(35_000)
    expect(result.firstHalfRemainingCents).toBe(150_000 - 35_000)
    expect(result.secondHalfCapCents).toBe(150_000)
    expect(result.secondHalfSpentCents).toBe(35_000)
    expect(result.secondHalfRemainingCents).toBe(150_000 - 35_000)
  })

  it('as duas quinzenas somam o gasto bruto do mês (1ª + 2ª = fatura aberta + fixos, antes do pagamento antecipado)', async () => {
    const service = new BudgetPaceService(
      budgetMonthMock(300_000),
      invoicesMock(50_000, 12_000),
      fixedExpensesMock(20_000),
    )

    const result = await service.getPace('user-1')

    expect(result.firstHalfSpentCents! + result.secondHalfSpentCents!).toBe(result.grossSpentCents)
  })

  it('na 1ª quinzena, a 2ª já traz o que cai nela (parcela e fixo do dia 16 em diante)', async () => {
    const service = new BudgetPaceService(budgetMonthMock(300_000), invoicesMock(50_000), fixedExpensesMock(20_000))

    const result = await service.getPace('user-1')

    expect(result.currentHalf).toBe(1)
    expect(result.secondHalfSpentCents).toBe(35_000)
    expect(result.secondHalfRemainingCents).toBe(150_000 - 35_000)
    expect(result.currentHalfRemainingCents).toBe(result.firstHalfRemainingCents)
  })

  it('fora do mês atual, as quinzenas não têm gasto nem sobra, só o teto', async () => {
    const service = new BudgetPaceService(
      budgetMonthMock(300_000, '2026-10'),
      invoicesMock(50_000),
      fixedExpensesMock(20_000),
    )

    const result = await service.getPace('user-1', '2026-10')

    expect(result.secondHalfCapCents).toBe(150_000)
    expect(result.secondHalfSpentCents).toBeNull()
    expect(result.secondHalfRemainingCents).toBeNull()
  })

  it('falta pagar = gasto abatido do pagamento antecipado menos os fixos pagos; o gasto e a sobra não mudam', async () => {
    const fixedExpenses = fixedExpensesMock(20_000, 8_000)
    const service = new BudgetPaceService(budgetMonthMock(300_000), invoicesMock(50_000, 12_000), fixedExpenses)

    const result = await service.getPace('user-1')

    expect(fixedExpenses.getFigures).toHaveBeenCalledWith('user-1', '2026-09')
    expect(result.paidFixedCents).toBe(8_000)
    expect(result.spentCents).toBe(70_000)
    expect(result.toPayCents).toBe(62_000)
    expect(result.remainingCents).toBe(230_000)
    expect(result.grossSpentCents).toBe(82_000)
  })

  it('fora do mês atual a marca de pago é ignorada: falta pagar é o próprio gasto', async () => {
    const fixedExpenses = fixedExpensesMock(20_000, 8_000)
    const service = new BudgetPaceService(budgetMonthMock(300_000, '2026-10'), invoicesMock(50_000), fixedExpenses)

    const result = await service.getPace('user-1', '2026-10')

    expect(result.paidFixedCents).toBe(0)
    expect(result.toPayCents).toBe(result.spentCents)
  })
})
