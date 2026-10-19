import type { BudgetPace } from '@gastos/shared'
import { MoneyText } from '@/components/finance/MoneyText'

function HalfColumn({
  title,
  capCents,
  spentCents,
  remainingCents,
  isCurrent,
}: {
  title: string
  capCents: number
  spentCents: number | null
  remainingCents: number | null
  isCurrent: boolean
}) {
  return (
    <div
      data-current={isCurrent}
      className={`flex-1 rounded-card px-3 py-3 ${isCurrent ? 'bg-on-inverse-hairline' : 'opacity-70'}`}
    >
      <p className="text-xs text-on-inverse-muted">{title}</p>
      <p className="mt-2 text-xl font-bold text-on-inverse">
        {spentCents === null ? '—' : <MoneyText cents={spentCents} className="!text-on-inverse" />}
      </p>
      <p className="mt-1 text-xs text-on-inverse-muted">
        de <MoneyText cents={capCents} className="!text-on-inverse" />
      </p>
      <p className="mt-3 text-xs text-on-inverse-muted">Sobram</p>
      <p className="text-sm font-bold text-on-inverse-accent">
        {remainingCents === null ? '—' : <MoneyText cents={remainingCents} className="!text-on-inverse-accent" />}
      </p>
    </div>
  )
}

export function FortnightHeroCard({ pace }: { pace: BudgetPace }) {
  return (
    <div className="flex h-full flex-col justify-between rounded-card-lg bg-inverse px-5 py-6 text-on-inverse">
      <p className="text-xs text-on-inverse-muted">Quinzenas</p>
      <div className="mt-3 flex gap-3">
        <HalfColumn
          title="1ª quinzena"
          capCents={pace.firstHalfCapCents}
          spentCents={pace.firstHalfSpentCents}
          remainingCents={pace.firstHalfRemainingCents}
          isCurrent={pace.currentHalf === 1}
        />
        <HalfColumn
          title="2ª quinzena"
          capCents={pace.secondHalfCapCents}
          spentCents={pace.secondHalfSpentCents}
          remainingCents={pace.secondHalfRemainingCents}
          isCurrent={pace.currentHalf === 2}
        />
      </div>
    </div>
  )
}
