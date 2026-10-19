export function fixedExpenseShareKey(id: string, half: 1 | 2): string {
  return `${id}:${half}`
}
