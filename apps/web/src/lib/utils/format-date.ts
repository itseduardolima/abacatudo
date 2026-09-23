// Dia do produto é sempre em America/Manaus (03-regras-negocio, 04-padroes-codigo) — nunca no fuso do
// navegador de quem está olhando.
const FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Manaus',
  day: '2-digit',
  month: '2-digit',
})

export function formatShortDate(isoDate: string): string {
  return FORMATTER.format(new Date(isoDate))
}
