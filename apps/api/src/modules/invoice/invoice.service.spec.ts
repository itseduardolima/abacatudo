import type { Account as AccountRow, Person as PersonRow } from '@prisma/client'
import { DomainError, NotFoundError } from '../../common/errors/domain.error'
import type { AccountRepository, AccountWithPluggyItem } from '../account/account.repository'
import type { PersonRepository } from '../person/person.repository'
import { InvoiceService } from './invoice.service'
import type { InvoiceRepository } from './invoice.repository'

function accountsMock() {
  return { findById: jest.fn(), findMany: jest.fn() } as unknown as jest.Mocked<AccountRepository>
}

function peopleMock() {
  return { findSelf: jest.fn() } as unknown as jest.Mocked<PersonRepository>
}

function repoMock() {
  return { findRows: jest.fn(), findOpenRows: jest.fn() } as unknown as jest.Mocked<InvoiceRepository>
}

function accountRow(overrides: Partial<AccountRow> = {}): AccountWithPluggyItem {
  return {
    id: 'acc-1',
    userId: 'user-1',
    name: 'Nubank',
    type: 'CREDIT_CARD',
    source: 'MANUAL',
    closingDay: null,
    dueDay: null,
    creditLimitCents: null,
    pluggyItemId: null,
    externalAccountId: null,
    archivedAt: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
    pluggyItem: null,
  }
}

function personRow(overrides: Partial<PersonRow> = {}): PersonRow {
  return {
    id: 'self-1',
    userId: 'user-1',
    name: 'Eu',
    isSelf: true,
    archivedAt: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  }
}

describe('InvoiceService', () => {
  describe('getForAccount', () => {
    it('400 sem accountId, antes de tocar no banco', async () => {
      const accounts = accountsMock()
      const service = new InvoiceService(repoMock(), accounts, peopleMock())

      await expect(service.getForAccount('user-1', undefined, '2026-09')).rejects.toBeInstanceOf(DomainError)
      expect(accounts.findById).not.toHaveBeenCalled()
    })

    it('404 quando a conta não existe (ou não é do usuário)', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(null)
      const service = new InvoiceService(repoMock(), accounts, peopleMock())

      await expect(service.getForAccount('user-1', 'acc-1', '2026-09')).rejects.toBeInstanceOf(NotFoundError)
    })

    it('422 quando a conta não é cartão de crédito', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow({ type: 'CHECKING' }))
      const service = new InvoiceService(repoMock(), accounts, peopleMock())

      await expect(service.getForAccount('user-1', 'acc-1', '2026-09')).rejects.toBeInstanceOf(DomainError)
    })

    it('conta MANUAL: calcula a fatura pelo mês calendário (sem billId de banco)', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow({ source: 'MANUAL' }))
      const people = peopleMock()
      people.findSelf.mockResolvedValue(personRow())
      const repo = repoMock()
      repo.findRows.mockResolvedValue([
        { kind: 'EXPENSE', amountCents: 1000, personId: 'self-1', splits: [] },
        { kind: 'EXPENSE', amountCents: 700, personId: 'family-1', splits: [] },
      ])
      const service = new InvoiceService(repo, accounts, people)

      const result = await service.getForAccount('user-1', 'acc-1', '2026-09')

      expect(repo.findRows).toHaveBeenCalledWith('user-1', { start: expect.any(Date), end: expect.any(Date) }, 'acc-1')
      expect(repo.findOpenRows).not.toHaveBeenCalled()
      expect(result).toEqual({ totalCents: 1700, mineCents: 1000, notMineCents: 700 })
    })

    it('conta PLUGGY: fatura aberta (billId), pagamento antecipado abate o que falta pagar', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow({ source: 'PLUGGY' }))
      const people = peopleMock()
      people.findSelf.mockResolvedValue(personRow())
      const repo = repoMock()
      repo.findOpenRows.mockResolvedValue([
        { kind: 'EXPENSE', amountCents: 100000, personId: 'self-1', splits: [] },
        { kind: 'CARD_PAYMENT', amountCents: 40000, personId: 'self-1', splits: [] },
      ])
      const service = new InvoiceService(repo, accounts, people)

      const result = await service.getForAccount('user-1', 'acc-1', '2026-09')

      expect(repo.findOpenRows).toHaveBeenCalledWith('user-1', 'acc-1')
      expect(repo.findRows).not.toHaveBeenCalled()
      expect(result).toEqual({ totalCents: 60000, mineCents: 60000, notMineCents: 0 })
    })
  })

  describe('getSummary', () => {
    it('soma a fatura aberta de todos os cartões, cada um com o critério certo pra sua fonte', async () => {
      const people = peopleMock()
      people.findSelf.mockResolvedValue(personRow())
      const accounts = accountsMock()
      accounts.findMany.mockResolvedValue([
        accountRow({ id: 'acc-pluggy', source: 'PLUGGY' }),
        accountRow({ id: 'acc-manual', source: 'MANUAL' }),
        accountRow({ id: 'acc-checking', type: 'CHECKING', source: 'MANUAL' }),
      ])
      const repo = repoMock()
      repo.findOpenRows.mockResolvedValue([{ kind: 'EXPENSE', amountCents: 58989, personId: 'self-1', splits: [] }])
      repo.findRows.mockResolvedValue([{ kind: 'EXPENSE', amountCents: 500, personId: 'self-1', splits: [] }])
      const service = new InvoiceService(repo, accounts, people)

      const result = await service.getSummary('user-1')

      expect(accounts.findMany).toHaveBeenCalledWith('user-1', false)
      expect(repo.findOpenRows).toHaveBeenCalledWith('user-1', 'acc-pluggy')
      expect(repo.findRows).toHaveBeenCalledWith(
        'user-1',
        { start: expect.any(Date), end: expect.any(Date) },
        'acc-manual',
      )
      // conta CHECKING (não é cartão) nunca entra na fatura.
      expect(repo.findRows).not.toHaveBeenCalledWith(
        'user-1',
        { start: expect.any(Date), end: expect.any(Date) },
        'acc-checking',
      )
      expect(result).toEqual({ totalCents: 59489, mineCents: 59489, notMineCents: 0 })
    })

    it('sem Pessoa self, falha alto (invariante quebrada)', async () => {
      const people = peopleMock()
      people.findSelf.mockResolvedValue(null)
      const service = new InvoiceService(repoMock(), accountsMock(), people)

      await expect(service.getSummary('user-1')).rejects.toBeInstanceOf(DomainError)
    })
  })
})
