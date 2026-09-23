'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { AccountType, CreateAccountInput } from '@gastos/shared'
import { useAccounts } from '@/hooks/queries/use-accounts'
import { useCreateAccount } from '@/hooks/queries/use-create-account'
import { ApiClientError } from '@/lib/api-client'

// Hook de página: só orquestração (04-padroes-codigo). Campos de cartão (fechamento, vencimento, limite)
// ficam pra uma próxima etapa — aqui só nome e tipo, o mínimo pra existir a conta.
export function useAccountsPage() {
  const accounts = useAccounts()
  const createAccount = useCreateAccount()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [ruleError, setRuleError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<CreateAccountInput>({ defaultValues: { name: '', type: 'CREDIT_CARD', source: 'MANUAL' } })

  const onSubmit = handleSubmit(async (values) => {
    setRuleError(null)
    try {
      await createAccount.mutateAsync(values)
      reset()
      setIsFormOpen(false)
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error

      const fieldErrors = error.error.details?.fieldErrors as Record<string, string[] | undefined> | undefined
      if (fieldErrors) {
        for (const [field, messages] of Object.entries(fieldErrors)) {
          if (messages?.[0]) setError(field as keyof CreateAccountInput, { message: messages[0] })
        }
      } else {
        setRuleError(error.error.message)
      }
    }
  })

  return {
    accounts: accounts.data ?? [],
    isLoadingAccounts: accounts.isPending,
    isFormOpen,
    openForm: () => setIsFormOpen(true),
    closeForm: () => {
      setIsFormOpen(false)
      reset()
      setRuleError(null)
    },
    register,
    errors,
    type: watch('type'),
    setType: (value: AccountType) => setValue('type', value),
    onSubmit,
    isSubmitting: createAccount.isPending,
    ruleError,
  }
}
