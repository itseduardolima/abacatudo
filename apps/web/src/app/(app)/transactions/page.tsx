'use client'

import type { Segment } from './use-transactions-page'
import { TransactionSheet } from './transaction-sheet'
import { Button } from '@/components/ui/Button'
import { BackIcon, IconButton } from '@/components/ui/IconButton'
import { BankAvatar } from '@/components/finance/BankAvatar'
import { MoneyText } from '@/components/finance/MoneyText'
import { formatAccountType } from '@/lib/utils/format-account-type'
import { currentMonthKey, formatMonthName } from '@/lib/utils/format-month'
import { personAvatarClass, personInitial } from '@/lib/utils/person-avatar'
import { useTransactionsPage } from './use-transactions-page'

const SEGMENTS: { value: Segment; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'mine', label: 'Meu' },
  { value: 'notMine', label: 'Não é meu' },
]

// Layout segue o protótipo (08-fatura): card escuro com o número grande, barra de progresso e a
// quebra "Fatura do banco / − Não é meu / = Meu". Sem a terceira faixa "A classificar" do protótipo nem
// o chip "Sem dono" como estado pendente — decisão já tomada (TODO.md "Toda transação nasce Meu"): não
// existe fila de classificação, só Meu e Não é meu (Fatura = Meu + Não é meu).
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
    editingTx,
    sheetView,
    setSheetView,
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
        {selectedAccount ? (
          <>
            <BankAvatar
              bankLogo={selectedAccount.bankLogo}
              fallbackInitial={selectedAccount.name.charAt(0).toUpperCase()}
              size={40}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xl font-bold text-ink">{selectedAccount.name}</p>
              <p className="text-sm text-muted">{formatAccountType(selectedAccount.type)}</p>
            </div>
          </>
        ) : (
          <h1 className="display-number text-[2rem] text-ink">Fatura</h1>
        )}
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
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-pill bg-tint px-3 py-1 text-xs font-medium text-primary-ink">
              Fatura aberta de {formatMonthName(currentMonthKey())}
            </span>
            {(selectedAccount.closingDay || selectedAccount.dueDay) && (
              <span className="text-xs text-muted">
                {selectedAccount.closingDay && `Fecha dia ${selectedAccount.closingDay}`}
                {selectedAccount.closingDay && selectedAccount.dueDay && ', '}
                {selectedAccount.dueDay && `vence dia ${selectedAccount.dueDay}`}
              </span>
            )}
          </div>

          <div className="rounded-card-lg bg-inverse px-5 py-6 text-on-inverse">
            <p className="text-xs text-on-inverse-muted">Meu nesta fatura</p>
            <p className="display-number mt-2.5 text-[3.25rem] text-on-inverse-accent">
              <MoneyText cents={invoice.mineCents} className="!text-on-inverse-accent" />
            </p>
            <div className="mt-5 h-3.5 overflow-hidden rounded-pill bg-on-inverse-hairline">
              <div
                className="h-full rounded-pill bg-on-inverse-accent"
                style={{ width: `${invoice.totalCents > 0 ? (invoice.mineCents / invoice.totalCents) * 100 : 0}%` }}
              />
            </div>
            <div className="mt-4 overflow-hidden rounded-card bg-canvas text-text">
              <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span>Fatura do banco</span>
                <MoneyText cents={invoice.totalCents} />
              </div>
              <div className="flex items-center justify-between border-t border-surface px-4 py-2.5 text-sm text-muted">
                <span>− Não é meu</span>
                <MoneyText cents={invoice.notMineCents} />
              </div>
              <div className="flex items-center justify-between bg-tint px-4 py-2.5 text-sm font-bold text-primary-ink">
                <span>= Meu</span>
                <MoneyText cents={invoice.mineCents} />
              </div>
            </div>
          </div>
        </>
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
        <div key={group.label}>
          <p className="pb-0.5 pt-3.5 text-sm font-semibold text-muted">{group.label}</p>
          {group.items.map((tx) => (
            <button
              key={tx.id}
              type="button"
              onClick={() => openEdit(tx.id)}
              className="flex w-full items-center justify-between gap-3 border-b border-surface py-3 text-left last:border-b-0"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{tx.merchant ?? tx.description}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {/* Pagamento de fatura nunca é gasto (03-regras-negocio § Movimentações) — nem categoria,
                  nem "dono" fazem sentido pra essa linha, então nunca mostra "Sem categoria"/"Sem dono". */}
                  {tx.kind === 'CARD_PAYMENT' ? 'Pagamento da fatura' : (tx.categoryName ?? 'Sem categoria')}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                {tx.kind === 'CARD_PAYMENT' ? (
                  <MoneyText cents={-tx.amountCents} className="!text-primary-ink" />
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
      ))}

      {editingId && editingTx && selectedAccount && (
        <TransactionSheet
          tx={editingTx}
          accountName={selectedAccount.name}
          view={sheetView}
          setView={setSheetView}
          categories={categories}
          people={people}
          isSaving={isSaving}
          ruleError={ruleError}
          alwaysForMerchant={alwaysForMerchant}
          setAlwaysForMerchant={setAlwaysForMerchant}
          selectCategory={(id, categoryId) => void selectCategory(id, categoryId)}
          selectPerson={(id, personId) => void selectPerson(id, personId)}
          onClose={closeEdit}
        />
      )}
    </main>
  )
}
