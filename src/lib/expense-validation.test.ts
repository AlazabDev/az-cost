import { describe, expect, it } from "vitest";
import { validateExpense } from "./expense-validation";

const valid = { amount: "1500", projectId: "p1", direction: "expense" };

describe("validateExpense", () => {
  it("accepts a complete draft", () => {
    expect(validateExpense(valid)).toBeNull();
  });

  it("requires a project", () => {
    expect(validateExpense({ ...valid, projectId: "" })).toBe("اختر المشروع أولًا");
  });

  it("requires a positive amount", () => {
    expect(validateExpense({ ...valid, amount: "" })).toBe("أدخل مبلغًا صحيحًا أكبر من صفر");
    expect(validateExpense({ ...valid, amount: "0" })).toBe("أدخل مبلغًا صحيحًا أكبر من صفر");
    expect(validateExpense({ ...valid, amount: "-50" })).toBe("أدخل مبلغًا صحيحًا أكبر من صفر");
    expect(validateExpense({ ...valid, amount: "abc" })).toBe("أدخل مبلغًا صحيحًا أكبر من صفر");
  });

  it("requires a known direction", () => {
    expect(validateExpense({ ...valid, direction: "" })).toBe("حدد اتجاه العملية (مصروف أو دفعة مستلمة)");
    expect(validateExpense({ ...valid, direction: "payment_received" })).toBeNull();
  });
});
