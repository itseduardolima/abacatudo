'use client'

import { useEffect, useRef, useState } from 'react'
import { useAccounts } from '@/hooks/queries/use-accounts'
import { useCategories } from '@/hooks/queries/use-categories'
import { useInvoice } from '@/hooks/queries/use-invoice'
import { usePeople } from '@/hooks/queries/use-people'
import { useTransactions } from '@/hooks/queries/use-transactions'
import { useUpdateTransactionCategory } from '@/hooks/queries/use-update-transaction-category'
import { useUpdateTransactionPerson } from '@/hooks/queries/use-update-transaction-person'
import { ApiClientError } from '@/lib/api-client'
import { dayGroupLabel } from '@/lib/utils/format-day-group'

export type Segment = 'all' | 'mine' | 'notMine'

// Hook de página: só orquestração (04-padroes-codigo). Fatura é por cartão (protótipo 08-fatura) — a
// API de transações não filtra por conta, então o filtro por `accountId` é feito aqui; a de convite
// (GET /invoice) já é por conta. categoryId/personId da transação viram nome/pessoa aqui — a API não
// embute a relação.
export function useTransactionsPage() {
  const accounts = useAccounts()
  const categories = useCategories()
  const people = usePeople()
  const transactions = useTransactions()
  const updateCategory = useUpdateTransactionCategory()
  const updatePerson = useUpdateTransactionPerson()

  const cardAccounts = (accounts.data ?? []).filter((a) => a.type === 'CREDIT_CARD' && !a.archivedAt)
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(undefined)
  useEffect(() => {
    if (!selectedAccountId && cardAccounts[0]) setSelectedAccountId(cardAccounts[0].id)
  }, [cardAccounts, selectedAccountId])

  const invoice = useInvoice(selectedAccountId)
  const [segment, setSegment] = useState<Segment>('all')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [alwaysForMerchant, setAlwaysForMerchant] = useState(false)
  const [ruleError, setRuleError] = useState<string | null>(null)
  const submissionRef = useRef(0)

  const categoryNameById = new Map((categories.data ?? []).map((category) => [category.id, category.name]))
  const selfPersonId = (people.data ?? []).find((person) => person.isSelf)?.id
  const othersOrder = (people.data ?? []).filter((person) => !person.isSelf).map((person) => person.id)

  const cardTransactions = (transactions.data ?? []).filter((tx) => tx.accountId === selectedAccountId)
  const filtered = cardTransactions.filter((tx) => {
    if (segment === 'all') return true
    const isMine = tx.personId === selfPersonId || tx.personId === null
    return segment === 'mine' ? isMine : !isMine
  })

  const rows = filtered
    .map((tx) => {
      const person = (people.data ?? []).find((p) => p.id === tx.personId)
      return {
        ...tx,
        categoryName: tx.categoryId ? (categoryNameById.get(tx.categoryId) ?? null) : null,
        personName: person?.name ?? null,
        personIsSelf: person?.isSelf ?? false,
        personOthersIndex: person ? othersOrder.indexOf(person.id) : -1,
        dayLabel: dayGroupLabel(tx.occurredAt),
      }
    })
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))

  const groups: { label: string; items: typeof rows }[] = []
  for (const row of rows) {
    const last = groups[groups.length - 1]
    if (last && last.label === row.dayLabel) last.items.push(row)
    else groups.push({ label: row.dayLabel, items: [row] })
  }

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
    isLoading: accounts.isPending || categories.isPending || people.isPending || transactions.isPending,
    cardAccounts,
    selectedAccountId,
    setSelectedAccountId,
    invoice: invoice.data,
    segment,
    setSegment,
    groups,
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
