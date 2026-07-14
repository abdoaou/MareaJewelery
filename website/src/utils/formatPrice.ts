/** Prices always display in Western numerals with $ prefix, even in Arabic mode. */
export function formatPrice(amount: number) {
  return `$${amount}`
}
