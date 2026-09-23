import type { Invoice } from '@gastos/shared'
import { BudgetPaceService } from './budget-pace.service'
import type { BudgetMonthService } from './budget-month.service'
import type { InvoiceService } from '../invoice/invoice.service'

function budgetMonthMock(variableCapCents: number) {
  return {
    getOrCreate: jest.fn().mockResolvedValue({
      month: '2026-09',
      incomeCents: 0,
      benefitCents: 0,
      fixedExpensesCents: 0,
      savingsGoalCents: 0,
      variableCapCents,
    }),
  } as unknown as jest.Mocked<BudgetMonthService>
}

function invoicesMock(mineCents: number) {
  const summary: Invoice = { totalCents: mineCents + 1000, mineCents, notMineCents: 1000 }
  return { getSummary: jest.fn().mockResolvedValue(summary) } as unknown as jest.Mocked<InvoiceService>
}

describe('BudgetPaceService', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-15T12:00:00.000Z'))
  })
  afterEach(() => jest.useRealTimers())

  it('junta o teto (BudgetMonth) com o gasto "meu" do mês (InvoiceService.getSummary) e calcula o ritmo', async () => {
    const budgetMonth = budgetMonthMock(300_000)
    const invoices = invoicesMock(50_000)
    const service = new BudgetPaceService(budgetMonth, invoices)

    const result = await service.getPace('user-1')

    expect(budgetMonth.getOrCreate).toHaveBeenCalledWith('user-1', undefined)
    expect(invoices.getSummary).toHaveBeenCalledWith('user-1', undefined)
    expect(result.capCents).toBe(300_000)
    expect(result.spentCents).toBe(50_000)
    expect(result.month).toBe('2026-09')
  })

  it('repassa o mês pedido pros dois lados', async () => {
    const budgetMonth = budgetMonthMock(100_000)
    const invoices = invoicesMock(0)
    const service = new BudgetPaceService(budgetMonth, invoices)

    await service.getPace('user-1', '2026-08')

    expect(budgetMonth.getOrCreate).toHaveBeenCalledWith('user-1', '2026-08')
    expect(invoices.getSummary).toHaveBeenCalledWith('user-1', '2026-08')
  })
})
