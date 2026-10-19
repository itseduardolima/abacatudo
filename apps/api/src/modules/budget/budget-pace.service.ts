import { Injectable } from '@nestjs/common'
import type { BudgetPace } from '@gastos/shared'
import { dayOfMonth, monthKey } from '../../common/date/timezone'
import { FixedExpenseService } from '../fixed-expense/fixed-expense.service'
import { InvoiceService } from '../invoice/invoice.service'
import { BudgetMonthService } from './budget-month.service'
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
    const [budget, invoice, fixed] = await Promise.all([
      this.budgetMonth.getOrCreate(userId, month),
      this.invoices.getSummaryWithAdvance(userId, month),
      this.fixedExpenses.getFigures(userId, month ?? monthKey(new Date())),
    ])
    const isCurrentMonth = budget.month === monthKey(new Date())
    const paidFixedCents = isCurrentMonth ? fixed.paidCents : 0

    const pace = computePace({
      monthKeyValue: budget.month,
      currentMonthKey: monthKey(new Date()),
      todayDayOfMonth: dayOfMonth(new Date()),
      capCents: budget.incomeCents,
      spentCents: invoice.mineCents + fixed.totalCents,
      cardsMineCents: invoice.mineCents,
    })
    const currentHalf = dayOfMonth(new Date()) <= 15 ? 1 : 2
    const firstHalfSpentCents = isCurrentMonth ? invoice.firstHalfMineCents + fixed.firstHalfCents : null
    const secondHalfSpentCents = isCurrentMonth ? invoice.secondHalfMineCents + fixed.secondHalfCents : null
    const firstHalfRemainingCents =
      firstHalfSpentCents === null ? null : budget.firstHalfIncomeCents - firstHalfSpentCents
    const secondHalfRemainingCents =
      secondHalfSpentCents === null ? null : budget.secondHalfIncomeCents - secondHalfSpentCents
    return {
      ...pace,
      advancePaidCents: invoice.advancePaidCents,
      grossSpentCents: pace.spentCents + invoice.advancePaidCents,
      paidFixedCents,
      toPayCents: pace.spentCents - paidFixedCents,
      firstHalfCapCents: budget.firstHalfIncomeCents,
      firstHalfSpentCents,
      firstHalfRemainingCents,
      secondHalfCapCents: budget.secondHalfIncomeCents,
      secondHalfSpentCents,
      secondHalfRemainingCents,
      currentHalf: isCurrentMonth ? (currentHalf as 1 | 2) : null,
      currentHalfRemainingCents: currentHalf === 1 ? firstHalfRemainingCents : secondHalfRemainingCents,
    }
  }
}
