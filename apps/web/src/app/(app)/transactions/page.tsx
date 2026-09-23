'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { MoneyText } from '@/components/finance/MoneyText'
import { formatShortDate } from '@/lib/utils/format-date'
import { useTransactionsPage } from './use-transactions-page'

export default function TransactionsPage() {
  const { transactions, isLoading } = useTransactionsPage()

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col gap-6 px-4 py-8">
      <div>
        <Link href="/" className="text-sm text-muted underline underline-offset-4">
          ← Início
        </Link>
        <h1 className="display-number mt-2 text-[2rem] text-ink">Cartão</h1>
      </div>

      {isLoading && <p className="text-text">Carregando…</p>}

      {!isLoading && transactions.length === 0 && <p className="text-text">Nenhum lançamento neste mês.</p>}

      {transactions.length > 0 && (
        <ul className="flex flex-col gap-3">
          {transactions.map((tx) => (
            <li key={tx.id} className="flex items-center justify-between gap-3 rounded-card border border-border p-4">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{tx.merchant ?? tx.description}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                  <span>{formatShortDate(tx.occurredAt)}</span>
                  <Badge>{tx.categoryName ?? 'Sem categoria'}</Badge>
                  {tx.personName && <Badge>{tx.personName}</Badge>}
                </div>
              </div>
              <MoneyText cents={tx.kind === 'REFUND' ? -tx.amountCents : tx.amountCents} />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
