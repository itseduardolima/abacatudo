import { z } from 'zod'
import { idSchema } from './common'

export const categorySchema = z
  .object({
    id: idSchema,
    name: z.string(),
    archivedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
  })
  .strict()
export type Category = z.infer<typeof categorySchema>

export const createCategoryInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Informe um nome.').max(40),
  })
  .strict()
export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>

export const updateCategoryInputSchema = createCategoryInputSchema
export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>
