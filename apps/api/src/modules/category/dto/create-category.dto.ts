import { createCategoryInputSchema } from '@gastos/shared'
import { createZodDto } from 'nestjs-zod'

export class CreateCategoryDto extends createZodDto(createCategoryInputSchema) {}
