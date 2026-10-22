export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024;
export const RECEIPT_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

export function validateReceiptFile(file: Pick<File, "size" | "type">): string | null {
  if (!RECEIPT_ACCEPT.split(",").includes(file.type)) {
    return "اختر صورة JPG أو PNG أو WebP أو ملف PDF";
  }
  if (file.size === 0) return "الملف فارغ";
  if (file.size > RECEIPT_MAX_BYTES) return "حجم الملف يتجاوز 10 ميجابايت";
  return null;
}

export function receiptExtension(type: string): string {
  return ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" } as Record<string, string>)[type] ?? "jpg";
}