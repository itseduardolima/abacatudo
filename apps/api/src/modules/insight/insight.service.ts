import { Injectable } from '@nestjs/common'
import type { SpendingReport } from '@gastos/shared'
import { monthKey, monthRange, shiftMonthKey } from '../../common/date/timezone'
import { DomainError } from '../../common/errors/domain.error'
import { buildBreakdown, sumByCategory, sumByMerchant, sumByPerson, totalCents } from './insight.mapper'
import { InsightRepository } from './insight.repository'

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

@Injectable()
export class InsightService {
  constructor(private readonly repo: InsightRepository) {}

  // "Para onde vai o dinheiro" (HU 9.1): categoria/estabelecimento/pessoa do mês pedido, com variação vs.
  // mês anterior e vs. média dos 3 meses anteriores a ele — mesma janela usada por "categoria acima do
  // normal" (03-regras-negocio § Relatórios e insights).
  async spendingReport(userId: string, month?: string): Promise<SpendingReport> {
    const key = month ?? monthKey(new Date())
    if (!MONTH_KEY_PATTERN.test(key)) {
      throw new DomainError('INVALID_MONTH', 'Mês inválido (esperado AAAA-MM).', 400)
    }

    const [current, previous, monthMinus2, monthMinus3] = await Promise.all([
      this.repo.findSpendingRows(userId, monthRange(key)),
      this.repo.findSpendingRows(userId, monthRange(shiftMonthKey(key, -1))),
      this.repo.findSpendingRows(userId, monthRange(shiftMonthKey(key, -2))),
      this.repo.findSpendingRows(userId, monthRange(shiftMonthKey(key, -3))),
    ])
    const last3Months = [previous, monthMinus2, monthMinus3]

    return {
      month: key,
      totalCents: totalCents(current),
      byCategory: buildBreakdown(sumByCategory(current), sumByCategory(previous), last3Months.map(sumByCategory)),
      byMerchant: buildBreakdown(sumByMerchant(current), sumByMerchant(previous), last3Months.map(sumByMerchant)),
      byPerson: buildBreakdown(sumByPerson(current), sumByPerson(previous), last3Months.map(sumByPerson)),
    }
  }
}
