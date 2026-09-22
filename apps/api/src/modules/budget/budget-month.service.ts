import { Injectable } from '@nestjs/common'
import type { BudgetMonth, UpdateBudgetMonthInput } from '@gastos/shared'
import { monthKey } from '../../common/date/timezone'
import { DomainError } from '../../common/errors/domain.error'
import { BudgetMonthRepository } from './budget-month.repository'
import { toBudgetMonthDto } from './budget.mapper'

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/
const ZERO = { incomeCents: 0, benefitCents: 0, fixedExpensesCents: 0, savingsGoalCents: 0 }

@Injectable()
export class BudgetMonthService {
  constructor(private readonly repo: BudgetMonthRepository) {}

  // Mês atual/futuro sem configuração ainda: cria copiando o mês configurado mais recente (virada de
  // mês). Mês passado sem configuração: nunca existiu, mostra zero sem gravar nada (03-regras-negocio).
  async getOrCreate(userId: string, month?: string): Promise<BudgetMonth> {
    const key = resolveKey(month)
    const existing = await this.repo.findByMonth(userId, key)
    if (existing) return toBudgetMonthDto(existing)

    if (isPast(key)) {
      return { month: key, ...ZERO, variableCapCents: 0 }
    }

    const previous = await this.repo.findMostRecentBefore(userId, key)
    const created = await this.repo.create(userId, key, {
      incomeCents: previous?.incomeCents ?? 0,
      benefitCents: previous?.benefitCents ?? 0,
      fixedExpensesCents: previous?.fixedExpensesCents ?? 0,
      savingsGoalCents: previous?.savingsGoalCents ?? 0,
    })
    return toBudgetMonthDto(created)
  }

  // Mês fechado é imutável: editar a renda de hoje nunca reescreve o passado.
  async update(userId: string, month: string | undefined, input: UpdateBudgetMonthInput): Promise<BudgetMonth> {
    const key = resolveKey(month)
    if (isPast(key)) {
      throw new DomainError('BUDGET_MONTH_CLOSED', 'Mês fechado não pode ser editado.', 422)
    }
    const row = await this.repo.upsert(userId, key, input)
    return toBudgetMonthDto(row)
  }
}

function resolveKey(month?: string): string {
  const key = month ?? monthKey(new Date())
  if (!MONTH_KEY_PATTERN.test(key)) {
    throw new DomainError('INVALID_MONTH', 'Mês inválido (esperado AAAA-MM).', 400)
  }
  return key
}

function isPast(month: string): boolean {
  return month < monthKey(new Date())
}
