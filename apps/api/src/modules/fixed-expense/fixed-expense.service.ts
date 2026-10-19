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
    await this.repo.deleteStalePayments(
      userId,
      id,
      sharesOf(row).map((share) => share.half),
    )
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

  async getFigures(
    userId: string,
    month: string,
  ): Promise<{ totalCents: number; firstHalfCents: number; secondHalfCents: number; paidCents: number }> {
    const [rows, paid] = await Promise.all([this.repo.findMany(userId, false), this.repo.findPaidHalves(userId, month)])
    const figures = { totalCents: 0, firstHalfCents: 0, secondHalfCents: 0, paidCents: 0 }
    for (const row of rows) {
      figures.totalCents += row.amountCents
      for (const share of sharesOf(row)) {
        if (share.half === 1) figures.firstHalfCents += share.amountCents
        else figures.secondHalfCents += share.amountCents
        if (paid.has(`${row.id}:${share.half}`)) figures.paidCents += share.amountCents
      }
    }
    return figures
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
