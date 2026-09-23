'use client'

import Link from 'next/link'
import type { AccountType } from '@gastos/shared'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { Input } from '@/components/ui/Input'
import { formatAccountType } from '@/lib/utils/format-account-type'
import { useAccountsPage } from './use-accounts-page'

const TYPE_OPTIONS: AccountType[] = ['CREDIT_CARD', 'CHECKING', 'CASH']

export default function AccountsPage() {
  const {
    accounts,
    isLoadingAccounts,
    isFormOpen,
    openForm,
    closeForm,
    register,
    errors,
    type,
    setType,
    onSubmit,
    isSubmitting,
    ruleError,
  } = useAccountsPage()

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col gap-6 px-4 py-8">
      <div>
        <Link href="/" className="text-sm text-muted underline underline-offset-4">
          ← Início
        </Link>
        <h1 className="display-number mt-2 text-[2rem] text-ink">Contas</h1>
      </div>

      {isLoadingAccounts && <p className="text-text">Carregando…</p>}

      {!isLoadingAccounts && accounts.length === 0 && !isFormOpen && (
        <p className="text-text">Nenhuma conta ainda. Crie a primeira abaixo.</p>
      )}

      {accounts.length > 0 && (
        <ul className="flex flex-col gap-3">
          {accounts.map((account) => (
            <li key={account.id} className="flex items-center justify-between rounded-card border border-border p-4">
              <span className="font-medium text-ink">{account.name}</span>
              <Badge>{formatAccountType(account.type)}</Badge>
            </li>
          ))}
        </ul>
      )}

      {!isFormOpen && (
        <Button variant="outline" onClick={openForm}>
          Nova conta
        </Button>
      )}

      {isFormOpen && (
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          {ruleError && <InlineAlert>{ruleError}</InlineAlert>}
          <Input label="Nome" placeholder="Nubank, Carteira..." error={errors.name?.message} {...register('name')} />

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Tipo</span>
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((option) => (
                <Button
                  key={option}
                  type="button"
                  size="sm"
                  variant={type === option ? 'primary' : 'outline'}
                  onClick={() => setType(option)}
                >
                  {formatAccountType(option)}
                </Button>
              ))}
            </div>
          </div>

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
