'use client'

import { useCategories } from '@/hooks/queries/use-categories'
import { usePeople } from '@/hooks/queries/use-people'
import { useTransactions } from '@/hooks/queries/use-transactions'

// Hook de página: só orquestração (04-padroes-codigo). categoryId/personId da transação viram nome aqui —
// a API não embute a relação, e resolver isso é view, não cálculo de dinheiro.
export function useTransactionsPage() {
  const transactions = useTransactions()
  const categories = useCategories()
  const people = usePeople()

  const categoryNameById = new Map((categories.data ?? []).map((category) => [category.id, category.name]))
  const personNameById = new Map((people.data ?? []).map((person) => [person.id, person.name]))

  const rows = (transactions.data ?? []).map((transaction) => ({
    ...transaction,
    categoryName: transaction.categoryId ? (categoryNameById.get(transaction.categoryId) ?? null) : null,
    personName: transaction.personId ? (personNameById.get(transaction.personId) ?? null) : null,
  }))

  return {
    transactions: rows,
    isLoading: transactions.isPending || categories.isPending || people.isPending,
  }
}
