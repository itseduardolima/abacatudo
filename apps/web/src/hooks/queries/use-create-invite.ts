import { useMutation } from '@tanstack/react-query'
import { inviteCreatedSchema } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'

export function useCreateInvite() {
  return useMutation({
    mutationFn: () => apiRequest('/auth/invites', { method: 'POST', schema: inviteCreatedSchema }),
  })
}
