import { Check } from 'lucide-react'
import type { FixedExpense } from '@gastos/shared'
import { MoneyText } from '@/components/finance/MoneyText'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { fixedExpenseShareKey } from '@/lib/utils/fixed-expense-key'

const HALVES = [
  { half: 1, title: '1ª quinzena', hint: 'dia 15' },
  { half: 2, title: '2ª quinzena', hint: 'dia 30' },
] as const

export function FixedExpensesSection({
  expenses,
  currentHalf,
  pendingKeys,
  error,
  onToggle,
}: {
  expenses: FixedExpense[]
  currentHalf: 1 | 2 | null
  pendingKeys: ReadonlySet<string>
  error: string | null
  onToggle: (id: string, half: 1 | 2, paid: boolean) => void
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-ink">Gastos fixos</h2>
      {error && <InlineAlert>{error}</InlineAlert>}
      {HALVES.map(({ half, title, hint }) => {
        const rows = expenses.flatMap((expense) =>
          expense.shares.filter((share) => share.half === half).map((share) => ({ expense, share })),
        )
        if (rows.length === 0) return null
        const paidCount = rows.filter((row) => row.share.paid).length
        return (
          <div key={half} data-current={currentHalf === half}>
            <div className="flex items-baseline justify-between gap-2">
              <p className={`text-sm font-semibold ${currentHalf === half ? 'text-ink' : 'text-muted'}`}>
                {title} <span className="font-normal text-muted">· {hint}</span>
              </p>
              <p className="text-xs text-muted">
                {paidCount} de {rows.length} pagos
              </p>
            </div>
            <ul className="mt-1 flex flex-col">
              {rows.map(({ expense, share }) => (
                <li key={expense.id} className="flex items-center gap-3 border-b border-surface py-3 last:border-b-0">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={share.paid}
                    aria-label={`${expense.name} pago na ${title}`}
                    disabled={pendingKeys.has(fixedExpenseShareKey(expense.id, half))}
                    onClick={() => onToggle(expense.id, half, !share.paid)}
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors disabled:opacity-50 ${
                      share.paid
                        ? 'border-primary bg-primary text-ink'
                        : 'border-border bg-transparent text-transparent'
                    }`}
                  >
                    <Check size={14} strokeWidth={3} />
                  </button>
                  <div className="flex-1">
                    <p className={`font-semibold ${share.paid ? 'text-muted line-through' : 'text-ink'}`}>
                      {expense.name}
                    </p>
                    {expense.half === 3 && <p className="text-xs text-muted">metade</p>}
                  </div>
                  <MoneyText cents={share.amountCents} className={share.paid ? '!text-muted' : ''} />
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </section>
  )
}
