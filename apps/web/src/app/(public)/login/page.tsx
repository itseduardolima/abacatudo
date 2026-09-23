'use client'

import { Button } from '@/components/ui/Button'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'
import { useLoginPage } from './use-login-page'

export default function LoginPage() {
  const { register, errors, onSubmit, isPending, ruleError, showPassword, toggleShowPassword } = useLoginPage()

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col px-4 pb-8 pt-8">
      <Logo height={52} />
      <h1 className="display-number mt-11 text-[3.75rem] text-ink">Da fatura, só o que é seu.</h1>

      <form className="mt-11 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        {ruleError && <InlineAlert>{ruleError}</InlineAlert>}
        <Input label="E-mail" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Input
          label="Senha"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          error={errors.password?.message}
          trailingAction={{
            label: showPassword ? 'Ocultar senha' : 'Mostrar senha',
            icon: <EyeIcon crossed={showPassword} />,
            onClick: toggleShowPassword,
          }}
          {...register('password')}
        />
        <Button type="submit" state={isPending ? 'loading' : 'idle'} className="mt-2 w-full">
          Entrar
        </Button>
      </form>

      <p className="mt-auto pt-10 text-center text-xs text-muted">O acesso é só por convite.</p>
    </main>
  )
}

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
      {crossed && <path d="M4 4 20 20" />}
    </svg>
  )
}
