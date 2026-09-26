import { Injectable } from '@nestjs/common'
import type { SpendingReport } from '@gastos/shared'
import { dayOfMonth, monthKey, shiftMonthKey } from '../../common/date/timezone'
import { DomainError } from '../../common/errors/domain.error'
import { PersonRepository } from '../person/person.repository'
import {
  bucketByMonth,
  buildBreakdown,
  monthsWithRows,
  sumByCategory,
  sumByMerchant,
  sumByPerson,
  totalCents,
} from './insight.mapper'
import { InsightRepository } from './insight.repository'

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

@Injectable()
export class InsightService {
  constructor(
    private readonly repo: InsightRepository,
    private readonly people: PersonRepository,
  ) {}

  // "Para onde vai o dinheiro" (HU 9.1): categoria/estabelecimento (só a parte do dono) e pessoa (todas) do
  // mês pedido, com variação vs. mês anterior e vs. média dos 3 meses anteriores a ele — mesma janela usada
  // por "categoria acima do normal". No mês corrente, os meses de comparação só contam até o mesmo dia
  // (mesmo período); num mês passado, é mês inteiro contra mês inteiro.
  async spendingReport(userId: string, month?: string): Promise<SpendingReport> {
    const today = new Date()
    const key = month ?? monthKey(today)
    if (!MONTH_KEY_PATTERN.test(key)) {
      throw new DomainError('INVALID_MONTH', 'Mês inválido (esperado AAAA-MM).', 400)
    }
    const selfId = await this.selfPersonId(userId)

    const previousKeys = [-1, -2, -3].map((delta) => shiftMonthKey(key, delta))
    const throughDay = key === monthKey(today) ? dayOfMonth(today) : null

    const rows = await this.repo.findRows(userId, key)
    const buckets = bucketByMonth(rows, [key, ...previousKeys], throughDay)
    const rowsOf = (monthKey: string) => buckets.get(monthKey) ?? []
    const current = rowsOf(key)
    const previous = rowsOf(shiftMonthKey(key, -1))
    const last3Months = previousKeys.map(rowsOf)
    const presentMonths = monthsWithRows(rows, previousKeys)
    const hasFullHistory = previousKeys.every((previousKey) => presentMonths.has(previousKey))

    return {
      month: key,
      totalCents: totalCents(current, selfId),
      throughDay,
      byCategory: buildBreakdown(
        sumByCategory(current, selfId),
        sumByCategory(previous, selfId),
        last3Months.map((monthRows) => sumByCategory(monthRows, selfId)),
        { flagAboveNormal: true, hasFullHistory },
      ),
      byMerchant: buildBreakdown(
        sumByMerchant(current, selfId),
        sumByMerchant(previous, selfId),
        last3Months.map((monthRows) => sumByMerchant(monthRows, selfId)),
      ),
      byPerson: buildBreakdown(
        sumByPerson(current),
        sumByPerson(previous),
        last3Months.map((monthRows) => sumByPerson(monthRows)),
      ),
    }
  }

  private async selfPersonId(userId: string): Promise<string> {
    const self = await this.people.findSelf(userId)
    if (!self) throw new DomainError('SELF_PERSON_NOT_FOUND', 'Pessoa "Eu" não encontrada.', 500)
    return self.id
  }
}
