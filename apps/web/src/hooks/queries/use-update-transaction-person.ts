import { useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionSchema, type UpdateTransactionPersonInput } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'
import { TRANSACTIONS_QUERY_KEY } from './use-transactions'

export function useUpdateTransactionPerson() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTransactionPersonInput }) =>
      apiRequest(`/transactions/${id}/person`, { method: 'PATCH', body: input, schema: transactionSchema }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY }),
  })
}
