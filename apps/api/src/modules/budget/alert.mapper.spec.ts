import { crossedThresholds, percentUsed, sumSelfSpentByCategory } from './alert.mapper'

const SELF = 'person-self'
const OTHER = 'person-other'

describe('sumSelfSpentByCategory', () => {
  it('soma só a fatia do self: sem split é tudo ou nada pela pessoa da transação', () => {
    const { totalCents, byCategoryCents } = sumSelfSpentByCategory(
      [
        { categoryId: 'cat-1', amountCents: 10000, personId: SELF, splits: [] },
        { categoryId: 'cat-1', amountCents: 5000, personId: OTHER, splits: [] },
      ],
      SELF,
    )

    expect(totalCents).toBe(10000)
    expect(byCategoryCents.get('cat-1')).toBe(10000)
  })

  it('com split, conta só a fatia do self dentro dele', () => {
    const { totalCents, byCategoryCents } = sumSelfSpentByCategory(
      [
        {
          categoryId: 'cat-1',
          amountCents: 10000,
          personId: null,
          splits: [
            { personId: SELF, amountCents: 4000 },
            { personId: OTHER, amountCents: 6000 },
          ],
        },
      ],
      SELF,
    )

    expect(totalCents).toBe(4000)
    expect(byCategoryCents.get('cat-1')).toBe(4000)
  })

  it('separa por categoria e soma o total geral', () => {
    const { totalCents, byCategoryCents } = sumSelfSpentByCategory(
      [
        { categoryId: 'cat-1', amountCents: 10000, personId: SELF, splits: [] },
        { categoryId: 'cat-2', amountCents: 3000, personId: SELF, splits: [] },
        { categoryId: 'cat-1', amountCents: 2000, personId: SELF, splits: [] },
      ],
      SELF,
    )

    expect(totalCents).toBe(15000)
    expect(byCategoryCents.get('cat-1')).toBe(12000)
    expect(byCategoryCents.get('cat-2')).toBe(3000)
  })

  it('categoria nula (sem categoria ainda) entra no total mas não em nenhuma categoria', () => {
    const { totalCents, byCategoryCents } = sumSelfSpentByCategory(
      [{ categoryId: null, amountCents: 10000, personId: SELF, splits: [] }],
      SELF,
    )

    expect(totalCents).toBe(10000)
    expect(byCategoryCents.size).toBe(0)
  })
})

describe('percentUsed', () => {
  it('calcula o percentual e arredonda pra baixo', () => {
    expect(percentUsed(21000, 30000)).toBe(70)
    expect(percentUsed(29999, 30000)).toBe(99)
  })

  it('sem teto (0): qualquer gasto já é 100%, sem gasto é 0%, nunca divide por zero', () => {
    expect(percentUsed(1, 0)).toBe(100)
    expect(percentUsed(0, 0)).toBe(0)
  })
})

describe('crossedThresholds', () => {
  it('devolve só os limiares batidos, na ordem 70/90/100', () => {
    expect(crossedThresholds(50)).toEqual([])
    expect(crossedThresholds(70)).toEqual([70])
    expect(crossedThresholds(95)).toEqual([70, 90])
    expect(crossedThresholds(100)).toEqual([70, 90, 100])
  })
})
