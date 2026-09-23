'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useMe } from '@/hooks/queries/use-me'
import { useLogout } from '@/hooks/queries/use-logout'

export function useHomePage() {
  const router = useRouter()
  const me = useMe()
  const logout = useLogout()

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

  return {
    email: me.data?.email,
    isLoadingMe: me.isPending || me.isError,
    onLogout,
    isLoggingOut: logout.isPending,
  }
}
