import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '@/lib/api-client'
import { CATEGORIES_QUERY_KEY } from './use-categories'

export function useArchiveCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    // 204 sem corpo: api-client normaliza pra `null`.
    mutationFn: (id: string) => apiRequest(`/categories/${id}/archive`, { method: 'PATCH', schema: z.null() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY }),
  })
}
