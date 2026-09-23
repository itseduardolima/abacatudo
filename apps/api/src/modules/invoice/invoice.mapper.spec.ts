import { computeInvoice, mergeInvoices, type InvoiceRow } from './invoice.mapper'

const SELF = 'self-1'
const FAMILY = 'family-1'

function row(overrides: Partial<InvoiceRow> = {}): InvoiceRow {
  return { kind: 'EXPENSE', amountCents: 1000, personId: SELF, splits: [], ...overrides }
}

describe('computeInvoice', () => {
  it('tudo meu: total = meu, não é meu = 0', () => {
    const result = computeInvoice([row({ amountCents: 1000 }), row({ amountCents: 500 })], SELF)
    expect(result).toEqual({ totalCents: 1500, mineCents: 1500, notMineCents: 0 })
  })

  it('gasto de outra pessoa não conta pra "meu", mas entra no total', () => {
    const result = computeInvoice(
      [row({ amountCents: 1000, personId: SELF }), row({ amountCents: 700, personId: FAMILY })],
      SELF,
    )
    expect(result).toEqual({ totalCents: 1700, mineCents: 1000, notMineCents: 700 })
  })

  it('estorno (REFUND) reduz o total e a fatia de quem tinha a compra', () => {
    const result = computeInvoice(
      [
        row({ kind: 'EXPENSE', amountCents: 1000, personId: SELF }),
        row({ kind: 'REFUND', amountCents: 300, personId: SELF }),
      ],
      SELF,
    )
    expect(result).toEqual({ totalCents: 700, mineCents: 700, notMineCents: 0 })
  })

  it('split conta só a fatia do self pra "meu", mesmo sem personId', () => {
    const result = computeInvoice(
      [
        row({
          amountCents: 1000,
          personId: null,
          splits: [
            { personId: SELF, amountCents: 400 },
            { personId: FAMILY, amountCents: 600 },
          ],
        }),
      ],
      SELF,
    )
    expect(result).toEqual({ totalCents: 1000, mineCents: 400, notMineCents: 600 })
  })

  it('invariante Fatura = Meu + Não é meu, sempre', () => {
    const rows: InvoiceRow[] = [
      row({ amountCents: 1000, personId: SELF }),
      row({ amountCents: 700, personId: FAMILY }),
      row({ kind: 'REFUND', amountCents: 200, personId: SELF }),
      row({
        amountCents: 900,
        personId: null,
        splits: [
          { personId: SELF, amountCents: 300 },
          { personId: FAMILY, amountCents: 600 },
        ],
      }),
    ]
    const result = computeInvoice(rows, SELF)
    expect(result.totalCents).toBe(result.mineCents + result.notMineCents)
  })

  it('sem linhas, tudo zero', () => {
    expect(computeInvoice([], SELF)).toEqual({ totalCents: 0, mineCents: 0, notMineCents: 0 })
  })
})

describe('mergeInvoices', () => {
  it('soma cada campo de várias faturas', () => {
    const result = mergeInvoices([
      { totalCents: 1000, mineCents: 700, notMineCents: 300 },
      { totalCents: 500, mineCents: 500, notMineCents: 0 },
    ])
    expect(result).toEqual({ totalCents: 1500, mineCents: 1200, notMineCents: 300 })
  })

  it('sem faturas, tudo zero', () => {
    expect(mergeInvoices([])).toEqual({ totalCents: 0, mineCents: 0, notMineCents: 0 })
  })
})
