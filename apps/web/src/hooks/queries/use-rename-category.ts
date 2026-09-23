import { useMutation, useQueryClient } from '@tanstack/react-query'
import { categorySchema, type UpdateCategoryInput } from '@gastos/shared'
import { apiRequest } from '@/lib/api-client'
import { CATEGORIES_QUERY_KEY } from './use-categories'

export function useRenameCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoryInput }) =>
      apiRequest(`/categories/${id}`, { method: 'PATCH', body: input, schema: categorySchema }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY }),
  })
}
