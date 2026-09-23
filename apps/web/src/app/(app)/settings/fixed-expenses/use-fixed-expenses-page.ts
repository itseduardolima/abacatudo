'use client'

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useArchiveFixedExpense } from '@/hooks/queries/use-archive-fixed-expense'
import { useCreateFixedExpense } from '@/hooks/queries/use-create-fixed-expense'
import { useFixedExpenses } from '@/hooks/queries/use-fixed-expenses'
import { ApiClientError } from '@/lib/api-client'
import { parseMoneyInput } from '@/lib/utils/format-money'

interface FormValues {
  name: string
  amount: string
}

// Hook de página: só orquestração (04-padroes-codigo). `amount` é o texto digitado ("120,00"); vira
// `amountCents` só na hora de mandar pra API (parseMoneyInput) — nunca validado no cliente, só convertido.
export function useFixedExpensesPage() {
  const fixedExpenses = useFixedExpenses()
  const createFixedExpense = useCreateFixedExpense()
  const archiveFixedExpense = useArchiveFixedExpense()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [ruleError, setRuleError] = useState<string | null>(null)
  const submissionRef = useRef(0)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { name: '', amount: '' } })

  const onSubmit = handleSubmit(async (values) => {
    const submission = ++submissionRef.current
    setRuleError(null)
    const amountCents = parseMoneyInput(values.amount)
    if (Number.isNaN(amountCents)) {
      setError('amount', { message: 'Informe um valor válido.' })
      return
    }

    try {
      await createFixedExpense.mutateAsync({ name: values.name, amountCents })
      if (submission !== submissionRef.current) return
      reset()
      setIsFormOpen(false)
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error
      if (submission !== submissionRef.current) return

      const fieldErrors = error.error.details?.fieldErrors as Record<string, string[] | undefined> | undefined
      if (fieldErrors?.name?.[0]) setError('name', { message: fieldErrors.name[0] })
      else if (fieldErrors?.amountCents?.[0]) setError('amount', { message: fieldErrors.amountCents[0] })
      else setRuleError(error.error.message)
    }
  })

  return {
    fixedExpenses: fixedExpenses.data ?? [],
    isLoading: fixedExpenses.isPending,
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
    onSubmit,
    isSubmitting: createFixedExpense.isPending,
    ruleError,
    archive: (id: string) => archiveFixedExpense.mutate(id),
    archivingId: archiveFixedExpense.isPending ? archiveFixedExpense.variables : undefined,
  }
}
