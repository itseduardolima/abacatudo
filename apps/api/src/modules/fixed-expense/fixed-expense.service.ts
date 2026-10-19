import { Injectable } from '@nestjs/common'
import type { FixedExpense as FixedExpenseRow } from '@prisma/client'
import type { CreateFixedExpenseInput, FixedExpense, UpdateFixedExpenseInput } from '@gastos/shared'
import { monthKey } from '../../common/date/timezone'
import { NotFoundError } from '../../common/errors/domain.error'
import { FixedExpenseRepository } from './fixed-expense.repository'

const NOT_FOUND = () => new NotFoundError('FIXED_EXPENSE_NOT_FOUND', 'Gasto fixo não encontrado.')

@Injectable()
export class FixedExpenseService {
  constructor(private readonly repo: FixedExpenseRepository) {}

  async create(userId: string, input: CreateFixedExpenseInput): Promise<FixedExpense> {
    return toDto(await this.repo.create(userId, input.name, input.amountCents, input.half), new Set())
  }

  async update(userId: string, id: string, input: UpdateFixedExpenseInput): Promise<FixedExpense> {
    const result = await this.repo.update(userId, id, input)
    if (result.count === 0) throw NOT_FOUND()
    const row = await this.repo.findById(userId, id)
    if (!row) throw NOT_FOUND()
    return toDto(row, await this.repo.findPaidHalves(userId, monthKey(new Date())))
  }

  async list(userId: string, includeArchived: boolean): Promise<FixedExpense[]> {
    const [rows, paid] = await Promise.all([
      this.repo.findMany(userId, includeArchived),
      this.repo.findPaidHalves(userId, monthKey(new Date())),
    ])
    return rows.map((row) => toDto(row, paid))
  }

  async markPaid(userId: string, id: string, half: number): Promise<void> {
    const row = await this.repo.findById(userId, id)
    if (!row || row.archivedAt || !hasShare(row, half)) throw NOT_FOUND()
    await this.repo.markPaid(userId, id, monthKey(new Date()), half)
  }

  async unmarkPaid(userId: string, id: string, half: number): Promise<void> {
    const row = await this.repo.findById(userId, id)
    if (!row || !hasShare(row, half)) throw NOT_FOUND()
    await this.repo.unmarkPaid(userId, id, monthKey(new Date()), half)
  }

  async sumPaidCents(userId: string, month: string): Promise<number> {
    const [rows, paid] = await Promise.all([this.repo.findMany(userId, false), this.repo.findPaidHalves(userId, month)])
    return rows.reduce(
      (total, row) =>
        total +
        sharesOf(row)
          .filter((share) => paid.has(`${row.id}:${share.half}`))
          .reduce((sum, share) => sum + share.amountCents, 0),
      0,
    )
  }

  // Soma dos ativos (03-regras-negocio § Orçamento mensal) — entra junto da fatura aberta no ritmo (HU 7.4).
  async sumActiveCents(userId: string): Promise<number> {
    const rows = await this.repo.findMany(userId, false)
    return rows.reduce((total, row) => total + row.amountCents, 0)
  }

  async sumActiveCentsByHalf(userId: string, half: 1 | 2): Promise<number> {
    const rows = await this.repo.findMany(userId, false)
    return rows.reduce(
      (total, row) => total + (sharesOf(row).find((share) => share.half === half)?.amountCents ?? 0),
      0,
    )
  }

  async archive(userId: string, id: string): Promise<void> {
    const result = await this.repo.archive(userId, id)
    if (result.count === 0) throw NOT_FOUND()
  }
}

function sharesOf(row: FixedExpenseRow): { half: 1 | 2; amountCents: number }[] {
  if (row.half === 2) return [{ half: 2, amountCents: row.amountCents }]
  if (row.half !== 3) return [{ half: 1, amountCents: row.amountCents }]
  const firstShare = Math.floor(row.amountCents / 2)
  return [
    { half: 1, amountCents: firstShare },
    { half: 2, amountCents: row.amountCents - firstShare },
  ]
}

function hasShare(row: FixedExpenseRow, half: number): boolean {
  return sharesOf(row).some((share) => share.half === half)
}

function toDto(row: FixedExpenseRow, paid: Set<string>): FixedExpense {
  return {
    id: row.id,
    name: row.name,
    amountCents: row.amountCents,
    half: row.half === 2 || row.half === 3 ? row.half : 1,
    shares: sharesOf(row).map((share) => ({ ...share, paid: paid.has(`${row.id}:${share.half}`) })),
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}
