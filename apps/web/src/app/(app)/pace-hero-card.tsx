import type { BudgetPace } from '@gastos/shared'
import { MoneyText } from '@/components/finance/MoneyText'
import { currentMonthKey, formatMonthName } from '@/lib/utils/format-month'

// Card de ritmo (HU 7.4) do hero da Início — extraído pra virar um item do carrossel (Fase 4: o segundo
// item é o saldo de benefício, quando existe).
export function PaceHeroCard({ pace }: { pace: BudgetPace }) {
  const isForecast = pace.month > currentMonthKey()
  const half = isForecast ? null : pace.halfPace
  const barSpentCents = half ? half.spentCents : pace.spentCents
  const barCapCents = half ? half.capCents : pace.capCents

  return (
    <div className="rounded-card-lg bg-inverse px-5 py-6 text-on-inverse">
      <div className="flex items-center justify-between">
        <p className="text-xs text-on-inverse-muted">
          {isForecast ? 'Meu previsto em' : 'Meu em'} {formatMonthName(pace.month)}
        </p>
      </div>
      <p className="display-number mt-3 text-[2.75rem] text-on-inverse-accent">
        <MoneyText cents={pace.spentCents} className="!text-on-inverse-accent" />
      </p>

      <div className="mt-7 flex justify-between text-xs text-on-inverse-muted">
        <span>
          {half
            ? `${half.half}ª quinzena (${half.startDay}–${half.endDay})`
            : isForecast
              ? 'Previsto no mês'
              : 'No mês'}{' '}
          <MoneyText cents={barSpentCents} className="!text-on-inverse" />
        </span>
        <span>
          Teto <MoneyText cents={barCapCents} className="!text-on-inverse" />
        </span>
      </div>
      <div className="mt-1.5 h-3.5 rounded-pill bg-on-inverse-hairline">
        <div
          className="h-full rounded-pill bg-on-inverse-accent"
          style={{ width: `${barCapCents > 0 ? Math.min((barSpentCents / barCapCents) * 100, 100) : 0}%` }}
        />
      </div>
      <p className="mt-2.5 text-xs text-on-inverse-muted">
        Nos cartões <MoneyText cents={pace.cardsMineCents} className="!text-on-inverse" />
      </p>

      <div className="my-4 h-px bg-on-inverse-hairline" />

      <div>
        <p className="text-sm text-on-inverse-muted">Sobram</p>
        <p className="mt-1 text-xl font-bold text-on-inverse">
          <MoneyText cents={pace.remainingCents} className="!text-on-inverse" />
        </p>
      </div>
    </div>
  )
}
