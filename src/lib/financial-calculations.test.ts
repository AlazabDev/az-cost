import { describe, it, expect } from "vitest";
import { toMinorUnits, outstandingMinor, settlementState, actualCostMinor } from "./financial-calculations";

describe("Financial invariants", () => {
 it("preserves cents without floating-point rounding", () => {
  expect(toMinorUnits("100000.00")).toBe(10000000);
  expect(toMinorUnits("0.05")).toBe(5);
  expect(() => toMinorUnits("1.001")).toThrow();
  expect(() => toMinorUnits("-1")).toThrow();
 });
 it("reconciles partial and full payment", () => {
  expect(outstandingMinor(10000000,[3000000])).toBe(7000000);
  expect(settlementState(10000000,[3000000])).toBe("partially_paid");
  expect(outstandingMinor(10000000,[3000000,7000000])).toBe(0);
  expect(settlementState(10000000,[3000000,7000000])).toBe("paid");
  expect(settlementState(10000000,[])).toBe("unpaid");
 });
 it("rejects payment exceeding payable amount", () => {
  expect(() => outstandingMinor(10000000,[3000000,7000001])).toThrow();
 });
 it("does not count cash settlement as a second cost", () => {
  const postedInvoices = [10000000];
  const independentExpenses = [500000];
  expect(actualCostMinor(postedInvoices,independentExpenses)).toBe(10500000);
 });
});
