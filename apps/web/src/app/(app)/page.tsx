'use client'

import Link from 'next/link'
import { BenefitBalanceCard } from './benefit-balance-card'
import { CardInvoiceRow } from './card-invoice-row'
import { ConnectBankCard } from './connect-bank-card'
import { HeroCarousel } from './hero-carousel'
import { PaceHeroCard } from './pace-hero-card'
import { useHomePage } from './use-home-page'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
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
    benefitAccountName,
    benefitBalanceCents,
    benefitSyncedAt,
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
        <HeroCarousel
          cards={[
            { key: 'pace', content: <PaceHeroCard pace={pace} /> },
            ...(benefitBalanceCents != null
              ? [
                  {
                    key: 'benefit',
                    content: (
                      <BenefitBalanceCard
                        accountName={benefitAccountName}
                        cents={benefitBalanceCents}
                        syncedAt={benefitSyncedAt}
                      />
                    ),
                  },
                ]
              : []),
          ]}
        />
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
