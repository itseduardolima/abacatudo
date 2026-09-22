import type { Account as AccountRow, Person as PersonRow } from '@prisma/client'
import { DomainError, NotFoundError } from '../../common/errors/domain.error'
import type { AccountRepository } from '../account/account.repository'
import type { PersonRepository } from '../person/person.repository'
import { InvoiceService } from './invoice.service'
import type { InvoiceRepository } from './invoice.repository'

function accountsMock() {
  return { findById: jest.fn() } as unknown as jest.Mocked<AccountRepository>
}

function peopleMock() {
  return { findSelf: jest.fn() } as unknown as jest.Mocked<PersonRepository>
}

function repoMock() {
  return { findRows: jest.fn() } as unknown as jest.Mocked<InvoiceRepository>
}

function accountRow(overrides: Partial<AccountRow> = {}): AccountRow {
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

    it('calcula a fatura da conta no mês', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow())
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
      expect(result).toEqual({ totalCents: 1700, mineCents: 1000, notMineCents: 700 })
    })
  })

  describe('getSummary', () => {
    it('soma todos os cartões, sem accountId', async () => {
      const people = peopleMock()
      people.findSelf.mockResolvedValue(personRow())
      const repo = repoMock()
      repo.findRows.mockResolvedValue([{ kind: 'EXPENSE', amountCents: 500, personId: 'self-1', splits: [] }])
      const service = new InvoiceService(repo, accountsMock(), people)

      const result = await service.getSummary('user-1', '2026-09')

      expect(repo.findRows).toHaveBeenCalledWith('user-1', { start: expect.any(Date), end: expect.any(Date) })
      expect(result).toEqual({ totalCents: 500, mineCents: 500, notMineCents: 0 })
    })

    it('sem Pessoa self, falha alto (invariante quebrada)', async () => {
      const people = peopleMock()
      people.findSelf.mockResolvedValue(null)
      const service = new InvoiceService(repoMock(), accountsMock(), people)

      await expect(service.getSummary('user-1', '2026-09')).rejects.toBeInstanceOf(DomainError)
    })
  })
})
