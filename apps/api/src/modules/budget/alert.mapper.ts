import type { AlertThreshold } from '@gastos/shared'

export const ALERT_THRESHOLDS: readonly AlertThreshold[] = [70, 90, 100]

export interface AlertExpenseRow {
  categoryId: string | null
  amountCents: number
  personId: string | null
  splits: { personId: string; amountCents: number }[]
}

// Fatia do self: se dividiu, é só a fatia dele no split; sem split, é tudo ou nada pela pessoa da
// transação (mesma regra do computeInvoice, só sem o sinal de REFUND — aqui as linhas já vêm filtradas
// só EXPENSE, 03-regras-negocio § Orçamento mensal só fala de compra, nunca estorno).
function selfShareCents(row: AlertExpenseRow, selfPersonId: string): number {
  if (row.splits.length > 0) return row.splits.find((split) => split.personId === selfPersonId)?.amountCents ?? 0
  return row.personId === selfPersonId ? row.amountCents : 0
}

// Uma passada só nas linhas do mês: soma o total "Meu" e já separa por categoria — evita 1 query por
// envelope na listagem.
export function sumSelfSpentByCategory(
  rows: AlertExpenseRow[],
  selfPersonId: string,
): { totalCents: number; byCategoryCents: Map<string, number> } {
  let totalCents = 0
  const byCategoryCents = new Map<string, number>()

  for (const row of rows) {
    const share = selfShareCents(row, selfPersonId)
    if (share === 0) continue
    totalCents += share
    if (row.categoryId) {
      byCategoryCents.set(row.categoryId, (byCategoryCents.get(row.categoryId) ?? 0) + share)
    }
  }

  return { totalCents, byCategoryCents }
}

// Sem teto (percent de um teto variável zerado): qualquer gasto já é 100%, nunca divide por zero.
export function percentUsed(spentCents: number, capCents: number): number {
  if (capCents <= 0) return spentCents > 0 ? 100 : 0
  return Math.floor((spentCents / capCents) * 100)
}

export function crossedThresholds(percent: number): AlertThreshold[] {
  return ALERT_THRESHOLDS.filter((threshold) => percent >= threshold)
}
