'use client'

import type { AccountType } from '@gastos/shared'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { BackIcon, IconButton } from '@/components/ui/IconButton'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { Input } from '@/components/ui/Input'
import { formatAccountType } from '@/lib/utils/format-account-type'
import { formatMoney } from '@/lib/utils/format-money'
import { useAccountsPage } from './use-accounts-page'

const TYPE_OPTIONS: AccountType[] = ['CREDIT_CARD', 'CHECKING', 'CASH']

// Ícone de carteira (Fase 4) — deliberadamente diferente de estrela/coração (favorito): "conta de
// benefício" não é uma preferência, é qual conta alimenta a renda de benefícios em /settings/income.
function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 8V6.5A1.5 1.5 0 0 1 5.5 5h11A2.5 2.5 0 0 1 19 7.5V8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="8" width="18" height="11" rx="2.5" />
      <circle cx="16" cy="13.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

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
    toggleBenefitAccount,
    isTogglingBenefitAccount,
    togglingBenefitAccountId,
    onConnectBank,
    isConnectingBank,
    connectError,
    archive,
    isArchiving,
    archivingId,
  } = useAccountsPage()

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col gap-6 px-4 pb-28 md:pb-10 pt-8">
      <div className="flex items-center gap-3">
        <IconButton href="/">
          <BackIcon />
        </IconButton>
        <h1 className="display-number text-[2rem] text-ink">Contas</h1>
      </div>

      {connectError && <InlineAlert>{connectError}</InlineAlert>}

      {isLoadingAccounts && <p className="text-text">Carregando…</p>}

      {!isLoadingAccounts && accounts.length === 0 && !isFormOpen && (
        <p className="text-text">Nenhuma conta ainda. Conecte um banco ou crie a primeira abaixo.</p>
      )}

      {accounts.length > 0 && (
        <ul className="flex flex-col gap-3">
          {accounts.map((account) => (
            <li key={account.id} className="flex flex-col gap-3 rounded-card border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 flex-1 truncate font-medium text-ink" title={account.name}>
                  {account.name}
                </span>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <Badge>{formatAccountType(account.type)}</Badge>
                  {account.type === 'CHECKING' && (
                    <Button
                      type="button"
                      size="sm"
                      variant={account.isBenefitAccount ? 'primary' : 'outline'}
                      className="w-[34px] !px-0"
                      state={isTogglingBenefitAccount && togglingBenefitAccountId === account.id ? 'loading' : 'idle'}
                      onClick={() => toggleBenefitAccount(account.id, !account.isBenefitAccount)}
                      aria-label={
                        account.isBenefitAccount
                          ? 'Desmarcar como conta de benefício'
                          : 'Marcar como conta de benefício'
                      }
                      title={account.isBenefitAccount ? 'Conta de benefício' : 'Marcar como conta de benefício'}
                    >
                      <WalletIcon />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted">
                  {account.isBenefitAccount && account.balanceCents != null
                    ? `Alimenta a renda de benefícios: ${formatMoney(account.balanceCents)}`
                    : null}
                </p>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  state={isArchiving && archivingId === account.id ? 'loading' : 'idle'}
                  onClick={() => archive(account.id)}
                >
                  Remover
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3">
        <Button variant="outline" state={isConnectingBank ? 'loading' : 'idle'} onClick={onConnectBank}>
          Conectar banco
        </Button>

        {!isFormOpen && (
          <Button variant="outline" onClick={openForm}>
            Nova conta
          </Button>
        )}
      </div>

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
