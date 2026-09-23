import { Injectable } from '@nestjs/common'
import type { Account, CreateAccountInput } from '@gastos/shared'
import { DomainError, NotFoundError } from '../../common/errors/domain.error'
import { AccountRepository, type AccountWithPluggyItem } from './account.repository'

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

  // Marca/desmarca a conta de benefício (Fase 4) — "renda de benefícios" usa o saldo dela em vez do
  // valor digitado à mão. Só CHECKING faz sentido (cartão tem fatura, não saldo; CASH nunca sincroniza).
  async setBenefitAccount(userId: string, id: string, isBenefitAccount: boolean): Promise<Account> {
    const existing = await this.repo.findById(userId, id)
    if (!existing) throw new NotFoundError('ACCOUNT_NOT_FOUND', 'Conta não encontrada.')
    if (isBenefitAccount && existing.type !== 'CHECKING') {
      throw new DomainError('NOT_A_CHECKING_ACCOUNT', 'Só uma conta corrente pode ser a conta de benefício.', 422)
    }

    if (isBenefitAccount) await this.repo.setBenefitAccount(userId, id)
    else await this.repo.update(userId, id, { isBenefitAccount: false })

    const refreshed = await this.repo.findById(userId, id)
    if (!refreshed) throw new NotFoundError('ACCOUNT_NOT_FOUND', 'Conta não encontrada.')
    return toDto(refreshed)
  }

  // Mesmo padrão do FixedExpenseService.archive — soft-delete, nunca apaga Transaction/histórico por
  // trás (findMany/invoice/pace já ignoram conta arquivada por padrão).
  async archive(userId: string, id: string): Promise<void> {
    const result = await this.repo.archive(userId, id)
    if (result.count === 0) throw new NotFoundError('ACCOUNT_NOT_FOUND', 'Conta não encontrada.')
  }
}

// lastSyncAt: "última atualização" (8.6) é a do PluggyItem por trás da conta — dado velho nunca parece
// atual (se um sync não terminou de verdade, o item nunca chega a atualizar lastSyncAt, ver
// BankingService.runSync). disconnected (8.5): true só quando o PluggyItem foi desconectado localmente —
// histórico continua, a conta só para de sincronizar. Conta MANUAL/IMPORT não tem PluggyItem, então os
// dois ficam sempre null/false.
function toDto(row: AccountWithPluggyItem): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    source: row.source,
    closingDay: row.closingDay,
    dueDay: row.dueDay,
    creditLimitCents: row.creditLimitCents,
    balanceCents: row.balanceCents,
    isBenefitAccount: row.isBenefitAccount,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    lastSyncAt: row.pluggyItem?.lastSyncAt?.toISOString() ?? null,
    disconnected: row.pluggyItem?.status === 'DISCONNECTED',
  }
}
