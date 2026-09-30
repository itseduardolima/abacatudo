import { dateKey } from '../../common/date/timezone'
import {
  computeMovementReport,
  filterPixRowsByRecipient,
  groupPixRecipients,
  normalizeRecipientKey,
  type ReportRow,
} from './movement-report.mapper'

function row(overrides: Partial<ReportRow> = {}): ReportRow {
  return {
    kind: 'EXPENSE',
    amountCents: 1000,
    occurredAt: new Date('2026-09-10T15:00:00.000Z'),
    description: 'Compra',
    ...overrides,
  }
}

function report(rows: ReportRow[], overrides: Partial<Parameters<typeof computeMovementReport>[0]> = {}) {
  return computeMovementReport({
    rows,
    month: '2026-09',
    balanceCents: 30000,
    currentMonthKey: '2026-09',
    todayDayOfMonth: 11,
    dayKeyOf: dateKey,
    ...overrides,
  })
}

describe('computeMovementReport', () => {
  it('entradas, saídas e resultado; pagamento de fatura é saída, TRANSFER não conta', () => {
    const result = report([
      row({ kind: 'INCOME', amountCents: 50000 }),
      row({ kind: 'EXPENSE', amountCents: 12000 }),
      row({ kind: 'CARD_PAYMENT', amountCents: 8000 }),
      row({ kind: 'TRANSFER', amountCents: 99999 }),
    ])

    expect(result).toMatchObject({ incomeCents: 50000, expenseCents: 20000, resultCents: 30000 })
  })

  it('saídas por dia cobrem o mês inteiro, com acumulado, no fuso de Manaus', () => {
    const result = report([
      row({ amountCents: 1000, occurredAt: new Date('2026-09-01T12:00:00.000Z') }),
      row({ amountCents: 500, occurredAt: new Date('2026-09-01T18:00:00.000Z') }),
      row({ amountCents: 700, occurredAt: new Date('2026-09-03T12:00:00.000Z') }),
      row({ amountCents: 300, occurredAt: new Date('2026-10-01T02:00:00.000Z') }),
    ])

    expect(result.daily).toHaveLength(30)
    expect(result.daily[0]).toEqual({ day: '2026-09-01', expenseCents: 1500, cumulativeExpenseCents: 1500 })
    expect(result.daily[1]).toEqual({ day: '2026-09-02', expenseCents: 0, cumulativeExpenseCents: 1500 })
    expect(result.daily[2]).toEqual({ day: '2026-09-03', expenseCents: 700, cumulativeExpenseCents: 2200 })
    expect(result.daily[29]).toEqual({ day: '2026-09-30', expenseCents: 300, cumulativeExpenseCents: 2500 })
  })

  it('invariante: soma das saídas por dia = saídas do mês, e entradas − saídas = resultado', () => {
    const result = report([
      row({ kind: 'INCOME', amountCents: 40000 }),
      row({ amountCents: 1234, occurredAt: new Date('2026-09-05T12:00:00.000Z') }),
      row({ amountCents: 4321, occurredAt: new Date('2026-09-20T12:00:00.000Z') }),
    ])

    expect(result.daily.reduce((sum, day) => sum + day.expenseCents, 0)).toBe(result.expenseCents)
    expect(result.incomeCents - result.expenseCents).toBe(result.resultCents)
  })

  it('ritmo: saldo ÷ dias restantes (contando hoje), só no mês atual', () => {
    const result = report([], { balanceCents: 30000, todayDayOfMonth: 11 })

    expect(result.pace).toEqual({ daysRemaining: 20, perDayCents: 1500 })
  })

  it('sem ritmo em mês que não é o atual ou sem saldo conhecido; saldo negativo vira zero por dia', () => {
    expect(report([], { month: '2026-08' }).pace).toBeNull()
    expect(report([], { balanceCents: null }).pace).toBeNull()
    expect(report([], { balanceCents: -500 }).pace).toEqual({ daysRemaining: 20, perDayCents: 0 })
  })
})

describe('normalizeRecipientKey', () => {
  it('ignora acento, caixa e espaços repetidos', () => {
    expect(normalizeRecipientKey('  JOSÉ  da   Conceição ')).toBe('jose da conceicao')
  })
})

describe('groupPixRecipients', () => {
  const rows = [
    row({
      description: 'Pix Karine Almeida de Oliveira',
      amountCents: 1700,
      occurredAt: new Date('2026-09-24T12:00:00.000Z'),
    }),
    row({
      description: 'Pix Karine Almeida De Oliveira',
      amountCents: 500,
      occurredAt: new Date('2026-09-21T12:00:00.000Z'),
    }),
    row({ description: 'Pix Eduardo Lima Castro', amountCents: 3000 }),
    row({ description: 'Pix Eduardo Lima Castro', amountCents: 6000 }),
    row({ description: 'Pix José da Rocha', amountCents: 1000 }),
    row({ description: 'Pix Recebido Fulano', kind: 'INCOME', amountCents: 9999 }),
    row({ description: 'UBER DO BRASIL', amountCents: 5000 }),
    row({ description: 'Pix ', amountCents: 800 }),
  ]

  it('junta grafias diferentes do mesmo nome, soma, conta e guarda o último, do maior total pro menor', () => {
    const recipients = groupPixRecipients(rows)

    expect(recipients.map((r) => [r.name, r.totalCents, r.count])).toEqual([
      ['Eduardo Lima Castro', 9000, 2],
      ['Karine Almeida de Oliveira', 2200, 2],
      ['José da Rocha', 1000, 1],
    ])
    expect(recipients[1]?.lastAt).toBe('2026-09-24T12:00:00.000Z')
  })

  it('só Pix enviado entra: entrada, compra e Pix sem nome ficam de fora; soma = total dos Pix enviados', () => {
    const recipients = groupPixRecipients(rows)
    const total = recipients.reduce((sum, r) => sum + r.totalCents, 0)

    expect(total).toBe(1700 + 500 + 3000 + 6000 + 1000)
  })

  it('busca ignora acento e caixa', () => {
    expect(groupPixRecipients(rows, 'JOSE').map((r) => r.name)).toEqual(['José da Rocha'])
    expect(groupPixRecipients(rows, 'inexistente')).toEqual([])
  })

  it('filterPixRowsByRecipient devolve só os Pix daquele favorecido', () => {
    const filtered = filterPixRowsByRecipient(rows, 'karine almeida de oliveira')

    expect(filtered).toHaveLength(2)
    expect(filtered.every((r) => r.description.toLowerCase().includes('karine'))).toBe(true)
  })
})
