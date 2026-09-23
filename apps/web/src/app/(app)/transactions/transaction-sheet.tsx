'use client'

import type { Category, Person, TransactionKind } from '@gastos/shared'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { MoneyText } from '@/components/finance/MoneyText'
import { formatDateTimeLong } from '@/lib/utils/format-date'
import { formatMoney } from '@/lib/utils/format-money'
import { personAvatarClass, personInitial } from '@/lib/utils/person-avatar'
import type { SheetView } from './use-transactions-page'

export interface SheetTransaction {
  id: string
  kind: TransactionKind
  amountCents: number
  occurredAt: string
  description: string
  merchant: string | null
  categoryId: string | null
  personId: string | null
  cardLast4: string | null
  installmentNumber: number | null
  installmentTotal: number | null
  categoryName: string | null
  personName: string | null
  personIsSelf: boolean
  personOthersIndex: number
}

interface TransactionSheetProps {
  tx: SheetTransaction
  accountName: string
  view: SheetView
  setView: (view: SheetView) => void
  categories: Category[]
  people: Person[]
  isSaving: boolean
  ruleError: string | null
  alwaysForMerchant: boolean
  setAlwaysForMerchant: (value: boolean) => void
  selectCategory: (transactionId: string, categoryId: string) => void
  selectPerson: (transactionId: string, personId: string) => void
  onClose: () => void
}

// Mesmo padrão de bottom sheet do protótipo (12-detalhe: véu escuro + folha com puxador) — trocado pelo
// acordeão inline que existia antes (a pedido do usuário: "tem que aparecer uma tela igual a do
// protótipo"). `view` alterna entre o detalhe e os dois seletores (10-classificar-escolha), sempre dentro
// da mesma folha — escolher não fecha, volta pro detalhe (protótipo faz o mesmo).
export function TransactionSheet({
  tx,
  accountName,
  view,
  setView,
  categories,
  people,
  isSaving,
  ruleError,
  alwaysForMerchant,
  setAlwaysForMerchant,
  selectCategory,
  selectPerson,
  onClose,
}: TransactionSheetProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const remainingInstallments =
    tx.installmentNumber != null && tx.installmentTotal != null ? tx.installmentTotal - tx.installmentNumber : 0

  return (
    <div className="fixed inset-0 z-40">
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-scrim" />
      <div
        className="absolute inset-x-2 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-card-lg bg-canvas px-4 pt-2.5 shadow-xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
      >
        <div className="mx-auto mb-3.5 h-1 w-10 rounded-pill bg-border" />

        {view === 'detail' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xl font-bold text-ink">{tx.merchant ?? tx.description}</p>
                {tx.merchant && <p className="mt-0.5 truncate text-xs text-muted">{tx.description}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface text-ink"
              >
                <X size={18} strokeWidth={1.8} />
              </button>
            </div>

            <p
              className={`display-number text-[2.75rem] ${tx.kind === 'CARD_PAYMENT' ? 'text-primary-ink' : 'text-ink'}`}
            >
              <MoneyText
                cents={tx.kind === 'CARD_PAYMENT' || tx.kind === 'REFUND' ? -tx.amountCents : tx.amountCents}
                className={tx.kind === 'CARD_PAYMENT' ? '!text-primary-ink' : undefined}
              />
            </p>

            <div>
              <div className="flex items-center justify-between border-b border-surface py-3 text-sm">
                <span className="text-muted">Data</span>
                <span className="font-medium text-ink">{formatDateTimeLong(tx.occurredAt)}</span>
              </div>
              <div
                className={`flex items-center justify-between py-3 text-sm ${
                  tx.kind === 'CARD_PAYMENT' && !tx.installmentTotal ? '' : 'border-b border-surface'
                }`}
              >
                <span className="text-muted">Cartão</span>
                <span className="font-medium text-ink">
                  {accountName}
                  {tx.cardLast4 ? ` final ${tx.cardLast4}` : ''}
                </span>
              </div>
              {tx.installmentTotal && (
                <div className="flex items-center justify-between border-b border-surface py-3 text-sm">
                  <span className="text-muted">Parcela</span>
                  <span className="font-medium text-ink">
                    {tx.installmentNumber} de {tx.installmentTotal}
                  </span>
                </div>
              )}
              {/* Pagamento de fatura nunca é gasto (03-regras-negocio § Movimentações) — atribuir categoria
              ou "quem gastou" a essa linha não faz sentido, então nem oferece. */}
              {tx.kind !== 'CARD_PAYMENT' && (
                <>
                  <button
                    type="button"
                    onClick={() => setView('person')}
                    className="flex w-full items-center justify-between border-b border-surface py-3 text-sm"
                  >
                    <span className="text-muted">Quem gastou</span>
                    {tx.personName ? (
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${personAvatarClass(
                            tx.personIsSelf,
                            tx.personOthersIndex,
                          )}`}
                        >
                          {personInitial(tx.personName)}
                        </span>
                        <span className="font-medium text-ink">{tx.personName}</span>
                      </span>
                    ) : (
                      <span className="font-medium text-muted">Sem dono</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('category')}
                    className="flex w-full items-center justify-between py-3 text-sm"
                  >
                    <span className="text-muted">Categoria</span>
                    <span className="flex items-center gap-1 font-medium text-ink">
                      {tx.categoryName ?? 'Sem categoria'}
                      <ChevronRight size={16} strokeWidth={1.8} className="text-muted" />
                    </span>
                  </button>
                </>
              )}
            </div>

            {remainingInstallments > 0 && (
              <div className="flex items-start gap-2.5 rounded-card bg-tint px-3.5 py-3 text-sm text-primary-ink">
                <span>
                  Restam {remainingInstallments} parcela{remainingInstallments > 1 ? 's' : ''} de{' '}
                  {formatMoney(tx.amountCents)}, {formatMoney(tx.amountCents * remainingInstallments)} nos próximos
                  meses. Elas ficam fora do mês atual.
                </span>
              </div>
            )}

            <Button onClick={onClose}>Concluído</Button>
          </div>
        )}

        {(view === 'category' || view === 'person') && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setView('detail')}
                aria-label="Voltar"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface text-ink"
              >
                <ChevronLeft size={18} strokeWidth={1.8} />
              </button>
              <p className="text-lg font-bold text-ink">{view === 'category' ? 'Categoria' : 'Quem gastou'}</p>
            </div>

            {ruleError && <InlineAlert>{ruleError}</InlineAlert>}

            <div className="flex flex-wrap gap-2">
              {view === 'category'
                ? categories.map((category) => (
                    <Button
                      key={category.id}
                      size="sm"
                      variant={tx.categoryId === category.id ? 'primary' : 'outline'}
                      state={isSaving ? 'loading' : 'idle'}
                      onClick={() => selectCategory(tx.id, category.id)}
                    >
                      {category.name}
                    </Button>
                  ))
                : people.map((person) => (
                    <Button
                      key={person.id}
                      size="sm"
                      variant={tx.personId === person.id ? 'primary' : 'outline'}
                      state={isSaving ? 'loading' : 'idle'}
                      onClick={() => selectPerson(tx.id, person.id)}
                    >
                      {person.name}
                    </Button>
                  ))}
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
          </div>
        )}
      </div>
    </div>
  )
}
