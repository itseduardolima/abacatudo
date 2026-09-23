import { installmentGroupKey, keepCurrentInstallmentsOnly } from './installment-group'

interface TestRow {
  id: string
  billId: string | null
  description: string
  occurredAt: Date
  installmentNumber: number | null
  installmentTotal: number | null
}

const OCCURRED_AT = new Date('2026-09-04T12:00:00.000Z')

function row(overrides: Partial<TestRow> = {}): TestRow {
  return {
    id: 'tx-1',
    billId: null,
    description: 'Ebn*Playstati',
    occurredAt: OCCURRED_AT,
    installmentNumber: null,
    installmentTotal: null,
    ...overrides,
  }
}

describe('installmentGroupKey', () => {
  it('tira o "N/M" do fim da descrição pra agrupar', () => {
    const a = installmentGroupKey({ description: 'Compra 1/3', occurredAt: OCCURRED_AT, installmentTotal: 3 })
    const b = installmentGroupKey({ description: 'Compra 2/3', occurredAt: OCCURRED_AT, installmentTotal: 3 })
    expect(a).toBe(b)
  })

  it('compras diferentes no mesmo dia com o mesmo nome não se misturam se o total de parcelas for diferente', () => {
    const a = installmentGroupKey({ description: 'Compra 1/3', occurredAt: OCCURRED_AT, installmentTotal: 3 })
    const b = installmentGroupKey({ description: 'Compra 1/6', occurredAt: OCCURRED_AT, installmentTotal: 6 })
    expect(a).not.toBe(b)
  })
})

describe('keepCurrentInstallmentsOnly', () => {
  it('compra parcelada sem billId: mantém só a parcela de menor número, descarta as futuras', () => {
    const rows = [
      row({ id: 'p2', description: 'Ebn*Playstati 2/3', installmentNumber: 2, installmentTotal: 3 }),
      row({ id: 'p3', description: 'Ebn*Playstati 3/3', installmentNumber: 3, installmentTotal: 3 }),
      row({ id: 'p1', description: 'Ebn*Playstati 1/3', installmentNumber: 1, installmentTotal: 3 }),
    ]

    const result = keepCurrentInstallmentsOnly(rows)

    expect(result.map((r) => r.id)).toEqual(['p1'])
  })

  it('linha já faturada (billId preenchido) sempre passa, mesmo sendo parcela', () => {
    const rows = [
      row({ id: 'billed-2', billId: 'bill-1', installmentNumber: 2, installmentTotal: 3 }),
      row({ id: 'open-1', installmentNumber: 1, installmentTotal: 3 }),
    ]

    const result = keepCurrentInstallmentsOnly(rows)

    expect(result.map((r) => r.id).sort()).toEqual(['billed-2', 'open-1'])
  })

  it('linha sem parcela (compra normal, pagamento) sempre passa direto', () => {
    const rows = [row({ id: 'normal' }), row({ id: 'payment', description: 'Pagamento recebido' })]

    expect(keepCurrentInstallmentsOnly(rows).map((r) => r.id)).toEqual(['normal', 'payment'])
  })

  it('grupos diferentes não se misturam', () => {
    const rows = [
      row({ id: 'a1', description: 'Compra A 1/2', installmentNumber: 1, installmentTotal: 2 }),
      row({ id: 'b1', description: 'Compra B 1/4', installmentNumber: 1, installmentTotal: 4 }),
    ]

    expect(
      keepCurrentInstallmentsOnly(rows)
        .map((r) => r.id)
        .sort(),
    ).toEqual(['a1', 'b1'])
  })

  it('sem linhas, sem linhas', () => {
    expect(keepCurrentInstallmentsOnly([])).toEqual([])
  })
})
