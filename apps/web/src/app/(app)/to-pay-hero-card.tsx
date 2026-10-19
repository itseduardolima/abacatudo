import type { BudgetPace } from '@gastos/shared'
import { MoneyText } from '@/components/finance/MoneyText'

export function ToPayHeroCard({ pace }: { pace: BudgetPace }) {
  return (
    <div className="flex h-full flex-col justify-between rounded-card-lg bg-inverse px-5 py-6 text-on-inverse">
      <div>
        <p className="text-xs text-on-inverse-muted">Falta pagar</p>
        <p className="display-number mt-3 text-[2.75rem] text-on-inverse-accent">
          <MoneyText cents={pace.toPayCents} className="!text-on-inverse-accent" />
        </p>
        {pace.advancePaidCents > 0 && (
          <p className="mt-2.5 text-xs text-on-inverse-muted">
            já pago adiantado <MoneyText cents={pace.advancePaidCents} className="!text-on-inverse" />
          </p>
        )}
        {pace.paidFixedCents > 0 && (
          <p className="mt-1.5 text-xs text-on-inverse-muted">
            fixos pagos <MoneyText cents={pace.paidFixedCents} className="!text-on-inverse" />
          </p>
        )}
      </div>

      <div>
        <div className="my-4 h-px bg-on-inverse-hairline" />
        <div className="flex justify-between gap-4">
          <p className="text-sm text-on-inverse-muted">Sobram</p>
          <p className="text-xl font-bold text-on-inverse">
            <MoneyText cents={pace.remainingCents} className="!text-on-inverse" />
          </p>
        </div>
      </div>
    </div>
  )
}
