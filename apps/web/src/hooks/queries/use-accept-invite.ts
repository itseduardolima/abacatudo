import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import type { AcceptInviteInput } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'

export function useAcceptInvite() {
  return useMutation({
    mutationFn: (input: AcceptInviteInput) =>
      apiRequest('/auth/invites/accept', { method: 'POST', body: input, schema: z.null() }),
  })
}
