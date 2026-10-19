import { Check } from 'lucide-react'
import type { FixedExpense } from '@gastos/shared'
import { MoneyText } from '@/components/finance/MoneyText'
import { InlineAlert } from '@/components/ui/InlineAlert'

export function FixedExpensesSection({
  expenses,
  pendingId,
  error,
  onToggle,
}: {
  expenses: FixedExpense[]
  pendingId: string | null
  error: string | null
  onToggle: (id: string, paid: boolean) => void
}) {
  const paidCount = expenses.filter((expense) => expense.paid).length

  return (
    <section>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-ink">Gastos fixos</h2>
        <p className="text-xs text-muted">
          {paidCount} de {expenses.length} pagos
        </p>
      </div>
      {error && (
        <div className="mt-2">
          <InlineAlert>{error}</InlineAlert>
        </div>
      )}
      <ul className="mt-1 flex flex-col">
        {expenses.map((expense) => (
          <li key={expense.id} className="flex items-center gap-3 border-b border-surface py-3 last:border-b-0">
            <button
              type="button"
              role="checkbox"
              aria-checked={expense.paid}
              aria-label={`${expense.name} pago`}
              disabled={pendingId === expense.id}
              onClick={() => onToggle(expense.id, !expense.paid)}
              className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors disabled:opacity-50 ${
                expense.paid ? 'border-primary bg-primary text-ink' : 'border-border bg-transparent text-transparent'
              }`}
            >
              <Check size={14} strokeWidth={3} />
            </button>
            <p className={`flex-1 font-semibold ${expense.paid ? 'text-muted line-through' : 'text-ink'}`}>
              {expense.name}
            </p>
            <MoneyText cents={expense.amountCents} className={expense.paid ? '!text-muted' : ''} />
          </li>
        ))}
      </ul>
    </section>
  )
}
