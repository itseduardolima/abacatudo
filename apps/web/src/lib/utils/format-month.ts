// Nome do mês por extenso, minúsculo (protótipo 07-inicio: "Meu em setembro") — sempre em
// America/Manaus, nunca no fuso do navegador.
const MONTH_NAME_FORMATTER = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Manaus', month: 'long' })

function parseMonthKey(monthKeyValue: string): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKeyValue)
  if (!match) throw new Error(`monthKey inválido (esperado AAAA-MM): "${monthKeyValue}"`)
  return { year: Number(match[1]), month: Number(match[2]) }
}

export function formatMonthName(monthKeyValue: string): string {
  const { year, month } = parseMonthKey(monthKeyValue)
  return MONTH_NAME_FORMATTER.format(new Date(Date.UTC(year, month - 1, 15, 12)))
}

// Último dia do mês (AAAA-MM) formatado como "30 set" (protótipo: "Por dia, até 30 set").
const DAY_MONTH_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Manaus',
  day: '2-digit',
  month: 'short',
})

export function formatLastDayOfMonth(monthKeyValue: string): string {
  const { year, month } = parseMonthKey(monthKeyValue)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return DAY_MONTH_FORMATTER.format(new Date(Date.UTC(year, month - 1, lastDay, 12))).replace('.', '')
}
