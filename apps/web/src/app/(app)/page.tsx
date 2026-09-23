'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { useHomePage } from './use-home-page'

// Início provisório: só prova que a sessão funciona de ponta a ponta. O painel de verdade (mês atual,
// orçamento, ritmo) entra quando a Sprint 5 tiver tela.
export default function HomePage() {
  const { email, isLoadingMe, onLogout, isLoggingOut } = useHomePage()

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col justify-between px-4 py-8">
      <Logo height={48} />
      <section>
        <h1 className="display-number text-[2.5rem] text-ink">{isLoadingMe ? 'Carregando…' : `Olá, ${email}`}</h1>
        <p className="mt-2 text-text">As telas do dia a dia entram sprint a sprint a partir daqui.</p>
        <Link href="/accounts" className="mt-4 inline-block text-text underline underline-offset-4">
          Contas
        </Link>
        <Link href="/settings/people" className="mt-2 block text-text underline underline-offset-4">
          Pessoas
        </Link>
        <Link href="/settings/categories" className="mt-2 block text-text underline underline-offset-4">
          Categorias
        </Link>
      </section>
      <Button variant="outline" state={isLoggingOut ? 'loading' : 'idle'} onClick={() => void onLogout()}>
        Sair
      </Button>
    </main>
  )
}
