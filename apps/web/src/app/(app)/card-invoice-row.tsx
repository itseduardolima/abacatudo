'use client'

import type { Account } from '@gastos/shared'
import Link from 'next/link'
import { MoneyText } from '@/components/finance/MoneyText'
import { useInvoice } from '@/hooks/queries/use-invoice'

// Linha de "Faturas de [mês]" na Home (protótipo 07-inicio): um card por conta de cartão, com barra de
// progresso mine/total e "Meu R$X de R$Y". Componente próprio porque cada linha busca sua própria fatura
// (um hook por conta — não dá pra chamar useInvoice em loop dentro da page).
export function CardInvoiceRow({ account }: { account: Account }) {
  const invoice = useInvoice(account.id)

  if (!invoice.data) return null
  const { mineCents, totalCents } = invoice.data
  const percent = totalCents > 0 ? Math.min((mineCents / totalCents) * 100, 100) : 0

  return (
    <Link href="/transactions" className="block border-b border-surface py-3.5 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-tint text-xs font-bold text-primary-ink">
            {account.name.charAt(0).toUpperCase()}
          </span>
          <span className="font-semibold text-ink">{account.name}</span>
        </div>
        {account.dueDay && (
          <span className="rounded-pill bg-surface px-2.5 py-1 text-xs text-text">vence dia {account.dueDay}</span>
        )}
      </div>
      <div className="mt-2.5 h-2 overflow-hidden rounded-pill bg-surface">
        <div className="h-full rounded-pill bg-primary" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-sm">
        <span className="font-semibold text-ink">
          Meu <MoneyText cents={mineCents} />
        </span>
        <span className="text-muted">
          de <MoneyText cents={totalCents} />
        </span>
      </div>
    </Link>
  )
}
