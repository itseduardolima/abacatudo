'use client'

import Link from 'next/link'
import { CardInvoiceRow } from './card-invoice-row'
import { ConnectBankCard } from './connect-bank-card'
import { useHomePage } from './use-home-page'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { MoneyText } from '@/components/finance/MoneyText'
import { formatMonthName } from '@/lib/utils/format-month'

// Home fiel ao protótipo: sem cartão conectado mostra o convite pra conectar (03-inicio-vazio); com
// cartão, o hero de ritmo (HU 7.4, `/budget/pace`) + faturas do mês (`/invoice` por cartão) do 07-inicio.
// Segmentado "Cartão/Extrato": só "Cartão" tem tela — "Extrato" (movimentações, 5.2) fica inerte até ter
// UI própria, em vez de link morto.
export default function HomePage() {
  const {
    email,
    isLoadingMe,
    onLogout,
    isLoggingOut,
    pace,
    isLoadingPace,
    cardAccounts,
    isLoadingAccounts,
    onConnectBank,
    isConnectingBank,
    connectError,
  } = useHomePage()
  const hasNoCard = !isLoadingAccounts && cardAccounts.length === 0

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col gap-6 px-4 pb-28 md:pb-10 pt-8">
      <div className="flex items-center justify-between">
        <div className="inline-flex gap-1 rounded-pill bg-surface p-1">
          <span className="rounded-pill bg-primary px-4 py-1.5 text-sm font-semibold text-primary-ink">Cartão</span>
          <span className="rounded-pill px-4 py-1.5 text-sm text-border" title="Extrato (em breve)">
            Extrato
          </span>
        </div>
        <Logo height={32} />
      </div>

      {isLoadingMe && <p className="text-text">Carregando…</p>}

      {hasNoCard && (
        <ConnectBankCard onConnect={() => void onConnectBank()} isConnecting={isConnectingBank} error={connectError} />
      )}

      {!isLoadingMe && !hasNoCard && !isLoadingPace && pace && (
        <div className="rounded-card-lg bg-inverse px-5 py-6 text-on-inverse">
          <div className="flex items-center justify-between">
            <p className="text-xs text-on-inverse-muted">Meu em {formatMonthName(pace.month)}</p>
            {pace.status === 'ON_TRACK' && (
              <span className="flex items-center gap-1.5 rounded-pill bg-accent-tint-on-inverse px-3 py-1.5 text-xs font-semibold text-on-inverse-accent">
                ✓ No ritmo
              </span>
            )}
          </div>
          <p className="display-number mt-3 text-[2.75rem] text-on-inverse-accent">
            <MoneyText cents={pace.spentCents} className="!text-on-inverse-accent" />
          </p>

          <p className="mt-7 text-center text-xs text-on-inverse-muted">ritmo de hoje</p>
          <div className="relative mt-1.5 h-3.5 rounded-pill bg-on-inverse-hairline">
            <div
              className="h-full rounded-pill bg-on-inverse-accent"
              style={{ width: `${pace.capCents > 0 ? Math.min((pace.spentCents / pace.capCents) * 100, 100) : 0}%` }}
            />
            <div
              className="absolute -top-1 h-5 w-0.5 -translate-x-1/2 rounded-full bg-on-inverse"
              style={{ left: `${pace.daysInMonth > 0 ? (pace.daysElapsed / pace.daysInMonth) * 100 : 0}%` }}
            />
          </div>
          <div className="mt-2.5 flex justify-between text-xs text-on-inverse-muted">
            <span>
              {pace.diffCents >= 0 ? (
                <>
                  <MoneyText cents={pace.diffCents} className="!text-on-inverse" /> abaixo do ritmo
                </>
              ) : (
                <>
                  <MoneyText cents={-pace.diffCents} className="!text-on-inverse" /> acima do ritmo
                </>
              )}
            </span>
            <span>
              Teto <MoneyText cents={pace.capCents} className="!text-on-inverse" />
            </span>
          </div>

          <div className="my-4 h-px bg-on-inverse-hairline" />

          <div>
            <p className="text-sm text-on-inverse-muted">Sobram</p>
            <p className="mt-1 text-xl font-bold text-on-inverse">
              <MoneyText cents={pace.remainingCents} className="!text-on-inverse" />
            </p>
          </div>
        </div>
      )}

      {!isLoadingAccounts && cardAccounts.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-ink">Faturas{pace ? ` de ${formatMonthName(pace.month)}` : ''}</h2>
          <div className="mt-1">
            {cardAccounts.map((account) => (
              <CardInvoiceRow key={account.id} account={account} />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2 border-t border-surface pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Configurar</p>
        <Link href="/accounts" className="text-text underline underline-offset-4">
          Contas
        </Link>
        <Link href="/settings/people" className="text-text underline underline-offset-4">
          Pessoas
        </Link>
        <Link href="/settings/categories" className="text-text underline underline-offset-4">
          Categorias
        </Link>
        <Link href="/settings/fixed-expenses" className="text-text underline underline-offset-4">
          Gastos fixos
        </Link>
        <Link href="/settings/income" className="text-text underline underline-offset-4">
          Renda
        </Link>
      </section>

      <p className="text-sm text-muted">{email}</p>
      <Button variant="outline" state={isLoggingOut ? 'loading' : 'idle'} onClick={() => void onLogout()}>
        Sair
      </Button>
    </main>
  )
}
