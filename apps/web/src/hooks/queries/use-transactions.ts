import { useQuery } from '@tanstack/react-query'
import { transactionSchema } from '@gastos/shared'
import { z } from 'zod'
import { apiRequest } from '@/lib/api-client'

export function useTransactions(month?: string) {
  return useQuery({
    queryKey: ['transactions', month ?? 'current'],
    queryFn: () => apiRequest(`/transactions${month ? `?month=${month}` : ''}`, { schema: z.array(transactionSchema) }),
  })
}
