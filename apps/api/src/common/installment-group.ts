// Fonte única da chave de agrupamento de parcela — usada tanto pelo cálculo da fatura
// (InvoiceRepository/invoice.mapper.ts) quanto pela lista de lançamentos (TransactionRepository). Nunca
// duplicar essa conta em outro lugar: as duas já divergiram uma vez (achado ao vivo comparando com o OFX
// de um Nubank real) e é fácil voltar a acontecer.
export function installmentGroupKey(row: { description: string; occurredAt: Date; installmentTotal: number }): string {
  // O texto da parcela ("Compra 2/6") é único por linha — tira o "N/M" do fim pra achar as outras
  // parcelas da mesma compra, junto com a data (todas nascem na mesma compra) e o total de parcelas
  // (evita juntar duas compras diferentes que por acaso têm o mesmo nome no mesmo dia).
  const baseDescription = row.description.replace(/\s*\d+\/\d+$/, '')
  return `${baseDescription}|${row.occurredAt.toISOString()}|${row.installmentTotal}`
}

interface InstallmentRow {
  billId: string | null
  description: string
  occurredAt: Date
  installmentNumber: number | null
  installmentTotal: number | null
}

// Mesmo achado do cálculo da fatura: enquanto uma compra parcelada não é faturada (billId null), TODAS as
// parcelas futuras dela também ficam sem billId, não só a próxima — então uma compra em 3x aparecia
// inteira na lista de lançamentos, quando só uma parcela vence por vez. Linha já faturada (billId
// preenchido) sempre passa — cada fatura fechada tem sua própria parcela, sem ambiguidade nenhuma.
export function keepCurrentInstallmentsOnly<T extends InstallmentRow>(rows: T[]): T[] {
  const lowestNumberByGroup = new Map<string, number>()
  for (const row of rows) {
    if (row.billId !== null || row.installmentNumber == null || row.installmentTotal == null) continue
    const key = installmentGroupKey({
      description: row.description,
      occurredAt: row.occurredAt,
      installmentTotal: row.installmentTotal,
    })
    const current = lowestNumberByGroup.get(key)
    if (current === undefined || row.installmentNumber < current) lowestNumberByGroup.set(key, row.installmentNumber)
  }

  return rows.filter((row) => {
    if (row.billId !== null || row.installmentNumber == null || row.installmentTotal == null) return true
    const key = installmentGroupKey({
      description: row.description,
      occurredAt: row.occurredAt,
      installmentTotal: row.installmentTotal,
    })
    return row.installmentNumber === lowestNumberByGroup.get(key)
  })
}
