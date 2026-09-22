import { envelopeCapCents } from './envelope.mapper'

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
