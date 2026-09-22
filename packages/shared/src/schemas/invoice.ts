import { z } from 'zod'
import { centsSchema } from './common'

// Fatura = Meu + Não é meu, sempre (03-regras-negocio § Só a minha parte).
export const invoiceSchema = z
  .object({ totalCents: centsSchema, mineCents: centsSchema, notMineCents: centsSchema })
  .strict()
export type Invoice = z.infer<typeof invoiceSchema>
