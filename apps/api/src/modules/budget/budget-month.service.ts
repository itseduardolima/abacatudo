import { Injectable } from '@nestjs/common'
import type { BudgetMonth as BudgetMonthRow } from '@prisma/client'
import type { BudgetMonth, UpdateBudgetMonthInput } from '@gastos/shared'
import { monthKey } from '../../common/date/timezone'
import { DomainError } from '../../common/errors/domain.error'
import { BudgetMonthRepository } from './budget-month.repository'
import { computeVariableCapCents, toBudgetMonthDto } from './budget.mapper'

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/
const ZERO = { incomeCents: 0, benefitCents: 0, fixedExpensesCents: 0, savingsGoalCents: 0 }

@Injectable()
export class BudgetMonthService {
  constructor(private readonly repo: BudgetMonthRepository) {}

  // Mês atual ou o próximo sem configuração ainda: cria copiando o mês configurado mais recente (virada
  // de mês, e dá pra planejar 1 mês à frente). Fora dessa janela — passado, ou muito no futuro — nunca
  // existiu de verdade: mostra zero sem gravar nada (03-regras-negocio). GET nunca cria linha pra um mês
  // arbitrariamente distante só porque alguém perguntou.
  async getOrCreate(userId: string, month?: string): Promise<BudgetMonth> {
    const key = resolveKey(month)
    const row = await this.resolveRow(userId, key)
    return row ? toBudgetMonthDto(row) : { month: key, ...ZERO, variableCapCents: 0 }
  }

  // Pra quem precisa do id de verdade (Envelope, por FK) e do teto já calculado — rejeita se o mês nunca
  // foi configurado e está fora da janela de auto-create (não dá pra pendurar envelope em nada).
  async requireId(userId: string, month?: string): Promise<{ id: string; month: string; variableCapCents: number }> {
    const key = resolveKey(month)
    const row = await this.resolveRow(userId, key)
    if (!row) {
      throw new DomainError('BUDGET_MONTH_NOT_CONFIGURED', 'Configure a renda desse mês antes de criar envelopes.', 422)
    }
    return { id: row.id, month: key, variableCapCents: computeVariableCapCents(row) }
  }

  // Mês fechado é imutável: editar a renda de hoje nunca reescreve o passado.
  async update(userId: string, month: string | undefined, input: UpdateBudgetMonthInput): Promise<BudgetMonth> {
    const key = resolveKey(month)
    assertMonthOpen(key)
    const row = await this.repo.upsert(userId, key, input)
    return toBudgetMonthDto(row)
  }

  private async resolveRow(userId: string, key: string): Promise<BudgetMonthRow | null> {
    const existing = await this.repo.findByMonth(userId, key)
    if (existing) return existing
    if (!isCurrentOrNextMonth(key)) return null

    const previous = await this.repo.findMostRecentBefore(userId, key)
    return this.repo.createIfMissing(userId, key, {
      incomeCents: previous?.incomeCents ?? 0,
      benefitCents: previous?.benefitCents ?? 0,
      fixedExpensesCents: previous?.fixedExpensesCents ?? 0,
      savingsGoalCents: previous?.savingsGoalCents ?? 0,
    })
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

// Exportada porque o "mês fechado é imutável" também vale pra tudo que pendura em BudgetMonth (Envelope
// inclusive) — não só pra editar a renda direto.
export function assertMonthOpen(month: string): void {
  if (isPast(month)) {
    throw new DomainError('BUDGET_MONTH_CLOSED', 'Mês fechado não pode ser editado.', 422)
  }
}

// Janela em que o auto-create do GET vale: o mês atual, ou o seguinte (pra planejar com antecedência).
// Sempre a partir da string AAAA-MM (já em America/Manaus via monthKey) — nunca de Date local, que
// dependeria do fuso do servidor.
function isCurrentOrNextMonth(month: string): boolean {
  const current = monthKey(new Date())
  return month === current || month === nextMonthKey(current)
}

function nextMonthKey(key: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(key)
  if (!match) throw new Error(`monthKey inválido: "${key}"`)
  const [, yearStr, monthStr] = match
  const year = Number(yearStr)
  const month = Number(monthStr)
  return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`
}
