import { z } from 'zod'
import { centsSchema } from './common'

// Fatura = Meu + Não é meu, sempre (03-regras-negocio § Só a minha parte).
export const invoiceSchema = z
  .object({ totalCents: centsSchema, mineCents: centsSchema, notMineCents: centsSchema })
  .strict()
export type Invoice = z.infer<typeof invoiceSchema>

// Fatura de um cartão: a mesma conta, mais o que a navegação por mês precisa (03-regras-negocio § Fatura
// prevista). isForecast = mês posterior ao atual, só parcelas já lançadas; lastForecastMonth = último mês
// com parcela naquele cartão (limite da seta "próximo"), null se não há parcela futura.
export const accountInvoiceSchema = z
  .object({
    totalCents: centsSchema,
    mineCents: centsSchema,
    notMineCents: centsSchema,
    isForecast: z.boolean(),
    lastForecastMonth: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .nullable(),
  })
  .strict()
export type AccountInvoice = z.infer<typeof accountInvoiceSchema>
