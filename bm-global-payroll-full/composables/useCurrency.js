export function useCurrency() {
  const format = (value) => {
    const n = Number(value || 0)
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(n)
  }
  return { format }
}
