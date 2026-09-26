'use client'

import { BenefitBalanceCard } from './benefit-balance-card'
import { CardInvoiceRow } from './card-invoice-row'
import { ConnectBankCard } from './connect-bank-card'
import { HeroCarousel } from './hero-carousel'
import { PaceHeroCard } from './pace-hero-card'
import { useHomePage } from './use-home-page'
import { CardStatementSwitch } from '@/components/layout/CardStatementSwitch'
import { Logo } from '@/components/ui/Logo'
import { formatMonthName } from '@/lib/utils/format-month'

// Home fiel ao protótipo: sem cartão conectado mostra o convite pra conectar (03-inicio-vazio); com
// cartão, o hero de ritmo (HU 7.4, `/budget/pace`) + faturas do mês (`/invoice` por cartão) do 07-inicio.
// Segmentado "Cartão | Extrato" no topo: o Extrato (movimentações, 5.2) fica em `/movements`.
export default function HomePage() {
  const {
    isLoadingMe,
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
        <CardStatementSwitch active="card" />
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
    </main>
  )
}
