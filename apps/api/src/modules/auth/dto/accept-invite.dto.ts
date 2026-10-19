import { acceptInviteInputSchema } from '@gastos/shared'
import { createZodDto } from 'nestjs-zod'

export class AcceptInviteDto extends createZodDto(acceptInviteInputSchema) {}
