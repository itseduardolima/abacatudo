import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '@/lib/api-client'
import { FIXED_EXPENSES_QUERY_KEY } from './use-fixed-expenses'

export function useSetFixedExpensePaid() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, paid }: { id: string; paid: boolean }) =>
      apiRequest(`/fixed-expenses/${id}/paid`, { method: paid ? 'PUT' : 'DELETE', schema: z.null() }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: FIXED_EXPENSES_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: ['budget-pace'] })
    },
  })
}
