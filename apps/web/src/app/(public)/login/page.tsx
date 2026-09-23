'use client'

import { Button } from '@/components/ui/Button'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'
import { useLoginPage } from './use-login-page'

export default function LoginPage() {
  const { register, errors, onSubmit, isPending, ruleError } = useLoginPage()

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col justify-center px-4 py-8">
      <Logo height={48} />
      <h1 className="display-number mt-10 text-[2.5rem] text-ink">Entrar</h1>
      <p className="mt-2 text-text">Acesse sua conta AbacaTudo.</p>

      <form className="mt-8 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        {ruleError && <InlineAlert>{ruleError}</InlineAlert>}
        <Input label="E-mail" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Input
          label="Senha"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" state={isPending ? 'loading' : 'idle'} className="mt-2">
          Entrar
        </Button>
      </form>
    </main>
  )
}
