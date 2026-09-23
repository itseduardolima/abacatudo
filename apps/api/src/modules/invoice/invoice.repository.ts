import { Inject, Injectable } from '@nestjs/common'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'
import type { InvoiceRow } from './invoice.mapper'

@Injectable()
export class InvoiceRepository {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  // EXPENSE/REFUND só de conta CREDIT_CARD — CARD_PAYMENT nunca entra na fatura (03-regras-negocio §
  // Movimentações: a linha de pagamento é excluída do gasto). Usado só pra conta MANUAL/IMPORT, que não
  // tem billId de banco de verdade — mês calendário é a aproximação possível.
  async findRows(userId: string, range: { start: Date; end: Date }, accountId?: string): Promise<InvoiceRow[]> {
    const rows = await this.prisma.transaction.findMany({
      where: {
        userId,
        occurredAt: { gte: range.start, lt: range.end },
        kind: { in: ['EXPENSE', 'REFUND'] },
        account: { type: 'CREDIT_CARD', ...(accountId ? { id: accountId } : {}) },
      },
      include: { splits: { select: { personId: true, amountCents: true } } },
    })
    return rows.map((row) => toInvoiceRow(row, null))
  }

  // Fatura de verdade (03-regras-negocio § Movimentações: "agrupa por billId; as pendentes (sem billId)
  // pertencem à fatura aberta") — usado pra conta PLUGGY, cujo billId vem do banco real no sync. Nunca
  // filtra por `occurredAt`: o fechamento do cartão quase nunca bate com o mês calendário. Inclui
  // CARD_PAYMENT (só aqui — nunca em findRows): pagamento antecipado abate o que falta pagar da fatura
  // aberta (computeInvoice trata o sinal). Traz description/occurredAt/installmentTotal pra
  // keepNextDueInstallmentOnly identificar qual parcela é a próxima a vencer.
  async findOpenRows(userId: string, accountId?: string): Promise<InvoiceRow[]> {
    const rows = await this.prisma.transaction.findMany({
      where: {
        userId,
        billId: null,
        kind: { in: ['EXPENSE', 'REFUND', 'CARD_PAYMENT'] },
        account: { type: 'CREDIT_CARD', source: 'PLUGGY', ...(accountId ? { id: accountId } : {}) },
      },
      include: { splits: { select: { personId: true, amountCents: true } } },
    })
    return rows.map((row) => toInvoiceRow(row, installmentOf(row)))
  }
}

function installmentOf(row: {
  description: string
  occurredAt: Date
  installmentNumber: number | null
  installmentTotal: number | null
}): InvoiceRow['installment'] {
  if (row.installmentNumber == null || row.installmentTotal == null) return null
  // O texto da parcela ("Compra 2/6") é único por linha — tira o "N/M" do fim pra achar as outras
  // parcelas da mesma compra, junto com a data (todas as parcelas nascem na mesma compra) e o total de
  // parcelas (evita juntar duas compras diferentes que por acaso têm o mesmo nome no mesmo dia).
  const baseDescription = row.description.replace(/\s*\d+\/\d+$/, '')
  const groupKey = `${baseDescription}|${row.occurredAt.toISOString()}|${row.installmentTotal}`
  return { groupKey, number: row.installmentNumber }
}

function toInvoiceRow(
  row: {
    kind: string
    amountCents: number
    personId: string | null
    splits: { personId: string; amountCents: number }[]
  },
  installment: InvoiceRow['installment'],
): InvoiceRow {
  return {
    kind: row.kind as 'EXPENSE' | 'REFUND' | 'CARD_PAYMENT',
    amountCents: row.amountCents,
    personId: row.personId,
    splits: row.splits,
    installment,
  }
}
