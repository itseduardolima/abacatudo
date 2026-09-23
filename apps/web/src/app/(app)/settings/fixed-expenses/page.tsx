'use client'

import { Repeat, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { BackIcon, IconButton } from '@/components/ui/IconButton'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { Input } from '@/components/ui/Input'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { MoneyText } from '@/components/finance/MoneyText'
import { useFixedExpensesPage } from './use-fixed-expenses-page'

export default function FixedExpensesPage() {
  const {
    fixedExpenses,
    isLoading,
    isFormOpen,
    openForm,
    closeForm,
    register,
    errors,
    onSubmit,
    isSubmitting,
    ruleError,
    archive,
    archivingId,
  } = useFixedExpensesPage()

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col gap-6 px-4 pb-28 pt-8 md:pb-10">
      <div className="flex items-center gap-3">
        <IconButton href="/">
          <BackIcon />
        </IconButton>
        <div>
          <h1 className="display-number text-[2rem] text-ink">Gastos fixos</h1>
          <p className="text-sm text-muted">Aluguel, internet... contam todo mês até você remover.</p>
        </div>
      </div>

      {isLoading && <p className="text-text">Carregando…</p>}

      {!isLoading && fixedExpenses.length === 0 && !isFormOpen && <p className="text-text">Nenhum gasto fixo ainda.</p>}

      {fixedExpenses.length > 0 && (
        <ul className="flex flex-col">
          {fixedExpenses.map((expense) => (
            <li key={expense.id} className="flex items-center gap-3 border-b border-surface py-3 last:border-b-0">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface text-ink">
                <Repeat size={18} strokeWidth={1.8} />
              </span>
              <p className="flex-1 font-semibold text-ink">{expense.name}</p>
              <MoneyText cents={expense.amountCents} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-[34px] !px-0"
                state={archivingId === expense.id ? 'loading' : 'idle'}
                onClick={() => archive(expense.id)}
                aria-label={`Remover ${expense.name}`}
              >
                <X size={18} strokeWidth={1.8} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {!isFormOpen && (
        <Button variant="outline" onClick={openForm}>
          Novo gasto fixo
        </Button>
      )}

      {isFormOpen && (
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          {ruleError && <InlineAlert>{ruleError}</InlineAlert>}
          <Input label="Nome" placeholder="Aluguel" error={errors.name?.message} {...register('name')} />
          <MoneyInput label="Valor mensal" error={errors.amount?.message} {...register('amount')} />
          <div className="mt-2 flex gap-3">
            <Button type="submit" state={isSubmitting ? 'loading' : 'idle'}>
              Salvar
            </Button>
            <Button type="button" variant="link" onClick={closeForm}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </main>
  )
}
