import type { Account as AccountRow, Person as PersonRow } from '@prisma/client'
import { monthKey, shiftMonthKey } from '../../common/date/timezone'
import { DomainError, NotFoundError } from '../../common/errors/domain.error'
import type { AccountRepository, AccountWithPluggyItem } from '../account/account.repository'
import type { PluggyClient } from '../banking/pluggy/pluggy.client'
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
  return {
    findRows: jest.fn(),
    findOpenRows: jest.fn(),
    findForecastRows: jest.fn(),
    findLastInstallmentDueAt: jest.fn(),
  } as unknown as jest.Mocked<InvoiceRepository>
}

function pluggyMock() {
  return { getLastClosedBill: jest.fn() } as unknown as jest.Mocked<PluggyClient>
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
    balanceCents: null,
    isBenefitAccount: false,
    bankLogo: null,
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
      const service = new InvoiceService(repoMock(), accounts, peopleMock(), pluggyMock())

      await expect(service.getForAccount('user-1', undefined, '2026-09')).rejects.toBeInstanceOf(DomainError)
      expect(accounts.findById).not.toHaveBeenCalled()
    })

    it('404 quando a conta não existe (ou não é do usuário)', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(null)
      const service = new InvoiceService(repoMock(), accounts, peopleMock(), pluggyMock())

      await expect(service.getForAccount('user-1', 'acc-1', '2026-09')).rejects.toBeInstanceOf(NotFoundError)
    })

    it('422 quando a conta não é cartão de crédito', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow({ type: 'CHECKING' }))
      const service = new InvoiceService(repoMock(), accounts, peopleMock(), pluggyMock())

      await expect(service.getForAccount('user-1', 'acc-1', '2026-09')).rejects.toBeInstanceOf(DomainError)
    })

    it('conta MANUAL: calcula a fatura pelo mês calendário, nunca chama o Pluggy', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow({ source: 'MANUAL' }))
      const people = peopleMock()
      people.findSelf.mockResolvedValue(personRow())
      const repo = repoMock()
      repo.findRows.mockResolvedValue([
        { kind: 'EXPENSE', amountCents: 1000, personId: 'self-1', splits: [], installment: null },
        { kind: 'EXPENSE', amountCents: 700, personId: 'family-1', splits: [], installment: null },
      ])
      const pluggy = pluggyMock()
      const service = new InvoiceService(repo, accounts, people, pluggy)

      const result = await service.getForAccount('user-1', 'acc-1', '2026-09')

      expect(repo.findRows).toHaveBeenCalledWith('user-1', { start: expect.any(Date), end: expect.any(Date) }, 'acc-1')
      expect(pluggy.getLastClosedBill).not.toHaveBeenCalled()
      expect(result).toMatchObject({ totalCents: 1700, mineCents: 1000, notMineCents: 700 })
    })

    it('conta PLUGGY: soma o saldo da última fatura fechada com a movimentação sem billId, só a próxima parcela de cada compra', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow({ source: 'PLUGGY', externalAccountId: 'ext-1' }))
      const people = peopleMock()
      people.findSelf.mockResolvedValue(personRow())
      const repo = repoMock()
      repo.findOpenRows.mockResolvedValue([
        { kind: 'EXPENSE', amountCents: 100000, personId: 'self-1', splits: [], installment: null },
        {
          kind: 'EXPENSE',
          amountCents: 5000,
          personId: 'self-1',
          splits: [],
          installment: { groupKey: 'compra-1', number: 3 },
        },
        {
          kind: 'EXPENSE',
          amountCents: 5000,
          personId: 'self-1',
          splits: [],
          installment: { groupKey: 'compra-1', number: 4 },
        },
        { kind: 'CARD_PAYMENT', amountCents: 40000, personId: 'self-1', splits: [], installment: null },
      ])
      const pluggy = pluggyMock()
      pluggy.getLastClosedBill.mockResolvedValue({ id: 'bill-1', dueDate: '2026-09-03', totalAmount: 1000 })
      const service = new InvoiceService(repo, accounts, people, pluggy)

      const result = await service.getForAccount('user-1', 'acc-1', '2026-09')

      expect(pluggy.getLastClosedBill).toHaveBeenCalledWith('ext-1')
      // 100000 (carryover) + 100000 + 5000 (só a parcela 3, a 4 é futura, descartada) - 40000 = 165000
      expect(result).toMatchObject({ totalCents: 165000, mineCents: 165000, notMineCents: 0 })
    })

    it('conta PLUGGY sem fatura fechada ainda (cartão novo): sem saldo anterior', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow({ source: 'PLUGGY', externalAccountId: 'ext-1' }))
      const people = peopleMock()
      people.findSelf.mockResolvedValue(personRow())
      const repo = repoMock()
      repo.findOpenRows.mockResolvedValue([
        { kind: 'EXPENSE', amountCents: 5000, personId: 'self-1', splits: [], installment: null },
      ])
      const pluggy = pluggyMock()
      pluggy.getLastClosedBill.mockResolvedValue(null)
      const service = new InvoiceService(repo, accounts, people, pluggy)

      const result = await service.getForAccount('user-1', 'acc-1', '2026-09')

      expect(result).toMatchObject({ totalCents: 5000, mineCents: 5000, notMineCents: 0 })
    })

    it('Pluggy indisponível: não derruba a tela, sem saldo anterior', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow({ source: 'PLUGGY', externalAccountId: 'ext-1' }))
      const people = peopleMock()
      people.findSelf.mockResolvedValue(personRow())
      const repo = repoMock()
      repo.findOpenRows.mockResolvedValue([
        { kind: 'EXPENSE', amountCents: 5000, personId: 'self-1', splits: [], installment: null },
      ])
      const pluggy = pluggyMock()
      pluggy.getLastClosedBill.mockRejectedValue(new Error('boom'))
      const service = new InvoiceService(repo, accounts, people, pluggy)

      const result = await service.getForAccount('user-1', 'acc-1', '2026-09')

      expect(result).toMatchObject({ totalCents: 5000, mineCents: 5000, notMineCents: 0 })
    })
  })

  describe('getForAccount — fatura prevista', () => {
    const currentMonth = monthKey(new Date())
    const futureMonth = shiftMonthKey(currentMonth, 2)

    it('conta PLUGGY em mês futuro: só as parcelas do mês, sem saldo anterior nem Pluggy, e Fatura = Meu + Não é meu', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow({ source: 'PLUGGY', externalAccountId: 'ext-1' }))
      const people = peopleMock()
      people.findSelf.mockResolvedValue(personRow())
      const repo = repoMock()
      repo.findForecastRows.mockResolvedValue([
        { kind: 'EXPENSE', amountCents: 10000, personId: 'self-1', splits: [], installment: null },
        { kind: 'EXPENSE', amountCents: 6000, personId: 'family-1', splits: [], installment: null },
        {
          kind: 'EXPENSE',
          amountCents: 4000,
          personId: 'self-1',
          splits: [
            { personId: 'self-1', amountCents: 1000 },
            { personId: 'family-1', amountCents: 3000 },
          ],
          installment: null,
        },
      ])
      repo.findLastInstallmentDueAt.mockResolvedValue(new Date(`${shiftMonthKey(currentMonth, 5)}-15T12:00:00.000Z`))
      const pluggy = pluggyMock()
      const service = new InvoiceService(repo, accounts, people, pluggy)

      const result = await service.getForAccount('user-1', 'acc-1', futureMonth)

      expect(repo.findForecastRows).toHaveBeenCalledWith('user-1', 'acc-1', {
        start: expect.any(Date),
        end: expect.any(Date),
      })
      expect(repo.findOpenRows).not.toHaveBeenCalled()
      expect(pluggy.getLastClosedBill).not.toHaveBeenCalled()
      expect(result).toEqual({
        totalCents: 20000,
        mineCents: 11000,
        notMineCents: 9000,
        isForecast: true,
        lastForecastMonth: shiftMonthKey(currentMonth, 5),
      })
      expect(result.totalCents).toBe(result.mineCents + result.notMineCents)
    })

    it('mês futuro sem nenhuma parcela: fatura zerada, sem inventar valor', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow({ source: 'PLUGGY', externalAccountId: 'ext-1' }))
      const people = peopleMock()
      people.findSelf.mockResolvedValue(personRow())
      const repo = repoMock()
      repo.findForecastRows.mockResolvedValue([])
      repo.findLastInstallmentDueAt.mockResolvedValue(null)
      const service = new InvoiceService(repo, accounts, people, pluggyMock())

      await expect(service.getForAccount('user-1', 'acc-1', futureMonth)).resolves.toEqual({
        totalCents: 0,
        mineCents: 0,
        notMineCents: 0,
        isForecast: true,
        lastForecastMonth: null,
      })
    })

    it('mês atual (ou sem mês) não é previsão, mas informa até onde vai a previsão', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow({ source: 'PLUGGY', externalAccountId: 'ext-1' }))
      const people = peopleMock()
      people.findSelf.mockResolvedValue(personRow())
      const repo = repoMock()
      repo.findOpenRows.mockResolvedValue([])
      repo.findLastInstallmentDueAt.mockResolvedValue(new Date(`${shiftMonthKey(currentMonth, 3)}-10T12:00:00.000Z`))
      const pluggy = pluggyMock()
      pluggy.getLastClosedBill.mockResolvedValue(null)
      const service = new InvoiceService(repo, accounts, people, pluggy)

      const result = await service.getForAccount('user-1', 'acc-1', currentMonth)

      expect(repo.findForecastRows).not.toHaveBeenCalled()
      expect(result).toMatchObject({ isForecast: false, lastForecastMonth: shiftMonthKey(currentMonth, 3) })
    })

    it('conta MANUAL nunca vira previsão nem consulta parcelas', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow({ source: 'MANUAL' }))
      const people = peopleMock()
      people.findSelf.mockResolvedValue(personRow())
      const repo = repoMock()
      repo.findRows.mockResolvedValue([])
      const service = new InvoiceService(repo, accounts, people, pluggyMock())

      const result = await service.getForAccount('user-1', 'acc-1', futureMonth)

      expect(repo.findForecastRows).not.toHaveBeenCalled()
      expect(repo.findLastInstallmentDueAt).not.toHaveBeenCalled()
      expect(result).toMatchObject({ isForecast: false, lastForecastMonth: null })
    })

    it('mês inválido em conta PLUGGY: 400 INVALID_MONTH', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(accountRow({ source: 'PLUGGY', externalAccountId: 'ext-1' }))
      const people = peopleMock()
      people.findSelf.mockResolvedValue(personRow())
      const service = new InvoiceService(repoMock(), accounts, people, pluggyMock())

      await expect(service.getForAccount('user-1', 'acc-1', '2026-13')).rejects.toMatchObject({
        code: 'INVALID_MONTH',
      })
    })

    it('dois usuários: cartão de outro usuário é 404 e nenhuma parcela dele é lida', async () => {
      const accounts = accountsMock()
      accounts.findById.mockResolvedValue(null)
      const repo = repoMock()
      const service = new InvoiceService(repo, accounts, peopleMock(), pluggyMock())

      await expect(service.getForAccount('user-2', 'acc-do-user-1', futureMonth)).rejects.toBeInstanceOf(NotFoundError)
      expect(accounts.findById).toHaveBeenCalledWith('user-2', 'acc-do-user-1')
      expect(repo.findForecastRows).not.toHaveBeenCalled()
    })
  })

  describe('getSummary', () => {
    it('soma a fatura de todos os cartões, cada um com o critério certo pra sua fonte', async () => {
      const people = peopleMock()
      people.findSelf.mockResolvedValue(personRow())
      const accounts = accountsMock()
      accounts.findMany.mockResolvedValue([
        accountRow({ id: 'acc-pluggy', source: 'PLUGGY', externalAccountId: 'ext-1' }),
        accountRow({ id: 'acc-manual', source: 'MANUAL' }),
        accountRow({ id: 'acc-checking', type: 'CHECKING', source: 'MANUAL' }),
      ])
      const repo = repoMock()
      repo.findOpenRows.mockResolvedValue([
        { kind: 'EXPENSE', amountCents: 58988, personId: 'self-1', splits: [], installment: null },
      ])
      repo.findRows.mockResolvedValue([
        { kind: 'EXPENSE', amountCents: 500, personId: 'self-1', splits: [], installment: null },
      ])
      const pluggy = pluggyMock()
      pluggy.getLastClosedBill.mockResolvedValue(null)
      const service = new InvoiceService(repo, accounts, people, pluggy)

      const result = await service.getSummary('user-1')

      expect(accounts.findMany).toHaveBeenCalledWith('user-1', false)
      expect(repo.findOpenRows).toHaveBeenCalledWith('user-1', 'acc-pluggy')
      expect(repo.findRows).toHaveBeenCalledWith(
        'user-1',
        { start: expect.any(Date), end: expect.any(Date) },
        'acc-manual',
      )
      expect(repo.findRows).not.toHaveBeenCalledWith(
        'user-1',
        { start: expect.any(Date), end: expect.any(Date) },
        'acc-checking',
      )
      expect(result).toEqual({ totalCents: 59488, mineCents: 59488, notMineCents: 0 })
    })

    it('sem Pessoa self, falha alto (invariante quebrada)', async () => {
      const people = peopleMock()
      people.findSelf.mockResolvedValue(null)
      const service = new InvoiceService(repoMock(), accountsMock(), people, pluggyMock())

      await expect(service.getSummary('user-1')).rejects.toBeInstanceOf(DomainError)
    })
  })
})
