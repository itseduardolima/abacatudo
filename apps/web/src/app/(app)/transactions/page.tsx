'use client'

import type { Segment } from './use-transactions-page'
import { Button } from '@/components/ui/Button'
import { BackIcon, IconButton } from '@/components/ui/IconButton'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { MoneyText } from '@/components/finance/MoneyText'
import { formatShortDate } from '@/lib/utils/format-date'
import { personAvatarClass, personInitial } from '@/lib/utils/person-avatar'
import { useTransactionsPage } from './use-transactions-page'

const SEGMENTS: { value: Segment; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'mine', label: 'Meu' },
  { value: 'notMine', label: 'Não é meu' },
]

export default function TransactionsPage() {
  const {
    isLoading,
    cardAccounts,
    selectedAccountId,
    setSelectedAccountId,
    invoice,
    segment,
    setSegment,
    groups,
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

  const selectedAccount = cardAccounts.find((account) => account.id === selectedAccountId)

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col gap-4 px-4 pb-28 md:pb-10 pt-8">
      <div className="flex items-center gap-3">
        <IconButton href="/">
          <BackIcon />
        </IconButton>
        <h1 className="display-number text-[2rem] text-ink">Fatura</h1>
      </div>

      {isLoading && <p className="text-text">Carregando…</p>}

      {!isLoading && cardAccounts.length === 0 && (
        <p className="text-text">Nenhum cartão de crédito ainda. Crie um em Contas.</p>
      )}

      {cardAccounts.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {cardAccounts.map((account) => (
            <Button
              key={account.id}
              size="sm"
              variant={selectedAccountId === account.id ? 'primary' : 'outline'}
              onClick={() => setSelectedAccountId(account.id)}
            >
              {account.name}
            </Button>
          ))}
        </div>
      )}

      {selectedAccount && invoice && (
        <div className="rounded-card-lg bg-inverse px-5 py-6 text-on-inverse">
          <p className="text-xs text-on-inverse-muted">Meu nesta fatura — {selectedAccount.name}</p>
          <p className="display-number mt-2 text-[2.5rem] text-on-inverse-accent">
            <MoneyText cents={invoice.mineCents} className="!text-on-inverse-accent" />
          </p>
          <div className="mt-4 h-3.5 overflow-hidden rounded-pill bg-on-inverse-hairline">
            <div
              className="h-full rounded-pill bg-on-inverse-accent"
              style={{ width: `${invoice.totalCents > 0 ? (invoice.mineCents / invoice.totalCents) * 100 : 0}%` }}
            />
          </div>
          <div className="mt-4 flex flex-col gap-2 rounded-card bg-on-inverse-hairline px-4 py-3 text-sm">
            <div className="flex justify-between">
              <span>Fatura do banco</span>
              <MoneyText cents={invoice.totalCents} className="!text-on-inverse" />
            </div>
            <div className="flex justify-between text-on-inverse-muted">
              <span>− Não é meu</span>
              <MoneyText cents={invoice.notMineCents} className="!text-on-inverse" />
            </div>
            <div className="flex justify-between border-t border-on-inverse-hairline pt-2 font-semibold text-on-inverse-accent">
              <span>= Meu</span>
              <MoneyText cents={invoice.mineCents} className="!text-on-inverse-accent" />
            </div>
          </div>
        </div>
      )}

      {selectedAccount && (
        <div className="inline-flex gap-1 self-start rounded-pill bg-surface p-1">
          {SEGMENTS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSegment(option.value)}
              className={`rounded-pill px-4 py-1.5 text-sm font-medium ${
                segment === option.value ? 'bg-primary text-primary-ink' : 'text-text'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {selectedAccount && groups.length === 0 && !isLoading && (
        <p className="text-text">Nenhum lançamento neste mês.</p>
      )}

      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{group.label}</p>
          <ul className="flex flex-col gap-3">
            {group.items.map((tx) => (
              <li key={tx.id} className="rounded-card border border-border">
                <button
                  type="button"
                  onClick={() => (editingId === tx.id ? closeEdit() : openEdit(tx.id))}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{tx.merchant ?? tx.description}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {tx.categoryName ?? 'Sem categoria'} · {formatShortDate(tx.occurredAt)}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <MoneyText cents={tx.kind === 'REFUND' ? -tx.amountCents : tx.amountCents} />
                    {tx.personName ? (
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${personAvatarClass(
                          tx.personIsSelf,
                          tx.personOthersIndex,
                        )}`}
                      >
                        {personInitial(tx.personName)}
                      </span>
                    ) : (
                      <span className="rounded-pill px-2.5 py-1 text-xs text-muted shadow-hair">Sem dono</span>
                    )}
                  </div>
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
        </div>
      ))}
    </main>
  )
}
