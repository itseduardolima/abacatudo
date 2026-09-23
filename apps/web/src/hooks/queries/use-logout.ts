import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '@/lib/api-client'

export function useLogout() {
  return useMutation({
    // 204 sem corpo: api-client já normaliza pra `null`.
    mutationFn: () => apiRequest('/auth/logout', { method: 'POST', schema: z.null() }),
  })
}
