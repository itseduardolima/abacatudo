import { Injectable } from '@nestjs/common'
import type { Account, CreateAccountInput } from '@gastos/shared'
import { NotFoundError } from '../../common/errors/domain.error'
import { AccountRepository, type AccountWithLastSync } from './account.repository'

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
    // Recém-criada, sempre MANUAL (source PLUGGY só existe pelo sync) — nunca tem PluggyItem pra puxar
    // lastSyncAt.
    return toDto({ ...row, pluggyItem: null })
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

// lastSyncAt: "última atualização" (8.6) é a do PluggyItem por trás da conta — dado velho nunca parece
// atual (se um sync não terminou de verdade, o item nunca chega a atualizar lastSyncAt, ver
// BankingService.runSync). Conta MANUAL/IMPORT não tem PluggyItem, então é sempre null (não sincroniza).
function toDto(row: AccountWithLastSync): Account {
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
    lastSyncAt: row.pluggyItem?.lastSyncAt?.toISOString() ?? null,
  }
}
