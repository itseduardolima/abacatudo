import { ChevronLeft, ChevronRight } from 'lucide-react'

// Pílula única "‹ setembro 2026 ›" pra navegar entre meses. Alvos de toque de 40px; o rótulo já vem
// formatado (quem chama decide fuso e idioma).
export function MonthStepper({
  label,
  onPrevious,
  onNext,
}: {
  label: string
  onPrevious: () => void
  onNext: () => void
}) {
  return (
    <div className="inline-flex items-center rounded-pill bg-canvas p-1 shadow-hair">
      <button
        type="button"
        onClick={onPrevious}
        aria-label="Mês anterior"
        className="flex h-9 w-9 items-center justify-center rounded-full text-ink"
      >
        <ChevronLeft size={18} strokeWidth={2} />
      </button>
      <span className="min-w-[7rem] whitespace-nowrap text-center text-sm font-semibold capitalize text-ink">
        {label}
      </span>
      <button
        type="button"
        onClick={onNext}
        aria-label="Próximo mês"
        className="flex h-9 w-9 items-center justify-center rounded-full text-ink"
      >
        <ChevronRight size={18} strokeWidth={2} />
      </button>
    </div>
  )
}
