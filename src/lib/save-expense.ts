import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { receiptExtension, validateReceiptFile } from "./receipt-files";

/** Save one reviewed expense, removing its new attachment if insertion fails. */
export async function saveExpenseWithReceipt(
  expense: Omit<TablesInsert<"expenses">, "receipt_path">,
  receipt: File | null,
): Promise<string | null> {
  let path: string | null = null;
  try {
    if (receipt) {
      const invalid = validateReceiptFile(receipt);
      if (invalid) return invalid;
      path = `${expense.user_id}/${crypto.randomUUID()}.${receiptExtension(receipt.type)}`;
      const { error } = await supabase.storage.from("receipts").upload(path, receipt, { contentType: receipt.type });
      if (error) return "تعذر رفع الإيصال — لم يتم حفظ العملية";
    }
    const { error } = await supabase.from("expenses").insert({ ...expense, receipt_path: path });
    if (!error) return null;
  } catch {
    // The reviewed fields remain in the form for retry.
  }
  if (path) {
    try {
      const { error } = await supabase.storage.from("receipts").remove([path]);
      if (error) return "تعذر حفظ العملية وتنظيف المرفق؛ راجع الاتصال قبل المحاولة مجددًا";
    } catch {
      return "تعذر حفظ العملية وتنظيف المرفق؛ راجع الاتصال قبل المحاولة مجددًا";
    }
  }
  return "تعذر حفظ العملية — تحقق من الاتصال ثم حاول مجددًا";
}