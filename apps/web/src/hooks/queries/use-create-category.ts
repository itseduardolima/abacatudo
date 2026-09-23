import { useMutation, useQueryClient } from '@tanstack/react-query'
import { categorySchema, type CreateCategoryInput } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'
import { CATEGORIES_QUERY_KEY } from './use-categories'

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCategoryInput) =>
      apiRequest('/categories', { method: 'POST', body: input, schema: categorySchema }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY }),
  })
}
