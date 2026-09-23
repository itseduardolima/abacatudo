'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAccounts } from '@/hooks/queries/use-accounts'
import { useBudgetPace } from '@/hooks/queries/use-budget-pace'
import { useLogout } from '@/hooks/queries/use-logout'
import { useMe } from '@/hooks/queries/use-me'

export function useHomePage() {
  const router = useRouter()
  const me = useMe()
  const logout = useLogout()
  const pace = useBudgetPace()
  const accounts = useAccounts()

  // O middleware só olha se o cookie existe, nunca se a sessão ainda é válida — quem confirma de verdade
  // é a API. Cookie velho (revogado, expirado) vira 401 aqui, e manda pro login em vez de mostrar a tela
  // quebrada (visto ao vivo: sem isso, ficava "Olá, undefined").
  useEffect(() => {
    if (me.isError) router.replace('/login')
  }, [me.isError, router])

  const onLogout = async () => {
    await logout.mutateAsync()
    router.push('/login')
    router.refresh()
  }

  const cardAccounts = (accounts.data ?? []).filter((account) => account.type === 'CREDIT_CARD' && !account.archivedAt)

  return {
    email: me.data?.email,
    isLoadingMe: me.isPending || me.isError,
    onLogout,
    isLoggingOut: logout.isPending,
    pace: pace.data,
    isLoadingPace: pace.isPending,
    cardAccounts,
    isLoadingAccounts: accounts.isPending,
  }
}
