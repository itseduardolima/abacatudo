'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { LoginInput } from '@gastos/shared'
import { useLogin } from '@/hooks/queries/use-login'
import { useMe } from '@/hooks/queries/use-me'
import { ApiClientError } from '@/lib/api-client'

// Hook de página: só orquestração (04-padroes-codigo § Separação de lógica e UI). Sem resolver do RHF —
// validação é sempre da API; o form só junta os campos e mapeia o erro que voltar.
export function useLoginPage() {
  const router = useRouter()
  const login = useLogin()
  const me = useMe()
  const [ruleError, setRuleError] = useState<string | null>(null)

  // Já autenticado (sessão válida de verdade, não só cookie presente — o middleware não decide isso, ver
  // seu comentário) e caiu no /login mesmo assim: manda pra home em vez de mostrar o formulário à toa.
  useEffect(() => {
    if (me.data) router.replace('/')
  }, [me.data, router])
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<LoginInput>({ defaultValues: { email: '', password: '' } })

  const onSubmit = handleSubmit(async (values) => {
    setRuleError(null)
    try {
      await login.mutateAsync(values)
      router.push('/')
      router.refresh()
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error

      const fieldErrors = error.error.details?.fieldErrors as Record<string, string[] | undefined> | undefined
      const firstField = fieldErrors ? (Object.keys(fieldErrors)[0] as keyof LoginInput | undefined) : undefined
      if (firstField) {
        for (const [field, messages] of Object.entries(fieldErrors ?? {})) {
          if (messages?.[0]) setError(field as keyof LoginInput, { message: messages[0] })
        }
        setFocus(firstField)
      } else {
        // Erro de regra (credenciais inválidas, muitas tentativas...) — não é de um campo específico.
        setRuleError(error.error.message)
      }
    }
  })

  return { register, errors, onSubmit, isPending: login.isPending, ruleError }
}
