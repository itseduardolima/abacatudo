import type { BudgetPace } from '@gastos/shared'
import { MoneyText } from '@/components/finance/MoneyText'
import { currentMonthKey, formatMonthName } from '@/lib/utils/format-month'

export function PaceHeroCard({ pace }: { pace: BudgetPace }) {
  const isForecast = pace.month > currentMonthKey()
  const spentPercent = pace.capCents > 0 ? Math.min((pace.grossSpentCents / pace.capCents) * 100, 100) : 0

  return (
    <div className="flex h-full flex-col justify-between rounded-card-lg bg-inverse px-5 py-6 text-on-inverse">
      <div>
        <p className="text-xs text-on-inverse-muted">
          {isForecast ? 'Meu previsto em' : 'Meu em'} {formatMonthName(pace.month)}
        </p>
        <p className="display-number mt-3 text-[2.75rem] text-on-inverse-accent">
          <MoneyText cents={pace.grossSpentCents} className="!text-on-inverse-accent" />
        </p>
      </div>

      <div>
        <div className="mt-7 h-3.5 rounded-pill bg-on-inverse-hairline">
          <div
            data-testid="spent-bar"
            className="h-full rounded-pill bg-on-inverse-accent"
            style={{ width: `${spentPercent}%` }}
          />
        </div>
        <p className="mt-2.5 text-xs text-on-inverse-muted">
          de <MoneyText cents={pace.capCents} className="!text-on-inverse" /> de renda
        </p>
      </div>
    </div>
  )
}
