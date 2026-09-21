// Dinheiro é sempre centavos inteiros (04-padroes-codigo § Nomenclatura). Formata sem passar por float:
// "R$ 1.842,37" com espaço não separável (o valor nunca quebra entre "R$" e o número) e sinal de menos real.
export interface MoneyParts {
  negative: boolean
  integer: string
  cents: string
}

export function moneyParts(cents: number): MoneyParts {
  if (!Number.isInteger(cents)) throw new Error(`Dinheiro precisa ser centavos inteiros, recebi ${cents}`)
  const abs = Math.abs(cents)
  const integer = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return { negative: cents < 0, integer, cents: String(abs % 100).padStart(2, '0') }
}

export function formatMoney(cents: number): string {
  const { negative, integer, cents: c } = moneyParts(cents)
  return `${negative ? '\u2212' : ''}R$\u00a0${integer},${c}`
}
