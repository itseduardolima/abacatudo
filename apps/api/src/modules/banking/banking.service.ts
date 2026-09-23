import { Injectable } from '@nestjs/common'
import type { PluggyItem as PluggyItemRow, Rule } from '@prisma/client'
import type { BankConnection, ConnectBankResponse, SyncResult } from '@gastos/shared'
import { DomainError, NotFoundError } from '../../common/errors/domain.error'
import { AccountRepository } from '../account/account.repository'
import { PersonRepository } from '../person/person.repository'
import { normalizeMerchant } from '../rule/normalize-merchant'
import { RuleRepository } from '../rule/rule.repository'
import { BankingSyncRepository } from './banking-sync.repository'
import { mapAccountFields, mapTransaction } from './banking.mapper'
import { PluggyClient } from './pluggy/pluggy.client'
import { PluggyItemRepository } from './pluggy-item.repository'

const NOT_FOUND = () => new NotFoundError('BANK_CONNECTION_NOT_FOUND', 'Conexão bancária não encontrada.')

// Item desconectado (8.5) não existe mais do lado do Pluggy — checar status ou sincronizar contra ele só
// devolveria um erro genérico de "Pluggy indisponível", enganoso pra um estado que é permanente e local.
function assertConnected(item: PluggyItemRow): void {
  if (item.status === 'DISCONNECTED') {
    throw new DomainError(
      'BANK_ITEM_DISCONNECTED',
      'Essa conexão foi desconectada. Conecte de novo pra sincronizar.',
      422,
    )
  }
}

@Injectable()
export class BankingService {
  constructor(
    private readonly pluggy: PluggyClient,
    private readonly items: PluggyItemRepository,
    private readonly accounts: AccountRepository,
    private readonly sync: BankingSyncRepository,
    private readonly people: PersonRepository,
    private readonly rules: RuleRepository,
  ) {}

  async connect(userId: string): Promise<ConnectBankResponse> {
    const { pluggyItemId, authorizeUrl } = await this.pluggy.createMeuPluggyItem()
    const item = await this.items.create(userId, {
      pluggyItemId,
      institutionName: 'Meu Pluggy',
      status: 'WAITING_USER_INPUT',
    })
    return { id: item.id, authorizeUrl }
  }

  async listItems(userId: string): Promise<BankConnection[]> {
    return (await this.items.findMany(userId)).map(toConnectionDto)
  }

  // Sem webhook (Meu Pluggy não tem — 07-integracao-bancaria): o front chama isto em polling depois de
  // mandar o usuário para authorizeUrl. Assim que o status vira UPDATED pela primeira vez, sincroniza.
  async checkStatus(userId: string, id: string): Promise<BankConnection> {
    const item = await this.items.findById(userId, id)
    if (!item) throw NOT_FOUND()
    assertConnected(item)

    const remote = await this.pluggy.getItem(item.pluggyItemId)
    // UPDATING é transiente (o Pluggy ainda está buscando) — nunca persistido, só os status finais do enum.
    if (remote.status !== 'UPDATING') {
      await this.items.update(userId, item.id, {
        status: remote.status,
        consentExpiresAt: remote.consentExpiresAt ? new Date(remote.consentExpiresAt) : null,
        lastErrorCode: remote.error?.code ?? null,
      })
    }

    const wasAlreadyUpdated = item.status === 'UPDATED'
    if (remote.status === 'UPDATED' && !wasAlreadyUpdated) {
      await this.runSync(userId, item.id)
    }

    const refreshed = await this.items.findById(userId, id)
    if (!refreshed) throw NOT_FOUND()
    return toConnectionDto(refreshed)
  }

  async manualSync(userId: string, id: string): Promise<SyncResult> {
    const item = await this.items.findById(userId, id)
    if (!item) throw NOT_FOUND()
    assertConnected(item)
    return this.runSync(userId, item.id)
  }

