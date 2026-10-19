import type { BudgetPace } from '@gastos/shared'
import { FortnightHeroCard } from './fortnight-hero-card'
import { PaceHeroCard } from './pace-hero-card'
import { ToPayHeroCard } from './to-pay-hero-card'

const pace: BudgetPace = {
  month: '2026-10',
  capCents: 565145,
  spentCents: 360144,
  advancePaidCents: 60000,
  grossSpentCents: 420144,
  paidFixedCents: 120000,
  toPayCents: 240144,
  cardsMineCents: 200000,
  remainingCents: 205001,
  daysInMonth: 31,
  daysElapsed: 18,
  daysRemaining: 13,
  expectedByNowCents: 328000,
  diffCents: -32144,
  status: 'OVER_PACE',
  perDayRemainingCents: 15769,
  firstHalfCapCents: 283800,
  firstHalfSpentCents: 260971,
  firstHalfRemainingCents: 22829,
  secondHalfCapCents: 281345,
  secondHalfSpentCents: 99345,
  secondHalfRemainingCents: 182000,
  currentHalf: 2,
  currentHalfRemainingCents: 182000,
}

function rootText() {
  return cy
    .get('[data-cy-root]')
    .find('*')
    .not('style')
    .then(($nodes) =>
      $nodes
        .first()
        .text()
        .replace(/\u00a0/g, ' '),
    )
}

function shows(...values: string[]) {
  rootText().then((value) => values.forEach((expected) => expect(value).to.contain(expected)))
}

function hides(expected: string) {
  rootText().then((value) => expect(value).not.to.contain(expected))
}

describe('PaceHeroCard', () => {
  it('mostra o gasto bruto do mês e a renda, sem quinzena', () => {
    cy.mount(<PaceHeroCard pace={pace} />)
    shows('Meu em outubro', 'R$ 4.201,44', 'R$ 5.651,45')
    hides('quinzena')
  })

  it('prefixa "previsto" em mês futuro', () => {
    cy.mount(<PaceHeroCard pace={{ ...pace, month: '2099-01' }} />)
    shows('Meu previsto em janeiro')
  })

  it('trava a barra em 100% quando o gasto passa da renda', () => {
    cy.mount(<PaceHeroCard pace={{ ...pace, grossSpentCents: 900000 }} />)
    cy.get('[data-testid="spent-bar"]').should('have.attr', 'style').and('contain', 'width: 100%')
  })

  it('barra vazia quando não há renda informada', () => {
    cy.mount(<PaceHeroCard pace={{ ...pace, capCents: 0 }} />)
    cy.get('[data-testid="spent-bar"]').should('have.attr', 'style').and('contain', 'width: 0%')
  })
})

describe('ToPayHeroCard', () => {
  it('mostra o que falta pagar, o pagamento antecipado, os fixos pagos e o que sobra', () => {
    cy.mount(<ToPayHeroCard pace={pace} />)
    shows('Falta pagar', 'R$ 2.401,44', 'já pago adiantado', 'R$ 600,00', 'fixos pagos', 'R$ 1.200,00', 'R$ 2.050,01')
  })

  it('esconde as linhas de pagamento antecipado e de fixos pagos quando não há', () => {
    cy.mount(<ToPayHeroCard pace={{ ...pace, advancePaidCents: 0, paidFixedCents: 0 }} />)
    hides('já pago adiantado')
    hides('fixos pagos')
  })

  it('mostra sobra negativa com o sinal de menos', () => {
    cy.mount(<ToPayHeroCard pace={{ ...pace, remainingCents: -5000 }} />)
    shows('−R$ 50,00')
  })
})

describe('FortnightHeroCard', () => {
  it('destaca a 2ª quinzena quando ela é a atual', () => {
    cy.mount(<FortnightHeroCard pace={pace} />)
    cy.get('[data-current="true"]').should('have.length', 1).and('contain', '2ª quinzena')
    cy.get('[data-current="false"]').should('contain', '1ª quinzena')
    shows('R$ 2.609,71', 'R$ 2.838,00', 'R$ 1.820,00')
  })

  it('destaca a 1ª e mostra traço na 2ª, que ainda não tem gasto', () => {
    cy.mount(
      <FortnightHeroCard
        pace={{ ...pace, currentHalf: 1, secondHalfSpentCents: null, secondHalfRemainingCents: null }}
      />,
    )
    cy.get('[data-current="true"]').should('contain', '1ª quinzena')
    cy.get('[data-current="false"]').should('contain', '—')
    shows('R$ 2.813,45')
  })

  it('sem quinzena atual (outro mês), nenhuma fica destacada e a 1ª mostra traço', () => {
    cy.mount(
      <FortnightHeroCard
        pace={{
          ...pace,
          currentHalf: null,
          firstHalfSpentCents: null,
          firstHalfRemainingCents: null,
          secondHalfSpentCents: null,
          secondHalfRemainingCents: null,
        }}
      />,
    )
    cy.get('[data-current="true"]').should('not.exist')
  })
})
