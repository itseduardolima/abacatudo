import { useQuery } from '@tanstack/react-query'
import { accountInvoiceSchema } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'

export function useInvoice(accountId: string | undefined, month?: string) {
  return useQuery({
    queryKey: ['invoice', accountId, month ?? 'current'],
    queryFn: () =>
      apiRequest(`/invoice?accountId=${accountId}${month ? `&month=${month}` : ''}`, { schema: accountInvoiceSchema }),
    enabled: Boolean(accountId),
  })
}
