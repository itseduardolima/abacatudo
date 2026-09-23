import { Injectable, Logger } from '@nestjs/common'
import type { Invoice } from '@gastos/shared'
import { resolveMonthRange } from '../../common/date/timezone'
import { DomainError, NotFoundError } from '../../common/errors/domain.error'
import { AccountRepository, type AccountWithPluggyItem } from '../account/account.repository'
import { PluggyClient } from '../banking/pluggy/pluggy.client'
import { PersonRepository } from '../person/person.repository'
import {
  computeInvoice,
  computeInvoiceWithCarryover,
  keepNextDueInstallmentOnly,
  mergeInvoices,
} from './invoice.mapper'
import { InvoiceRepository } from './invoice.repository'

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name)

  constructor(
    private readonly repo: InvoiceRepository,
    private readonly accounts: AccountRepository,
    private readonly people: PersonRepository,
    private readonly pluggy: PluggyClient,
  ) {}

  async getForAccount(userId: string, accountId: string | undefined, month?: string): Promise<Invoice> {
    if (!accountId) throw new DomainError('ACCOUNT_ID_REQUIRED', 'Informe accountId.', 400)

    const account = await this.accounts.findById(userId, accountId)
    if (!account) throw new NotFoundError('ACCOUNT_NOT_FOUND', 'Conta não encontrada.')
    if (account.type !== 'CREDIT_CARD') {
      throw new DomainError('NOT_A_CARD_ACCOUNT', 'Fatura só existe pra conta de cartão de crédito.', 422)
    }

    const selfId = await this.selfPersonId(userId)
    return this.invoiceForAccount(account, selfId, month)
  }

  // "Meu" da fatura aberta, somado em todos os cartões (03-regras-negocio § Só a minha parte) — é o
  // número que alimenta o ritmo (HU 7.4). Sempre a fatura de agora; não existe "mês passado" aqui.
  async getSummary(userId: string): Promise<Invoice> {
    const selfId = await this.selfPersonId(userId)
    const cardAccounts = (await this.accounts.findMany(userId, false)).filter((a) => a.type === 'CREDIT_CARD')

    const invoices = await Promise.all(cardAccounts.map((account) => this.invoiceForAccount(account, selfId)))
    return mergeInvoices(invoices)
  }

  // PLUGGY: "quanto falta pagar" = saldo da última fatura fechada (Pluggy /bills) + movimentação local
  // ainda sem billId (findOpenRows), só a parcela que vence agora em compra parcelada
  // (keepNextDueInstallmentOnly — sem isso, uma compra em 6x aparecia inteira, não só a parcela da vez).
  // Fórmula toda verificada ao vivo contra o OFX exportado de um Nubank real, batendo exato (o resíduo
  // que sobrava era só uma compra recente que a API do Pluggy ainda não tinha sincronizado — nada a ver
  // com a conta). Sem fatura fechada ainda (cartão novo) ou Pluggy fora do ar, usa toda a movimentação
  // local sem saldo anterior, em vez de quebrar a tela. MANUAL/IMPORT: nunca tem banco de verdade por
  // trás, mês calendário é a aproximação possível.
  private async invoiceForAccount(account: AccountWithPluggyItem, selfPersonId: string, month?: string) {
    if (account.source !== 'PLUGGY') {
      const rows = await this.repo.findRows(account.userId, resolveMonthRange(month), account.id)
      return computeInvoice(rows, selfPersonId)
    }

    const [rows, carryoverCents] = await Promise.all([
      this.repo.findOpenRows(account.userId, account.id),
      this.lastClosedBillCarryoverCents(account),
    ])
    return computeInvoiceWithCarryover(keepNextDueInstallmentOnly(rows), selfPersonId, carryoverCents)
  }

  private async lastClosedBillCarryoverCents(account: AccountWithPluggyItem): Promise<number> {
    if (!account.externalAccountId) return 0
    try {
      const bill = await this.pluggy.getLastClosedBill(account.externalAccountId)
      return bill?.totalAmount == null ? 0 : Math.round(Math.abs(bill.totalAmount) * 100)
    } catch (error) {
      this.logger.warn(
        `Não foi possível buscar a última fatura fechada no Pluggy pra conta ${account.id}: ${String(error)}`,
      )
      return 0
    }
  }

  private async selfPersonId(userId: string): Promise<string> {
    const self = await this.people.findSelf(userId)
    if (!self) throw new DomainError('SELF_PERSON_NOT_FOUND', 'Pessoa "Eu" não encontrada.', 500)
    return self.id
  }
}
