import { updateCategoryInputSchema } from '@gastos/shared'
import { createZodDto } from 'nestjs-zod'

export class UpdateCategoryDto extends createZodDto(updateCategoryInputSchema) {}
