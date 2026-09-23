import { Injectable } from '@nestjs/common'
import type { Invoice } from '@gastos/shared'
import { resolveMonthRange } from '../../common/date/timezone'
import { DomainError, NotFoundError } from '../../common/errors/domain.error'
import { AccountRepository, type AccountWithPluggyItem } from '../account/account.repository'
import { PersonRepository } from '../person/person.repository'
import { computeInvoice, mergeInvoices, type InvoiceRow } from './invoice.mapper'
import { InvoiceRepository } from './invoice.repository'

@Injectable()
export class InvoiceService {
  constructor(
    private readonly repo: InvoiceRepository,
    private readonly accounts: AccountRepository,
    private readonly people: PersonRepository,
  ) {}

  async getForAccount(userId: string, accountId: string | undefined, month?: string): Promise<Invoice> {
    if (!accountId) throw new DomainError('ACCOUNT_ID_REQUIRED', 'Informe accountId.', 400)

    const account = await this.accounts.findById(userId, accountId)
    if (!account) throw new NotFoundError('ACCOUNT_NOT_FOUND', 'Conta não encontrada.')
    if (account.type !== 'CREDIT_CARD') {
      throw new DomainError('NOT_A_CARD_ACCOUNT', 'Fatura só existe pra conta de cartão de crédito.', 422)
    }

    const selfId = await this.selfPersonId(userId)
    const rows = await this.rowsForAccount(userId, account, month)
    return computeInvoice(rows, selfId)
  }

  // "Meu" da fatura aberta, somado em todos os cartões (03-regras-negocio § Só a minha parte) — é o
  // número que alimenta o ritmo (HU 7.4). Sempre a fatura de agora; não existe "mês passado" aqui.
  async getSummary(userId: string): Promise<Invoice> {
    const selfId = await this.selfPersonId(userId)
    const cardAccounts = (await this.accounts.findMany(userId, false)).filter((a) => a.type === 'CREDIT_CARD')

    const invoices = await Promise.all(
      cardAccounts.map(async (account) => computeInvoice(await this.rowsForAccount(userId, account), selfId)),
    )
    return mergeInvoices(invoices)
  }

  // PLUGGY: billId de verdade do banco (findOpenRows — inclui CARD_PAYMENT, pra pagamento antecipado
  // abater o que falta pagar; ver invoice.mapper). O /bills da Pluggy foi cogitado e descartado: só
  // devolve fatura já FECHADA, nunca a aberta (checado ao vivo contra um Nubank real — o primeiro
  // resultado tinha vencimento no passado). MANUAL/IMPORT: nunca tem billId (não existe banco por trás),
  // mês calendário é a aproximação possível.
  private rowsForAccount(userId: string, account: AccountWithPluggyItem, month?: string): Promise<InvoiceRow[]> {
    return account.source === 'PLUGGY'
      ? this.repo.findOpenRows(userId, account.id)
      : this.repo.findRows(userId, resolveMonthRange(month), account.id)
  }

  private async selfPersonId(userId: string): Promise<string> {
    const self = await this.people.findSelf(userId)
    if (!self) throw new DomainError('SELF_PERSON_NOT_FOUND', 'Pessoa "Eu" não encontrada.', 500)
    return self.id
  }
}
