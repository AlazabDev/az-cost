/**
 * Validation rules for a new expense entry.
 * Mandatory: amount (> 0), project, direction. Everything else is optional.
 */

export interface ExpenseDraft {
  amount: string;
  projectId: string;
  direction: string;
}

/** Returns an Arabic error message, or null when the draft is valid. */
export function validateExpense(draft: ExpenseDraft): string | null {
  if (!draft.projectId) return "اختر المشروع أولًا";
  if (draft.direction !== "expense" && draft.direction !== "payment_received") {
    return "حدد اتجاه العملية (مصروف أو دفعة مستلمة)";
  }
  const amount = Number(draft.amount);
  if (!draft.amount.trim() || !Number.isFinite(amount) || amount <= 0) {
    return "أدخل مبلغًا صحيحًا أكبر من صفر";
  }
  return null;
}
