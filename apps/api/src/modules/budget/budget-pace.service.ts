import { Injectable } from '@nestjs/common'
import type { BudgetPace } from '@gastos/shared'
import { dayOfMonth, halfMonthRange, halfOfDay, monthKey } from '../../common/date/timezone'
import { FixedExpenseService } from '../fixed-expense/fixed-expense.service'
import { InvoiceService } from '../invoice/invoice.service'
import { BudgetMonthService } from './budget-month.service'
import { computeHalfPace } from './half-pace.mapper'
import { computePace } from './pace.mapper'

@Injectable()
export class BudgetPaceService {
  constructor(
    private readonly budgetMonth: BudgetMonthService,
    private readonly invoices: InvoiceService,
    private readonly fixedExpenses: FixedExpenseService,
  ) {}

  // Teto = renda informada (a pedido do usuário: nem benefício, nem poupança entram aqui — cada um tem
  // seu próprio lugar, não competem pelo mesmo teto). Gasto = fatura aberta somada em todos os cartões
  // (InvoiceService.getSummary) + gastos fixos ativos (aluguel, internet...) — os dois já eram "meu gasto
  // do mês" antes de existir orçamento, só nunca tinham sido somados juntos.
  async getPace(userId: string, month?: string): Promise<BudgetPace> {
    const [budget, invoice, fixedExpensesCents] = await Promise.all([
      this.budgetMonth.getOrCreate(userId, month),
      this.invoices.getSummary(userId, month),
      this.fixedExpenses.sumActiveCents(userId),
    ])

    const pace = computePace({
      monthKeyValue: budget.month,
      currentMonthKey: monthKey(new Date()),
      todayDayOfMonth: dayOfMonth(new Date()),
      capCents: budget.incomeCents,
      spentCents: invoice.mineCents + fixedExpensesCents,
      cardsMineCents: invoice.mineCents,
    })
    return { ...pace, halfPace: await this.halfPace(userId, budget, pace.daysInMonth) }
  }

  private async halfPace(
    userId: string,
    budget: { month: string; firstHalfIncomeCents: number; secondHalfIncomeCents: number },
    daysInMonth: number,
  ) {
    if (budget.month !== monthKey(new Date())) return null
    const half = halfOfDay(dayOfMonth(new Date()))
    const [cardsCents, fixedCents] = await Promise.all([
      this.invoices.getHalfMineCents(userId, halfMonthRange(budget.month, half)),
      this.fixedExpenses.sumActiveCentsByHalf(userId, half),
    ])
    return computeHalfPace({
      half,
      daysInMonth,
      capCents: half === 1 ? budget.firstHalfIncomeCents : budget.secondHalfIncomeCents,
      spentCents: cardsCents + fixedCents,
    })
  }
}
