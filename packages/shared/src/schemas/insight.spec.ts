import { spendingBreakdownItemSchema, spendingReportSchema } from './insight'

function item(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    key: 'cat-1',
    label: 'Mercado',
    amountCents: 12000,
    previousMonthCents: 10000,
    vsPreviousMonthPercent: 20,
    averageLast3MonthsCents: 8000,
    vsAverageLast3MonthsPercent: 50,
    ...overrides,
  }
}

describe('spendingBreakdownItemSchema', () => {
  it('aceita a forma completa', () => {
    expect(spendingBreakdownItemSchema.safeParse(item()).success).toBe(true)
  })

  it('aceita percentuais nulos (sem base de comparação)', () => {
    const result = spendingBreakdownItemSchema.safeParse(
      item({ vsPreviousMonthPercent: null, vsAverageLast3MonthsPercent: null }),
    )
    expect(result.success).toBe(true)
  })

  it('rejeita campo extra', () => {
    expect(spendingBreakdownItemSchema.safeParse(item({ extra: 1 })).success).toBe(false)
  })
})

describe('spendingReportSchema', () => {
  it('aceita a forma completa', () => {
    const result = spendingReportSchema.safeParse({
      month: '2026-09',
      totalCents: 50000,
      byCategory: [item()],
      byMerchant: [item({ key: 'loja-x', label: 'Loja X' })],
      byPerson: [item({ key: 'person-1', label: 'Eu' })],
    })
    expect(result.success).toBe(true)
  })

  it('rejeita campo extra', () => {
    const result = spendingReportSchema.safeParse({
      month: '2026-09',
      totalCents: 0,
      byCategory: [],
      byMerchant: [],
      byPerson: [],
      extra: 1,
    })
    expect(result.success).toBe(false)
  })
})
