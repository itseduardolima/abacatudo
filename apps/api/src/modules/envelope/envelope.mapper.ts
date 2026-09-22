import type { Envelope as EnvelopeRow } from '@prisma/client'
import type { Envelope } from '@gastos/shared'

// capCents: valor fixo se tiver, senão percentual do teto variável, arredondado (03-regras-negocio §
// Orçamento mensal).
export function envelopeCapCents(
  envelope: { amountCents: number | null; percent: number | null },
  variableCapCents: number,
): number {
  if (envelope.amountCents != null) return envelope.amountCents
  if (envelope.percent != null) return Math.round((variableCapCents * envelope.percent) / 100)
  return 0
}

export function toEnvelopeDto(row: EnvelopeRow, variableCapCents: number): Envelope {
  return {
    id: row.id,
    categoryId: row.categoryId,
    amountCents: row.amountCents,
    percent: row.percent,
    capCents: envelopeCapCents(row, variableCapCents),
  }
}
