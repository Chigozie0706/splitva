export function formatAmount(amount: number): string {
  if (amount === 0) return "0.00";
  if (amount < 0.01) return amount.toFixed(4);  // shows 0.0010
  if (amount < 1) return amount.toFixed(3);      // shows 0.123
  return amount.toFixed(2);                      // shows 12.34
}