import { Injectable } from '@nestjs/common'
import type { Account as AccountRow } from '@prisma/client'
import type { Account, CreateAccountInput } from '@gastos/shared'
import { NotFoundError } from '../../common/errors/domain.error'
import { AccountRepository } from './account.repository'

@Injectable()
export class AccountService {
  constructor(private readonly repo: AccountRepository) {}

  async create(userId: string, input: CreateAccountInput): Promise<Account> {
    const row = await this.repo.create(userId, {
      name: input.name,
      type: input.type,
      source: input.source,
      closingDay: input.closingDay ?? null,
      dueDay: input.dueDay ?? null,
      creditLimitCents: input.creditLimitCents ?? null,
    })
    return toDto(row)
  }

  async list(userId: string, includeArchived: boolean): Promise<Account[]> {
    const rows = await this.repo.findMany(userId, includeArchived)
    return rows.map(toDto)
  }

  async getById(userId: string, id: string): Promise<Account> {
    const row = await this.repo.findById(userId, id)
    if (!row) throw new NotFoundError('ACCOUNT_NOT_FOUND', 'Conta não encontrada.')
    return toDto(row)
  }
}

function toDto(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    source: row.source,
    closingDay: row.closingDay,
    dueDay: row.dueDay,
    creditLimitCents: row.creditLimitCents,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}
