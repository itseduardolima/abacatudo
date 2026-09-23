'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { MoneyText } from '@/components/finance/MoneyText'
import { formatShortDate } from '@/lib/utils/format-date'
import { useTransactionsPage } from './use-transactions-page'

export default function TransactionsPage() {
  const {
    transactions,
    isLoading,
    categories,
    people,
    editingId,
    openEdit,
    closeEdit,
    alwaysForMerchant,
    setAlwaysForMerchant,
    selectCategory,
    selectPerson,
    isSaving,
    ruleError,
  } = useTransactionsPage()

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
            <li key={tx.id} className="rounded-card border border-border">
              <button
                type="button"
                onClick={() => (editingId === tx.id ? closeEdit() : openEdit(tx.id))}
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{tx.merchant ?? tx.description}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    <span>{formatShortDate(tx.occurredAt)}</span>
                    <Badge>{tx.categoryName ?? 'Sem categoria'}</Badge>
                    {tx.personName && <Badge>{tx.personName}</Badge>}
                  </div>
                </div>
                <MoneyText cents={tx.kind === 'REFUND' ? -tx.amountCents : tx.amountCents} />
              </button>

              {editingId === tx.id && (
                <div className="flex flex-col gap-4 border-t border-border p-4">
                  {ruleError && <InlineAlert>{ruleError}</InlineAlert>}

                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-text">Categoria</span>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((category) => (
                        <Button
                          key={category.id}
                          size="sm"
                          variant={tx.categoryId === category.id ? 'primary' : 'outline'}
                          state={isSaving ? 'loading' : 'idle'}
                          onClick={() => void selectCategory(tx.id, category.id)}
                        >
                          {category.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-text">Pessoa</span>
                    <div className="flex flex-wrap gap-2">
                      {people.map((person) => (
                        <Button
                          key={person.id}
                          size="sm"
                          variant={tx.personId === person.id ? 'primary' : 'outline'}
                          state={isSaving ? 'loading' : 'idle'}
                          onClick={() => void selectPerson(tx.id, person.id)}
                        >
                          {person.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {tx.merchant && (
                    <label className="flex items-center gap-2 text-sm text-text">
                      <input
                        type="checkbox"
                        checked={alwaysForMerchant}
                        onChange={(event) => setAlwaysForMerchant(event.target.checked)}
                      />
                      Sempre que for &quot;{tx.merchant}&quot;
                    </label>
                  )}

                  <Button variant="link" onClick={closeEdit}>
                    Cancelar
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
