import type { BudgetPace } from '@gastos/shared'
import { MoneyText } from '@/components/finance/MoneyText'
import { currentMonthKey, formatMonthName } from '@/lib/utils/format-month'

// Card de ritmo (HU 7.4) do hero da Início — extraído pra virar um item do carrossel (Fase 4: o segundo
// item é o saldo de benefício, quando existe).
export function PaceHeroCard({ pace }: { pace: BudgetPace }) {
  const isForecast = pace.month > currentMonthKey()
  const firstHalfPercent =
    pace.capCents > 0 && pace.firstHalfCapCents > 0
      ? Math.min((pace.firstHalfCapCents / pace.capCents) * 100, 100)
      : null

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
          Nos cartões <MoneyText cents={pace.cardsMineCents} className="!text-on-inverse" />
        </span>
        <span>
          Teto <MoneyText cents={pace.capCents} className="!text-on-inverse" />
        </span>
      </div>
      <div className="relative mt-1.5 h-3.5 rounded-pill bg-on-inverse-hairline">
        <div
          className="h-full rounded-pill bg-on-inverse-accent"
          style={{ width: `${pace.capCents > 0 ? Math.min((pace.spentCents / pace.capCents) * 100, 100) : 0}%` }}
        />
        {firstHalfPercent !== null && (
          <div
            className="absolute -top-1 h-5 w-0.5 -translate-x-1/2 rounded-full bg-on-inverse"
            style={{ left: `${firstHalfPercent}%` }}
          />
        )}
      </div>
      {firstHalfPercent !== null && (
        <div className="relative mt-1.5 h-9 text-xs text-on-inverse-muted">
          <div
            className="absolute -translate-x-1/2 whitespace-nowrap text-center"
            style={{ left: `${firstHalfPercent}%` }}
          >
            <p>
              Teto dia 15 <MoneyText cents={pace.firstHalfCapCents} className="!text-on-inverse" />
            </p>
            {pace.firstHalfSpentCents !== null && (
              <p>
                Gasto <MoneyText cents={pace.firstHalfSpentCents} className="!text-on-inverse" />
              </p>
            )}
          </div>
        </div>
      )}

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
