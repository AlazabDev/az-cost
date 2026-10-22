import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ReceiptCapture } from "./receipt-capture";
const mocks = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("@/lib/save-expense", () => ({ saveExpenseWithReceipt: mocks.save }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const projects = [{ id: "site-1", name: "الموقع", status: "active", type: "construction", location: null, created_at: "2026-10-22" }];

beforeEach(() => {
  mocks.save.mockReset(); mocks.save.mockResolvedValue(null);
  URL.createObjectURL = vi.fn(() => "blob:receipt");
  URL.revokeObjectURL = vi.fn();
});
afterEach(cleanup);

it("requires individual review and saves each selected file only once", async () => {
  const onSaved = vi.fn();
  render(<ReceiptCapture projects={projects} userId="owner-1" onSaved={onSaved} />);
  fireEvent.click(screen.getByRole("button", { name: "التقاط إيصالات" }));
  const first = new File(["first"], "first.jpg", { type: "image/jpeg" });
  const second = new File(["second"], "second.jpg", { type: "image/jpeg" });
  fireEvent.change(screen.getByLabelText("رفع إيصالات"), { target: { files: [first, second] } });
  expect(mocks.save).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("المبلغ المدفوع (ج.م) *"), { target: { value: "1500" } });
  const save = screen.getByRole("button", { name: "حفظ المصروف والإيصال" });
  expect(save.hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(save);
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ amount: 1500, project_id: "site-1", user_id: "owner-1", direction: "expense" }), first);
  expect((screen.getByLabelText("المبلغ المدفوع (ج.م) *") as HTMLInputElement).value).toBe("");
  expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
  fireEvent.change(screen.getByLabelText("المبلغ المدفوع (ج.م) *"), { target: { value: "250" } });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "حفظ المصروف والإيصال" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(2));
  expect(mocks.save).toHaveBeenLastCalledWith(expect.objectContaining({ amount: 250, project_id: "site-1" }), second);
  expect(mocks.save).toHaveBeenCalledTimes(2);
});