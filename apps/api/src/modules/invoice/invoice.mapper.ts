export interface InvoiceRow {
  kind: 'EXPENSE' | 'REFUND'
  amountCents: number
  personId: string | null
  splits: { personId: string; amountCents: number }[]
}

export interface Invoice {
  totalCents: number
  notMineCents: number
  mineCents: number
}

// Fatura = Meu + Não é meu (03-regras-negocio § Só a minha parte). Estorno reduz o total, não é uma linha
// à parte. Split conta pra "Meu" só a fatia do self; sem split, é tudo ou nada pela pessoa da transação.
export function computeInvoice(rows: InvoiceRow[], selfPersonId: string): Invoice {
  let totalCents = 0
  let mineCents = 0

  for (const row of rows) {
    const sign = row.kind === 'REFUND' ? -1 : 1
    totalCents += sign * row.amountCents

    if (row.splits.length > 0) {
      const selfShare = row.splits.find((split) => split.personId === selfPersonId)?.amountCents ?? 0
      mineCents += sign * selfShare
    } else if (row.personId === selfPersonId) {
      mineCents += sign * row.amountCents
    }
  }

  return { totalCents, mineCents, notMineCents: totalCents - mineCents }
}
