import { Injectable } from '@nestjs/common'
import type { AlertThreshold } from '@gastos/shared'
import { resolveMonthRange } from '../../common/date/timezone'
import { DomainError } from '../../common/errors/domain.error'
import { PersonRepository } from '../person/person.repository'
import { AlertRepository } from './alert.repository'
import { crossedThresholds, percentUsed, sumSelfSpentByCategory } from './alert.mapper'

export interface AlertStatus {
  spentCents: number
  percentUsed: number
  firedThresholds: AlertThreshold[]
}

@Injectable()
export class AlertService {
  constructor(
    private readonly repo: AlertRepository,
    private readonly people: PersonRepository,
  ) {}

  // Uma query só pro mês inteiro: dá o total (pro alerta do teto variável) e o por-categoria (pro alerta
  // de cada envelope) de uma vez — evita 1 query por envelope na listagem.
  async monthSpend(
    userId: string,
    month: string,
  ): Promise<{ totalCents: number; byCategoryCents: Map<string, number> }> {
    const selfId = await this.selfPersonId(userId)
    const rows = await this.repo.findExpenseRows(userId, resolveMonthRange(month))
    return sumSelfSpentByCategory(rows, selfId)
  }

  async categorySpentCents(userId: string, categoryId: string, month: string): Promise<number> {
    const selfId = await this.selfPersonId(userId)
    const rows = await this.repo.findExpenseRows(userId, resolveMonthRange(month), categoryId)
    return sumSelfSpentByCategory(rows, selfId).totalCents
  }

  // Registra (idempotente) os limiares batidos pelo gasto atual e devolve todos os já disparados neste
  // envelope — "dispara uma vez por mês" porque cada Envelope pertence a um único BudgetMonth
  // (03-regras-negocio § Orçamento mensal); virar o mês é um Envelope novo, com alertas zerados.
  async envelopeAlert(userId: string, envelopeId: string, spentCents: number, capCents: number): Promise<AlertStatus> {
    const percent = await this.recordCrossed(spentCents, capCents, (threshold) =>
      this.repo.recordEnvelopeThreshold(userId, envelopeId, threshold),
    )
    const firedThresholds = await this.repo.findFiredEnvelopeThresholds(userId, envelopeId)
    return { spentCents, percentUsed: percent, firedThresholds }
  }

  async budgetMonthAlert(
    userId: string,
    budgetMonthId: string,
    spentCents: number,
    capCents: number,
  ): Promise<AlertStatus> {
    const percent = await this.recordCrossed(spentCents, capCents, (threshold) =>
      this.repo.recordBudgetMonthThreshold(userId, budgetMonthId, threshold),
    )
    const firedThresholds = await this.repo.findFiredBudgetMonthThresholds(userId, budgetMonthId)
    return { spentCents, percentUsed: percent, firedThresholds }
  }

  private async recordCrossed(
    spentCents: number,
    capCents: number,
    record: (threshold: AlertThreshold) => Promise<void>,
  ): Promise<number> {
    const percent = percentUsed(spentCents, capCents)
    for (const threshold of crossedThresholds(percent)) {
      await record(threshold)
    }
    return percent
  }

  private async selfPersonId(userId: string): Promise<string> {
    const self = await this.people.findSelf(userId)
    if (!self) throw new DomainError('SELF_PERSON_NOT_FOUND', 'Pessoa "Eu" não encontrada.', 500)
    return self.id
  }
}
