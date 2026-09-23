'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { AccountType, CreateAccountInput } from '@gastos/shared'
import { useAccounts } from '@/hooks/queries/use-accounts'
import { useArchiveAccount } from '@/hooks/queries/use-archive-account'
import { useConnectBank } from '@/hooks/queries/use-connect-bank'
import { useCreateAccount } from '@/hooks/queries/use-create-account'
import { useUpdateAccount } from '@/hooks/queries/use-update-account'
import { ApiClientError } from '@/lib/api-client'

// Hook de página: só orquestração (04-padroes-codigo). Campos de cartão (fechamento, vencimento, limite)
// ficam pra uma próxima etapa — aqui só nome e tipo, o mínimo pra existir a conta.
export function useAccountsPage() {
  const router = useRouter()
  const accounts = useAccounts()
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()
  const archiveAccount = useArchiveAccount()
  const connectBank = useConnectBank()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [ruleError, setRuleError] = useState<string | null>(null)
  const [connectError, setConnectError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<CreateAccountInput>({ defaultValues: { name: '', type: 'CREDIT_CARD', source: 'MANUAL' } })

  // "Cancelar" não trava enquanto a request está no ar (rede lenta é comum, mobile-first) — esse número
  // marca qual envio ainda importa. Cancelar incrementa; se a resposta (sucesso ou erro) chegar depois de
  // outro cancelamento/reabertura, ela é descartada em vez de reaparecer como erro fora de contexto.
  const submissionRef = useRef(0)

  const onSubmit = handleSubmit(async (values) => {
    const submission = ++submissionRef.current
    setRuleError(null)
    try {
      await createAccount.mutateAsync(values)
      if (submission !== submissionRef.current) return
      reset()
      setIsFormOpen(false)
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error
      if (submission !== submissionRef.current) return

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

  // Conectar outro banco (InfinitePay, um segundo cartão...) — antes só existia na Home, e só enquanto
  // não houvesse nenhum cartão ainda (ConnectBankCard some depois do primeiro). "Meu Pluggy" aceita várias
  // conexões, então a tela de contas precisa oferecer isso sempre, não só na primeira vez.
  const onConnectBank = async () => {
    setConnectError(null)
    try {
      const { id, authorizeUrl } = await connectBank.mutateAsync()
      window.open(authorizeUrl, '_blank', 'noopener')
      router.push(`/connect-bank/${id}`)
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error
      setConnectError(error.error.message)
    }
  }

  return {
    accounts: accounts.data ?? [],
    isLoadingAccounts: accounts.isPending,
    isFormOpen,
    openForm: () => setIsFormOpen(true),
    closeForm: () => {
      submissionRef.current++
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
    // Fase 4: marca/desmarca qual conta CHECKING alimenta "renda de benefícios" (/settings/income).
    toggleBenefitAccount: (id: string, isBenefitAccount: boolean) =>
      updateAccount.mutate({ id, input: { isBenefitAccount } }),
    isTogglingBenefitAccount: updateAccount.isPending,
    togglingBenefitAccountId: updateAccount.variables?.id ?? null,
    onConnectBank: () => void onConnectBank(),
    isConnectingBank: connectBank.isPending,
    connectError,
    archive: (id: string) => archiveAccount.mutate(id),
    isArchiving: archiveAccount.isPending,
    archivingId: archiveAccount.variables ?? null,
  }
}
