import { MonthStepper } from './MonthStepper'

describe('MonthStepper', () => {
  it('mostra o mês e chama as duas setas', () => {
    const onPrevious = cy.stub().as('onPrevious')
    const onNext = cy.stub().as('onNext')
    cy.mount(<MonthStepper label="setembro 2026" onPrevious={onPrevious} onNext={onNext} />)
    cy.contains('setembro 2026').should('be.visible')
    cy.get('[aria-label="Mês anterior"]').click()
    cy.get('[aria-label="Próximo mês"]').click()
    cy.get('@onPrevious').should('have.been.calledOnce')
    cy.get('@onNext').should('have.been.calledOnce')
  })
})
