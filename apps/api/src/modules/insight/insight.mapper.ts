import type { SpendingBreakdownItem } from '@gastos/shared'
import { normalizeMerchant } from '../rule/normalize-merchant'

export interface SpendingRow {
  kind: 'EXPENSE' | 'REFUND'
  amountCents: number
  categoryId: string | null
  categoryName: string | null
  merchant: string | null
  personId: string | null
  personName: string | null
  splits: { personId: string; personName: string; amountCents: number }[]
}

const NO_CATEGORY_KEY = 'sem-categoria'
const NO_MERCHANT_KEY = 'sem-estabelecimento'
const NO_PERSON_KEY = 'sem-pessoa'

interface Bucket {
  label: string
  amountCents: number
}

// REFUND reduz o total, mesmo sinal que a fatura (computeInvoice) — nunca uma linha à parte.
function signedCents(row: Pick<SpendingRow, 'kind' | 'amountCents'>): number {
  return row.kind === 'REFUND' ? -row.amountCents : row.amountCents
}

function add(buckets: Map<string, Bucket>, key: string, label: string, cents: number): void {
  const bucket = buckets.get(key) ?? { label, amountCents: 0 }
  bucket.amountCents += cents
  buckets.set(key, bucket)
}

export function totalCents(rows: SpendingRow[]): number {
  return rows.reduce((sum, row) => sum + signedCents(row), 0)
}

export function sumByCategory(rows: SpendingRow[]): Map<string, Bucket> {
  const buckets = new Map<string, Bucket>()
  for (const row of rows) {
    const key = row.categoryId ?? NO_CATEGORY_KEY
    const label = row.categoryId ? (row.categoryName ?? '') : 'Sem categoria'
    add(buckets, key, label, signedCents(row))
  }
  return buckets
}

// Mesma normalização da regra "sempre para este estabelecimento" (rule/normalize-merchant), senão "Loja
// X" e "loja x " viram grupos diferentes. O label mostrado é o merchant como veio (primeira ocorrência).
export function sumByMerchant(rows: SpendingRow[]): Map<string, Bucket> {
  const buckets = new Map<string, Bucket>()
  for (const row of rows) {
    const key = row.merchant ? normalizeMerchant(row.merchant) : NO_MERCHANT_KEY
    const label = row.merchant ?? 'Sem estabelecimento'
    add(buckets, key, label, signedCents(row))
  }
  return buckets
}

// Dividida: cada fatia vai pra pessoa dela, nunca a transação inteira pra uma só (mesma regra de split do
// selfShareCents em alert.mapper, generalizada pra qualquer pessoa, não só o self).
export function sumByPerson(rows: SpendingRow[]): Map<string, Bucket> {
  const buckets = new Map<string, Bucket>()
  for (const row of rows) {
    const sign = row.kind === 'REFUND' ? -1 : 1
    if (row.splits.length > 0) {
      for (const split of row.splits) {
        add(buckets, split.personId, split.personName, sign * split.amountCents)
      }
      continue
    }
    const key = row.personId ?? NO_PERSON_KEY
    const label = row.personId ? (row.personName ?? '') : 'Sem pessoa'
    add(buckets, key, label, sign * row.amountCents)
  }
  return buckets
}

// null sem base de comparação (mês/média zerada) — percentual inventado a partir de 0 não informa nada.
function variationPercent(current: number, baseline: number): number | null {
  if (baseline === 0) return null
  return Math.round(((current - baseline) / baseline) * 100)
}

function averageAt(months: Map<string, Bucket>[], key: string): number {
  const sum = months.reduce((total, month) => total + (month.get(key)?.amountCents ?? 0), 0)
  return Math.round(sum / months.length)
}

// Só entra no relatório quem gastou no mês pedido — meses anteriores sem esse grupo não geram uma linha
// zerada. Ordenado do maior gasto pro menor (03-regras-negocio § Relatórios e insights).
export function buildBreakdown(
  current: Map<string, Bucket>,
  previous: Map<string, Bucket>,
  last3Months: Map<string, Bucket>[],
): SpendingBreakdownItem[] {
  const items = [...current.entries()].map(([key, bucket]) => {
    const previousMonthCents = previous.get(key)?.amountCents ?? 0
    const averageLast3MonthsCents = averageAt(last3Months, key)
    return {
      key,
      label: bucket.label,
      amountCents: bucket.amountCents,
      previousMonthCents,
      vsPreviousMonthPercent: variationPercent(bucket.amountCents, previousMonthCents),
      averageLast3MonthsCents,
      vsAverageLast3MonthsPercent: variationPercent(bucket.amountCents, averageLast3MonthsCents),
    }
  })
  return items.sort((a, b) => b.amountCents - a.amountCents)
}
