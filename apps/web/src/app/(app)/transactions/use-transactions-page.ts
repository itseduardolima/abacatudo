'use client'

import { useRef, useState } from 'react'
import { useCategories } from '@/hooks/queries/use-categories'
import { usePeople } from '@/hooks/queries/use-people'
import { useTransactions } from '@/hooks/queries/use-transactions'
import { useUpdateTransactionCategory } from '@/hooks/queries/use-update-transaction-category'
import { useUpdateTransactionPerson } from '@/hooks/queries/use-update-transaction-person'
import { ApiClientError } from '@/lib/api-client'

// Hook de página: só orquestração (04-padroes-codigo). categoryId/personId da transação viram nome aqui —
// a API não embute a relação, e resolver isso é view, não cálculo de dinheiro.
//
// Corrigir categoria/pessoa: um painel só serve pra transação clicada por vez (mesmo padrão de
// use-categories-page.ts), com a mesma submissão numerada contra a corrida do cancelar.
export function useTransactionsPage() {
  const transactions = useTransactions()
  const categories = useCategories()
  const people = usePeople()
  const updateCategory = useUpdateTransactionCategory()
  const updatePerson = useUpdateTransactionPerson()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [alwaysForMerchant, setAlwaysForMerchant] = useState(false)
  const [ruleError, setRuleError] = useState<string | null>(null)
  const submissionRef = useRef(0)

  const categoryNameById = new Map((categories.data ?? []).map((category) => [category.id, category.name]))
  const personNameById = new Map((people.data ?? []).map((person) => [person.id, person.name]))

  const rows = (transactions.data ?? []).map((transaction) => ({
    ...transaction,
    categoryName: transaction.categoryId ? (categoryNameById.get(transaction.categoryId) ?? null) : null,
    personName: transaction.personId ? (personNameById.get(transaction.personId) ?? null) : null,
  }))

  const openEdit = (id: string) => {
    submissionRef.current++
    setEditingId(id)
    setAlwaysForMerchant(false)
    setRuleError(null)
  }

  const closeEdit = () => {
    submissionRef.current++
    setEditingId(null)
    setAlwaysForMerchant(false)
    setRuleError(null)
  }

  const runUpdate = async (mutate: () => Promise<unknown>) => {
    const submission = ++submissionRef.current
    setRuleError(null)
    try {
      await mutate()
      if (submission !== submissionRef.current) return
      setEditingId(null)
      setAlwaysForMerchant(false)
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error
      if (submission !== submissionRef.current) return
      setRuleError(error.error.message)
    }
  }

  const selectCategory = (transactionId: string, categoryId: string) =>
    runUpdate(() => updateCategory.mutateAsync({ id: transactionId, input: { categoryId, alwaysForMerchant } }))

  const selectPerson = (transactionId: string, personId: string) =>
    runUpdate(() =>
      updatePerson.mutateAsync({ id: transactionId, input: { personId, alwaysForMerchant, alwaysForCard: false } }),
    )

  return {
    transactions: rows,
    isLoading: transactions.isPending || categories.isPending || people.isPending,
    categories: categories.data ?? [],
    people: people.data ?? [],
    editingId,
    openEdit,
    closeEdit,
    alwaysForMerchant,
    setAlwaysForMerchant,
    selectCategory,
    selectPerson,
    isSaving: updateCategory.isPending || updatePerson.isPending,
    ruleError,
  }
}
