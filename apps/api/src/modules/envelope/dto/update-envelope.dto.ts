import { updateEnvelopeInputSchema } from '@gastos/shared'
import { createZodDto } from 'nestjs-zod'

export class UpdateEnvelopeDto extends createZodDto(updateEnvelopeInputSchema) {}
