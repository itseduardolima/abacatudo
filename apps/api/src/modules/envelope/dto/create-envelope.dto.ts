import { createEnvelopeInputSchema } from '@gastos/shared'
import { createZodDto } from 'nestjs-zod'

export class CreateEnvelopeDto extends createZodDto(createEnvelopeInputSchema) {}
