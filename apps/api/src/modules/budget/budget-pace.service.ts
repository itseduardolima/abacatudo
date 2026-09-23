import { Injectable } from '@nestjs/common'
import type { BudgetPace } from '@gastos/shared'
import { dayOfMonth, monthKey } from '../../common/date/timezone'
import { InvoiceService } from '../invoice/invoice.service'
import { BudgetMonthService } from './budget-month.service'
import { computePace } from './pace.mapper'

@Injectable()
export class BudgetPaceService {
  constructor(
    private readonly budgetMonth: BudgetMonthService,
    private readonly invoices: InvoiceService,
  ) {}

  // spentCents é o "Meu" do mês somado em todos os cartões (InvoiceService.getSummary) — o mesmo número
  // que já alimenta a fatura, pra não ter duas contas de "quanto eu já gastei" divergentes.
  async getPace(userId: string, month?: string): Promise<BudgetPace> {
    const [budget, invoice] = await Promise.all([
      this.budgetMonth.getOrCreate(userId, month),
      this.invoices.getSummary(userId, month),
    ])

    return computePace({
      monthKeyValue: budget.month,
      currentMonthKey: monthKey(new Date()),
      todayDayOfMonth: dayOfMonth(new Date()),
      capCents: budget.variableCapCents,
      spentCents: invoice.mineCents,
    })
  }
}
