/** Pure financial calculations. Monetary values are integer piasters, not floats. */
export function toMinorUnits(input: string): number {
  if (!/^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/.test(input)) throw new Error("Invalid monetary amount");
  const [whole, fraction = ""] = input.split(".");
  const value = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(value)) throw new Error("Amount exceeds supported range");
  return value;
}
export function outstandingMinor(totalMinor: number, paymentsMinor: readonly number[]): number {
  if (!Number.isSafeInteger(totalMinor) || totalMinor < 0 || paymentsMinor.some(x => !Number.isSafeInteger(x) || x <= 0)) {
    throw new Error("Invalid ledger amount");
  }
  const paid = paymentsMinor.reduce((a, b) => a + b, 0);
  if (!Number.isSafeInteger(paid) || paid > totalMinor) throw new Error("Payment exceeds invoice");
  return totalMinor - paid;
}
export type SettlementState = "unpaid" | "partially_paid" | "paid";
export function settlementState(totalMinor: number, paymentsMinor: readonly number[]): SettlementState {
  const remaining = outstandingMinor(totalMinor, paymentsMinor);
  return remaining === totalMinor ? "unpaid" : remaining === 0 ? "paid" : "partially_paid";
}
export function actualCostMinor(postedInvoices: readonly number[], standaloneExpenses: readonly number[]): number {
  const amounts = [...postedInvoices, ...standaloneExpenses];
  if (amounts.some(v => !Number.isSafeInteger(v) || v < 0)) throw new Error("Invalid cost");
  const total = amounts.reduce((a, b) => a + b, 0);
  if (!Number.isSafeInteger(total)) throw new Error("Cost exceeds supported range");
  return total;
}
