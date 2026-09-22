// "Mês" e "dia" do produto são sempre calculados em America/Manaus, nunca em UTC (03-regras-negocio).
export const PRODUCT_TIME_ZONE = 'America/Manaus'

const PARTS_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: PRODUCT_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

function zonedParts(date: Date): {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
} {
  const parts = PARTS_FORMATTER.formatToParts(date)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

export function monthKey(date: Date): string {
  const { year, month } = zonedParts(date)
  return `${year}-${pad(month)}`
}

export function dateKey(date: Date): string {
  const { year, month, day } = zonedParts(date)
  return `${year}-${pad(month)}-${pad(day)}`
}

// Sem hardcodar o offset: descobre o offset real comparando o instante "chutado" com o que ele parece no fuso.
function zonedTimeToUtc(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second))
  const seenInZone = zonedParts(guess)
  const seenAsUtc = Date.UTC(
    seenInZone.year,
    seenInZone.month - 1,
    seenInZone.day,
    seenInZone.hour,
    seenInZone.minute,
    seenInZone.second,
  )
  const offsetMinutes = (seenAsUtc - guess.getTime()) / 60_000
  return new Date(guess.getTime() - offsetMinutes * 60_000)
}

// Fim exclusivo: usar em `occurredAt >= start AND occurredAt < end`.
export function monthRange(monthKeyValue: string): { start: Date; end: Date } {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(monthKeyValue)
  if (!match) throw new Error(`monthKey inválido (esperado AAAA-MM): "${monthKeyValue}"`)
  const year = Number(match[1])
  const month = Number(match[2])
  const start = zonedTimeToUtc(year, month, 1)
  const end = month === 12 ? zonedTimeToUtc(year + 1, 1, 1) : zonedTimeToUtc(year, month + 1, 1)
  return { start, end }
}
