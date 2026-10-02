import type { HalfPace } from '@gastos/shared'

export function computeHalfPace(input: {
  half: 1 | 2
  daysInMonth: number
  capCents: number
  spentCents: number
}): HalfPace {
  return {
    half: input.half,
    startDay: input.half === 1 ? 1 : 16,
    endDay: input.half === 1 ? 15 : input.daysInMonth,
    capCents: input.capCents,
    spentCents: input.spentCents,
    remainingCents: input.capCents - input.spentCents,
  }
}
