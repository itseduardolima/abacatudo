import { buildBreakdown, sumByCategory, sumByMerchant, sumByPerson, totalCents } from './insight.mapper'
import type { SpendingRow } from './insight.mapper'

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

describe('insight.mapper', () => {
  describe('totalCents', () => {
    it('soma EXPENSE e subtrai REFUND', () => {
      const rows = [row({ amountCents: 10000 }), row({ kind: 'REFUND', amountCents: 3000 })]
      expect(totalCents(rows)).toBe(7000)
    })
  })

  describe('sumByCategory', () => {
    it('agrupa por categoryId, cai em "Sem categoria" quando nulo', () => {
      const rows = [
        row({ categoryId: 'cat-1', categoryName: 'Mercado', amountCents: 5000 }),
        row({ categoryId: 'cat-1', categoryName: 'Mercado', amountCents: 3000 }),
        row({ categoryId: null, categoryName: null, amountCents: 1000 }),
      ]
      const buckets = sumByCategory(rows)
      expect(buckets.get('cat-1')).toEqual({ label: 'Mercado', amountCents: 8000 })
      expect(buckets.get('sem-categoria')).toEqual({ label: 'Sem categoria', amountCents: 1000 })
    })
  })

  describe('sumByMerchant', () => {
    it('normaliza (trim + lowercase) pra não separar "Loja X" de "loja x "', () => {
      const rows = [row({ merchant: 'Loja X', amountCents: 5000 }), row({ merchant: 'loja x ', amountCents: 3000 })]
      const buckets = sumByMerchant(rows)
      expect(buckets.get('loja x')).toEqual({ label: 'Loja X', amountCents: 8000 })
    })

    it('cai em "Sem estabelecimento" quando nulo', () => {
      const buckets = sumByMerchant([row({ merchant: null, amountCents: 1000 })])
      expect(buckets.get('sem-estabelecimento')).toEqual({ label: 'Sem estabelecimento', amountCents: 1000 })
    })
  })

  describe('sumByPerson', () => {
    it('sem split: tudo pra pessoa da transação', () => {
      const buckets = sumByPerson([row({ personId: 'person-1', personName: 'Eu', amountCents: 5000 })])
      expect(buckets.get('person-1')).toEqual({ label: 'Eu', amountCents: 5000 })
    })

    it('com split: cada fatia pra sua pessoa, nunca a transação inteira pra uma só', () => {
      const rows = [
        row({
          amountCents: 10000,
          splits: [
            { personId: 'person-1', personName: 'Eu', amountCents: 6000 },
            { personId: 'person-2', personName: 'Cônjuge', amountCents: 4000 },
          ],
        }),
      ]
      const buckets = sumByPerson(rows)
      expect(buckets.get('person-1')).toEqual({ label: 'Eu', amountCents: 6000 })
      expect(buckets.get('person-2')).toEqual({ label: 'Cônjuge', amountCents: 4000 })
    })

    it('REFUND com split reduz a fatia de cada pessoa (sinal aplicado antes do split)', () => {
      const rows = [
        row({
          kind: 'REFUND',
          amountCents: 10000,
          splits: [{ personId: 'person-1', personName: 'Eu', amountCents: 10000 }],
        }),
      ]
      const buckets = sumByPerson(rows)
      expect(buckets.get('person-1')).toEqual({ label: 'Eu', amountCents: -10000 })
    })
  })

  describe('buildBreakdown', () => {
    it('só inclui grupos com gasto no mês atual, ordenado do maior pro menor', () => {
      const current = sumByCategory([
        row({ categoryId: 'cat-1', categoryName: 'Mercado', amountCents: 3000 }),
        row({ categoryId: 'cat-2', categoryName: 'Lazer', amountCents: 9000 }),
      ])
      const previous = sumByCategory([row({ categoryId: 'cat-9', categoryName: 'Só mês passado', amountCents: 500 })])
      const items = buildBreakdown(current, previous, [previous, previous, previous])

      expect(items.map((i) => i.key)).toEqual(['cat-2', 'cat-1'])
    })

    it('vsPreviousMonthPercent é null quando o mês anterior é zero', () => {
      const current = sumByCategory([row({ categoryId: 'cat-1', categoryName: 'Mercado', amountCents: 5000 })])
      const empty = new Map()
      const items = buildBreakdown(current, empty, [empty, empty, empty])

      expect(items[0]).toMatchObject({ previousMonthCents: 0, vsPreviousMonthPercent: null })
    })

    it('calcula variação vs. mês anterior e média dos 3 meses anteriores', () => {
      const current = sumByCategory([row({ categoryId: 'cat-1', categoryName: 'Mercado', amountCents: 12000 })])
      const previous = sumByCategory([row({ categoryId: 'cat-1', categoryName: 'Mercado', amountCents: 10000 })])
      const m2 = sumByCategory([row({ categoryId: 'cat-1', categoryName: 'Mercado', amountCents: 8000 })])
      const m3 = sumByCategory([row({ categoryId: 'cat-1', categoryName: 'Mercado', amountCents: 6000 })])
      const items = buildBreakdown(current, previous, [previous, m2, m3])

      expect(items[0]).toMatchObject({
        vsPreviousMonthPercent: 20, // (12000-10000)/10000
        averageLast3MonthsCents: 8000, // (10000+8000+6000)/3
        vsAverageLast3MonthsPercent: 50, // (12000-8000)/8000
      })
    })
  })
})
