import { useQuery } from '@tanstack/react-query'
import { inviteInfoSchema } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'

export function useInviteInfo(token: string) {
  return useQuery({
    queryKey: ['auth', 'invite', token],
    queryFn: () => apiRequest(`/auth/invites/${encodeURIComponent(token)}`, { schema: inviteInfoSchema }),
    retry: false,
    enabled: token.length > 0,
  })
}
