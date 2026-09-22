import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { Envelope as EnvelopeRow } from '@prisma/client'
import type { CreateEnvelopeInput, Envelope, EnvelopeList, UpdateEnvelopeInput } from '@gastos/shared'
import { AlertService } from '../budget/alert.service'
import { assertMonthOpen, BudgetMonthService } from '../budget/budget-month.service'
import { computeVariableCapCents } from '../budget/budget.mapper'
import { CategoryRepository } from '../category/category.repository'
import { ConflictError, NotFoundError } from '../../common/errors/domain.error'
import { EnvelopeRepository } from './envelope.repository'
import { envelopeCapCents, toEnvelopeDto } from './envelope.mapper'

const NOT_FOUND = () => new NotFoundError('ENVELOPE_NOT_FOUND', 'Envelope não encontrado.')

@Injectable()
export class EnvelopeService {
  constructor(
    private readonly repo: EnvelopeRepository,
    private readonly budgetMonths: BudgetMonthService,
    private readonly categories: CategoryRepository,
    private readonly alerts: AlertService,
  ) {}

  async list(userId: string, month?: string): Promise<EnvelopeList> {
    const { id: budgetMonthId, month: key, variableCapCents } = await this.budgetMonths.requireId(userId, month)
    const rows = await this.repo.findMany(userId, budgetMonthId)
    // 1 query só pro mês inteiro (total + por categoria), em vez de 1 query de gasto por envelope.
    const { totalCents, byCategoryCents } = await this.alerts.monthSpend(userId, key)

    const envelopes: Envelope[] = []
    for (const row of rows) {
      const capCents = envelopeCapCents(row, variableCapCents)
      const spentCents = byCategoryCents.get(row.categoryId) ?? 0
      const alert = await this.alerts.envelopeAlert(userId, row.id, spentCents, capCents)
      envelopes.push(toEnvelopeDto(row, capCents, alert))
    }

    const allocatedCents = envelopes.reduce((sum, envelope) => sum + envelope.capCents, 0)
    const totalAlert = await this.alerts.budgetMonthAlert(userId, budgetMonthId, totalCents, variableCapCents)
    return {
      variableCapCents,
      allocatedCents,
      freeCents: variableCapCents - allocatedCents,
      totalSpentCents: totalAlert.spentCents,
      totalPercentUsed: totalAlert.percentUsed,
      totalFiredThresholds: totalAlert.firedThresholds,
      envelopes,
    }
  }

  async create(userId: string, month: string | undefined, input: CreateEnvelopeInput): Promise<Envelope> {
    const { id: budgetMonthId, month: key, variableCapCents } = await this.budgetMonths.requireId(userId, month)
    assertMonthOpen(key)

    const category = await this.categories.findActiveById(userId, input.categoryId)
    if (!category) throw new NotFoundError('CATEGORY_NOT_FOUND', 'Categoria não encontrada.')

    try {
      const row = await this.repo.create(userId, budgetMonthId, input.categoryId, {
        amountCents: input.amountCents ?? null,
        percent: input.percent ?? null,
      })
      return this.withAlert(userId, row, key, variableCapCents)
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError('ENVELOPE_ALREADY_EXISTS', 'Essa categoria já tem envelope neste mês.')
      }
      throw error
    }
  }

  async update(userId: string, id: string, input: UpdateEnvelopeInput): Promise<Envelope> {
    const existing = await this.repo.findById(userId, id)
    if (!existing) throw NOT_FOUND()
    assertMonthOpen(existing.budgetMonth.month)

    const result = await this.repo.update(userId, id, {
      amountCents: input.amountCents ?? null,
      percent: input.percent ?? null,
    })
    if (result.count === 0) throw NOT_FOUND()

    const updated = await this.repo.findById(userId, id)
    if (!updated) throw NOT_FOUND()
    return this.withAlert(userId, updated, updated.budgetMonth.month, computeVariableCapCents(updated.budgetMonth))
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.repo.findById(userId, id)
    if (!existing) throw NOT_FOUND()
    assertMonthOpen(existing.budgetMonth.month)

    const result = await this.repo.delete(userId, id)
    if (result.count === 0) throw NOT_FOUND()
  }

  private async withAlert(
    userId: string,
    row: EnvelopeRow,
    month: string,
    variableCapCents: number,
  ): Promise<Envelope> {
    const capCents = envelopeCapCents(row, variableCapCents)
    const spentCents = await this.alerts.categorySpentCents(userId, row.categoryId, month)
    const alert = await this.alerts.envelopeAlert(userId, row.id, spentCents, capCents)
    return toEnvelopeDto(row, capCents, alert)
  }
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}
