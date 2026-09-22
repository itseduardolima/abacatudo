import type { Envelope as EnvelopeRow } from '@prisma/client'
import { envelopeCapCents, toEnvelopeDto } from './envelope.mapper'

describe('envelopeCapCents', () => {
  it('valor fixo: capCents é o próprio valor, ignora o teto', () => {
    expect(envelopeCapCents({ amountCents: 30000, percent: null }, 310000)).toBe(30000)
  })

  it('percentual: calcula sobre o teto variável e arredonda', () => {
    expect(envelopeCapCents({ amountCents: null, percent: 10 }, 310000)).toBe(31000)
    expect(envelopeCapCents({ amountCents: null, percent: 33 }, 100)).toBe(33) // 33.0 exato
    expect(envelopeCapCents({ amountCents: null, percent: 1 }, 99)).toBe(1) // 0.99 → arredonda pra 1
  })

  it('nenhum dos dois (não deveria acontecer, CHECK no banco impede): zero', () => {
    expect(envelopeCapCents({ amountCents: null, percent: null }, 310000)).toBe(0)
  })
})

describe('toEnvelopeDto', () => {
  it('junta os campos do envelope com o status de alerta já calculado', () => {
    const row = {
      id: 'env-1',
      userId: 'user-1',
      budgetMonthId: 'bm-1',
      categoryId: 'cat-1',
      amountCents: 30000,
      percent: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies EnvelopeRow

    const dto = toEnvelopeDto(row, 30000, { spentCents: 21000, percentUsed: 70, firedThresholds: [70] })

    expect(dto).toEqual({
      id: 'env-1',
      categoryId: 'cat-1',
      amountCents: 30000,
      percent: null,
      capCents: 30000,
      spentCents: 21000,
      percentUsed: 70,
      firedThresholds: [70],
    })
  })
})