  // Desconectar (8.5): revoga o Item no Pluggy (best effort + retry, já embutido no PluggyClient) e marca
  // localmente — histórico (Account/Transaction) nunca é apagado, só para de sincronizar. Idempotente: item
  // já desconectado só devolve o estado atual, sem chamar o Pluggy de novo.
  async disconnect(userId: string, id: string): Promise<BankConnection> {
    const item = await this.items.findById(userId, id)
    if (!item) throw NOT_FOUND()
    if (item.status === 'DISCONNECTED') return toConnectionDto(item)

    await this.pluggy.deleteItem(item.pluggyItemId)
    await this.items.update(userId, item.id, { status: 'DISCONNECTED' })

    const refreshed = await this.items.findById(userId, id)
    if (!refreshed) throw NOT_FOUND()
    return toConnectionDto(refreshed)
  }

  private async runSync(userId: string, itemId: string): Promise<SyncResult> {
    const item = await this.items.findById(userId, itemId)
    if (!item) throw NOT_FOUND()

    const selfPerson = await this.people.findSelf(userId)
    if (!selfPerson) throw new DomainError('SELF_PERSON_NOT_FOUND', 'Pessoa "Eu" não encontrada.', 500)
    const ruleByMerchant = new Map((await this.rules.findMany(userId)).map((rule: Rule) => [rule.merchant, rule]))

    const pluggyAccounts = await this.pluggy.listAccounts(item.pluggyItemId)
    let accountsSynced = 0
    let transactionsSynced = 0

    for (const pluggyAccount of pluggyAccounts) {
      const fields = mapAccountFields(pluggyAccount)
      const isCreditCard = fields.type === 'CREDIT_CARD'
      const account = await this.accounts.upsertFromSync(
        userId,
        pluggyAccount.id,
        { ...fields, name: pluggyAccount.name, source: 'PLUGGY', pluggyItemId: item.id },
        fields,
      )
      accountsSynced++

      let cursor: string | undefined
      do {
        const page = await this.pluggy.listTransactions(pluggyAccount.id, cursor)
        for (const tx of page.results) {
          const mapped = mapTransaction(tx, isCreditCard)
          const merchant = mapped.merchant ?? null
          // Pessoa/categoria só existem em cartão de crédito (03-regras-negocio § Escopo) — movimentação
          // nunca ganha nenhum dos dois, nem por Rule.
          const personId = isCreditCard ? resolvePersonId(merchant, ruleByMerchant, selfPerson.id) : null
          const categoryId = isCreditCard ? resolveCategoryId(merchant, ruleByMerchant) : null
          await this.sync.upsertTransaction(userId, account.id, personId, categoryId, mapped)
          transactionsSynced++
        }
        cursor = page.next ?? undefined
      } while (cursor)
    }

    await this.items.update(userId, item.id, { lastSyncAt: new Date() })
    return { accountsSynced, transactionsSynced }
  }
}

// Toda transação nasce "Meu" (03-regras-negocio § Atribuição de pessoa) a não ser que uma Rule diga outra
// pessoa pra este estabelecimento.
function resolvePersonId(merchant: string | null, ruleByMerchant: Map<string, Rule>, selfPersonId: string): string {
  if (!merchant) return selfPersonId
  return ruleByMerchant.get(normalizeMerchant(merchant))?.personId ?? selfPersonId
}

// Sem Rule pro estabelecimento, nasce sem categoria (03-regras-negocio § Categorias e regras) — nunca
// inventa uma; quem decide isso além da Rule é o usuário ou, no futuro, a sugestão de IA (Sprint 7).
function resolveCategoryId(merchant: string | null, ruleByMerchant: Map<string, Rule>): string | null {
  if (!merchant) return null
  return ruleByMerchant.get(normalizeMerchant(merchant))?.categoryId ?? null
}

function toConnectionDto(row: PluggyItemRow): BankConnection {
  return {
    id: row.id,
    institutionName: row.institutionName,
    status: row.status,
    consentExpiresAt: row.consentExpiresAt?.toISOString() ?? null,
    lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
    lastErrorCode: row.lastErrorCode,
    createdAt: row.createdAt.toISOString(),
  }
}
