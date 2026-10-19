import type { FixedExpense } from '@gastos/shared'
import { FixedExpensesSection } from './fixed-expenses-section'

const base = { archivedAt: null, createdAt: '2026-09-01T00:00:00.000Z' }

const expenses: FixedExpense[] = [
  {
    ...base,
    id: 'fe-1',
    name: 'Aluguel',
    amountCents: 120000,
    half: 1,
    shares: [{ half: 1, amountCents: 120000, paid: true }],
  },
  {
    ...base,
    id: 'fe-2',
    name: 'Internet',
    amountCents: 9990,
    half: 2,
    shares: [{ half: 2, amountCents: 9990, paid: false }],
  },
  {
    ...base,
    id: 'fe-3',
    name: 'Carro',
    amountCents: 142713,
    half: 3,
    shares: [
      { half: 1, amountCents: 71356, paid: false },
      { half: 2, amountCents: 71357, paid: false },
    ],
  },
]

function mountSection(overrides: Partial<Parameters<typeof FixedExpensesSection>[0]> = {}) {
  cy.mount(
    <FixedExpensesSection
      expenses={expenses}
      currentHalf={2}
      pendingKey={null}
      error={null}
      onToggle={cy.stub().as('onToggle')}
      {...overrides}
    />,
  )
}

describe('FixedExpensesSection', () => {
  it('separa por quinzena: o dividido aparece nas duas, com a metade de cada uma', () => {
    mountSection()
    cy.contains('1ª quinzena').parent().parent().should('contain', 'Aluguel').and('contain', 'Carro')
    cy.contains('2ª quinzena').parent().parent().should('contain', 'Internet').and('contain', 'Carro')
    cy.contains('2ª quinzena').parent().parent().should('not.contain', 'Aluguel')
    cy.get('li').filter(':contains("Carro")').should('have.length', 2).and('contain', 'metade')
  })

  it('conta os pagos de cada quinzena', () => {
    mountSection()
    cy.contains('1ª quinzena').parent().should('contain', '1 de 2 pagos')
    cy.contains('2ª quinzena').parent().should('contain', '0 de 2 pagos')
  })

  it('destaca a quinzena atual', () => {
    mountSection({ currentHalf: 2 })
    cy.get('[data-current="true"]').should('have.length', 1).and('contain', '2ª quinzena')
  })

  it('marca e desmarca por quinzena, com a quinzena certa', () => {
    mountSection()
    cy.get('[aria-label="Internet pago na 2ª quinzena"]').click()
    cy.get('@onToggle').should('have.been.calledWith', 'fe-2', 2, true)
    cy.get('[aria-label="Aluguel pago na 1ª quinzena"]').should('have.attr', 'aria-checked', 'true').click()
    cy.get('@onToggle').should('have.been.calledWith', 'fe-1', 1, false)
    cy.get('[aria-label="Carro pago na 1ª quinzena"]').click()
    cy.get('@onToggle').should('have.been.calledWith', 'fe-3', 1, true)
  })

  it('trava só a parte que está salvando', () => {
    mountSection({ pendingKey: 'fe-3:2' })
    cy.get('[aria-label="Carro pago na 2ª quinzena"]').should('be.disabled')
    cy.get('[aria-label="Carro pago na 1ª quinzena"]').should('not.be.disabled')
  })

  it('mostra a mensagem de erro da API, sem toast', () => {
    mountSection({ error: 'Gasto fixo não encontrado.' })
    cy.get('[role="alert"]').should('contain', 'Gasto fixo não encontrado.')
  })
})
