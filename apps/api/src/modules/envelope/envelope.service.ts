import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { CreateEnvelopeInput, Envelope, EnvelopeList, UpdateEnvelopeInput } from '@gastos/shared'
import { BudgetMonthService } from '../budget/budget-month.service'
import { computeVariableCapCents } from '../budget/budget.mapper'
import { CategoryRepository } from '../category/category.repository'
import { ConflictError, NotFoundError } from '../../common/errors/domain.error'
import { EnvelopeRepository } from './envelope.repository'
import { toEnvelopeDto } from './envelope.mapper'

const NOT_FOUND = () => new NotFoundError('ENVELOPE_NOT_FOUND', 'Envelope não encontrado.')

@Injectable()
export class EnvelopeService {
  constructor(
    private readonly repo: EnvelopeRepository,
    private readonly budgetMonths: BudgetMonthService,
    private readonly categories: CategoryRepository,
  ) {}

  async list(userId: string, month?: string): Promise<EnvelopeList> {
    const { id: budgetMonthId, variableCapCents } = await this.budgetMonths.requireId(userId, month)
    const rows = await this.repo.findMany(userId, budgetMonthId)
    const envelopes = rows.map((row) => toEnvelopeDto(row, variableCapCents))
    const allocatedCents = envelopes.reduce((sum, envelope) => sum + envelope.capCents, 0)
    return { variableCapCents, allocatedCents, freeCents: variableCapCents - allocatedCents, envelopes }
  }

  async create(userId: string, month: string | undefined, input: CreateEnvelopeInput): Promise<Envelope> {
    const { id: budgetMonthId, variableCapCents } = await this.budgetMonths.requireId(userId, month)

    const category = await this.categories.findActiveById(userId, input.categoryId)
    if (!category) throw new NotFoundError('CATEGORY_NOT_FOUND', 'Categoria não encontrada.')

    try {
      const row = await this.repo.create(userId, budgetMonthId, input.categoryId, {
        amountCents: input.amountCents ?? null,
        percent: input.percent ?? null,
      })
      return toEnvelopeDto(row, variableCapCents)
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError('ENVELOPE_ALREADY_EXISTS', 'Essa categoria já tem envelope neste mês.')
      }
      throw error
    }
  }

  async update(userId: string, id: string, input: UpdateEnvelopeInput): Promise<Envelope> {
    const result = await this.repo.update(userId, id, {
      amountCents: input.amountCents ?? null,
      percent: input.percent ?? null,
    })
    if (result.count === 0) throw NOT_FOUND()

    const updated = await this.repo.findById(userId, id)
    if (!updated) throw NOT_FOUND()
    return toEnvelopeDto(updated, computeVariableCapCents(updated.budgetMonth))
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.repo.delete(userId, id)
    if (result.count === 0) throw NOT_FOUND()
  }
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}
