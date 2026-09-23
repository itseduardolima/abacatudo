import { MoneyText } from '@/components/finance/MoneyText'

// Segundo item do carrossel do hero (Fase 4) — saldo real da conta de benefício (InfinitePay via Pluggy),
// só existe quando o usuário marcou uma conta em /accounts. Mesmo tratamento visual do card de ritmo
// (bg-inverse): são dois jeitos de olhar dinheiro do mês, não conteúdos diferentes.
export function BenefitBalanceCard({ accountName, cents }: { accountName: string | null; cents: number }) {
  return (
    <div className="flex min-h-[220px] flex-col justify-center rounded-card-lg bg-inverse px-5 py-6 text-on-inverse">
      <p className="text-xs text-on-inverse-muted">Saldo de benefício</p>
      <p className="display-number mt-3 text-[2.75rem] text-on-inverse-accent">
        <MoneyText cents={cents} className="!text-on-inverse-accent" />
      </p>
      {accountName && <p className="mt-2 text-xs text-on-inverse-muted">{accountName}</p>}
    </div>
  )
}
