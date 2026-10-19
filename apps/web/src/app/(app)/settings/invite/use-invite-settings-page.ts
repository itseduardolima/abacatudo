'use client'

import { useState } from 'react'
import { useCreateInvite } from '@/hooks/queries/use-create-invite'
import { useMe } from '@/hooks/queries/use-me'
import { ApiClientError } from '@/lib/api-client'

export function useInviteSettingsPage() {
  const me = useMe()
  const createInvite = useCreateInvite()
  const [ruleError, setRuleError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const onCreate = async () => {
    setRuleError(null)
    setCopied(false)
    try {
      await createInvite.mutateAsync()
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error
      setRuleError(error.error.message)
    }
  }

  const onCopy = async () => {
    if (!createInvite.data) return
    await navigator.clipboard.writeText(createInvite.data.link)
    setCopied(true)
  }

  return {
    isLoading: me.isPending,
    isAdmin: me.data?.role === 'ADMIN',
    invite: createInvite.data,
    isCreating: createInvite.isPending,
    ruleError,
    copied,
    onCreate,
    onCopy,
  }
}
