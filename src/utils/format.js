export function formatNumber(value) {
  if (!Number.isFinite(value)) return '0';
  if (Math.abs(value) < 1000) return value.toFixed(value < 10 && value !== 0 ? 1 : 0);
  return Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 2 }).format(value);
}
