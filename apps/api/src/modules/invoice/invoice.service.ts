import { Injectable } from '@nestjs/common'
import type { Invoice } from '@gastos/shared'
import { resolveMonthRange } from '../../common/date/timezone'
import { DomainError, NotFoundError } from '../../common/errors/domain.error'
import { AccountRepository } from '../account/account.repository'
import { PersonRepository } from '../person/person.repository'
import { computeInvoice } from './invoice.mapper'
import { InvoiceRepository } from './invoice.repository'

@Injectable()
export class InvoiceService {
  constructor(
    private readonly repo: InvoiceRepository,
    private readonly accounts: AccountRepository,
    private readonly people: PersonRepository,
  ) {}

  async getForAccount(userId: string, accountId: string, month?: string): Promise<Invoice> {
    const account = await this.accounts.findById(userId, accountId)
    if (!account) throw new NotFoundError('ACCOUNT_NOT_FOUND', 'Conta não encontrada.')
    if (account.type !== 'CREDIT_CARD') {
      throw new DomainError('NOT_A_CARD_ACCOUNT', 'Fatura só existe pra conta de cartão de crédito.', 422)
    }

    const selfId = await this.selfPersonId(userId)
    const rows = await this.repo.findRows(userId, resolveMonthRange(month), accountId)
    return computeInvoice(rows, selfId)
  }

  // "Meu" do mês somado em todos os cartões (03-regras-negocio § Só a minha parte) — é o número que
  // alimenta o orçamento (Sprint 5).
  async getSummary(userId: string, month?: string): Promise<Invoice> {
    const selfId = await this.selfPersonId(userId)
    const rows = await this.repo.findRows(userId, resolveMonthRange(month))
    return computeInvoice(rows, selfId)
  }

  private async selfPersonId(userId: string): Promise<string> {
    const self = await this.people.findSelf(userId)
    if (!self) throw new DomainError('SELF_PERSON_NOT_FOUND', 'Pessoa "Eu" não encontrada.', 500)
    return self.id
  }
}
