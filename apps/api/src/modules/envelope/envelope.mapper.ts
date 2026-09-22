import type { Envelope as EnvelopeRow } from '@prisma/client'
import type { Envelope } from '@gastos/shared'
import type { AlertStatus } from '../budget/alert.service'

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

export function toEnvelopeDto(row: EnvelopeRow, capCents: number, alert: AlertStatus): Envelope {
  return {
    id: row.id,
    categoryId: row.categoryId,
    amountCents: row.amountCents,
    percent: row.percent,
    capCents,
    spentCents: alert.spentCents,
    percentUsed: alert.percentUsed,
    firedThresholds: alert.firedThresholds,
  }
}
