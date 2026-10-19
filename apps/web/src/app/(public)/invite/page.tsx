'use client'

import { Suspense } from 'react'
import { Button } from '@/components/ui/Button'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { useInvitePage } from './use-invite-page'

export default function InvitePage() {
  return (
    <Suspense>
      <InviteForm />
    </Suspense>
  )
}

function InviteForm() {
  const { isLoading, linkError, register, errors, onSubmit, isPending, ruleError, done } = useInvitePage()

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col px-4 pb-8 pt-8">
      <Logo height={52} />

      {isLoading && (
        <p className="mt-11 text-center text-text" role="status">
          Conferindo o convite…
        </p>
      )}

      {!isLoading && linkError && (
        <div className="mt-11">
          <InlineAlert>Este convite não é válido ou já expirou. Peça um novo a quem convidou você.</InlineAlert>
        </div>
      )}

      {!isLoading && !linkError && done && (
        <div className="mt-11 rounded-card-lg bg-tint px-5 py-6 text-ink">
          <p className="font-semibold">Conta criada.</p>
          <p className="mt-2 text-sm text-muted">Levando você pro login…</p>
        </div>
      )}

      {!isLoading && !linkError && !done && (
        <>
          <h1 className="display-number mt-11 text-[2.5rem] text-ink">Criar sua conta</h1>
          <p className="mt-2 text-text">Você foi convidado para o AbacaTudo.</p>
          <form className="mt-8 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
            {ruleError && <InlineAlert>{ruleError}</InlineAlert>}
            <Input label="Nome" autoComplete="name" error={errors.name?.message} {...register('name')} />
            <Input
              label="E-mail"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <PasswordInput
              label="Senha"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" state={isPending ? 'loading' : 'idle'} className="mt-2 w-full">
              Criar conta
            </Button>
          </form>
        </>
      )}
    </main>
  )
}
