import type { FixedExpense } from '@gastos/shared'
import { FixedExpensesSection } from './fixed-expenses-section'

const expenses: FixedExpense[] = [
  {
    id: 'fe-1',
    name: 'Aluguel',
    amountCents: 120000,
    half: 1,
    paid: true,
    archivedAt: null,
    createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'fe-2',
    name: 'Internet',
    amountCents: 9990,
    half: 2,
    paid: false,
    archivedAt: null,
    createdAt: '2026-09-01T00:00:00.000Z',
  },
]

describe('FixedExpensesSection', () => {
  it('mostra quantos estão pagos e o estado de cada um', () => {
    cy.mount(<FixedExpensesSection expenses={expenses} pendingId={null} error={null} onToggle={cy.stub()} />)
    cy.contains('1 de 2 pagos').should('exist')
    cy.get('[aria-label="Aluguel pago"]').should('have.attr', 'aria-checked', 'true')
    cy.get('[aria-label="Internet pago"]').should('have.attr', 'aria-checked', 'false')
  })

  it('tocar num pendente marca como pago, e num pago desmarca', () => {
    const onToggle = cy.stub().as('onToggle')
    cy.mount(<FixedExpensesSection expenses={expenses} pendingId={null} error={null} onToggle={onToggle} />)
    cy.get('[aria-label="Internet pago"]').click()
    cy.get('@onToggle').should('have.been.calledWith', 'fe-2', true)
    cy.get('[aria-label="Aluguel pago"]').click()
    cy.get('@onToggle').should('have.been.calledWith', 'fe-1', false)
  })

  it('trava só o item que está salvando', () => {
    cy.mount(<FixedExpensesSection expenses={expenses} pendingId="fe-2" error={null} onToggle={cy.stub()} />)
    cy.get('[aria-label="Internet pago"]').should('be.disabled')
    cy.get('[aria-label="Aluguel pago"]').should('not.be.disabled')
  })

  it('mostra a mensagem de erro da API, sem toast', () => {
    cy.mount(
      <FixedExpensesSection
        expenses={expenses}
        pendingId={null}
        error="Gasto fixo não encontrado."
        onToggle={cy.stub()}
      />,
    )
    cy.get('[role="alert"]').should('contain', 'Gasto fixo não encontrado.')
  })
})
