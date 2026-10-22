import { describe, expect, it } from "vitest";
import { RECEIPT_MAX_BYTES, validateReceiptFile, receiptExtension } from "./receipt-files";

describe("receipt file validation", () => {
  it("accepts supported images and PDF", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "application/pdf"]) {
      expect(validateReceiptFile({ type, size: 100 })).toBeNull();
    }
    expect(validateReceiptFile({ type: "text/html", size: 100 })).not.toBeNull();
  });
  it("respects the receipts bucket's 10 MiB limit", () => {
    expect(RECEIPT_MAX_BYTES).toBe(10485760);
    expect(validateReceiptFile({ type: "image/jpeg", size: 10485760 })).toBeNull();
    expect(validateReceiptFile({ type: "image/jpeg", size: 10485761 })).not.toBeNull();
  });
  it("rejects empty files", () => {
    expect(validateReceiptFile({ type: "image/jpeg", size: 0 })).not.toBeNull();
  });
  it("uses MIME type instead of an untrusted filename extension", () => {
    expect(receiptExtension("application/pdf")).toBe("pdf");
    expect(receiptExtension("image/jpeg")).toBe("jpg");
  });
});