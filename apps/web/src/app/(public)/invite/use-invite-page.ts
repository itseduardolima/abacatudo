'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAcceptInvite } from '@/hooks/queries/use-accept-invite'
import { useInviteInfo } from '@/hooks/queries/use-invite-info'
import { ApiClientError } from '@/lib/api-client'

interface FormValues {
  name: string
  email: string
  password: string
}

export function useInvitePage() {
  const router = useRouter()
  const token = useSearchParams().get('token') ?? ''
  const info = useInviteInfo(token)
  const acceptInvite = useAcceptInvite()
  const [done, setDone] = useState(false)
  const [ruleError, setRuleError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { name: '', email: '', password: '' } })

  const onSubmit = handleSubmit(async (values) => {
    setRuleError(null)
    try {
      await acceptInvite.mutateAsync({ token, ...values })
      setDone(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error
      const fieldErrors = error.error.details?.fieldErrors as Record<string, string[] | undefined> | undefined
      if (fieldErrors?.name?.[0]) setError('name', { message: fieldErrors.name[0] })
      else if (fieldErrors?.email?.[0]) setError('email', { message: fieldErrors.email[0] })
      else if (fieldErrors?.password?.[0]) setError('password', { message: fieldErrors.password[0] })
      else setRuleError(error.error.message)
    }
  })

  return {
    isLoading: token.length > 0 && info.isPending,
    linkError: token.length === 0 || info.isError,
    register,
    errors,
    onSubmit,
    isPending: acceptInvite.isPending,
    ruleError,
    done,
  }
}
