import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ upload: vi.fn(), remove: vi.fn(), insert: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove }) }, from: () => ({ insert: mocks.insert }) } }));
import { saveExpenseWithReceipt } from "./save-expense";

const expense = { user_id: "owner", project_id: "project", amount: 1500, direction: "expense" };
const file = new File(["receipt"], "receipt.jpg", { type: "image/jpeg" });
beforeEach(() => { vi.clearAllMocks(); mocks.upload.mockResolvedValue({ error: null }); mocks.remove.mockResolvedValue({ error: null }); mocks.insert.mockResolvedValue({ error: null }); });

describe("expense receipt persistence", () => {
  it("saves one expense referencing its uploaded receipt", async () => {
    expect(await saveExpenseWithReceipt(expense, file)).toBeNull();
    const path = mocks.upload.mock.calls[0][0];
    expect(path.startsWith("owner/")).toBe(true);
    expect(mocks.insert).toHaveBeenCalledWith({ ...expense, receipt_path: path });
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("does not insert an expense after an upload failure", async () => {
    mocks.upload.mockResolvedValue({ error: new Error("upload denied") });
    expect(await saveExpenseWithReceipt(expense, file)).not.toBeNull();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("removes a new attachment when the expense insert fails", async () => {
    mocks.insert.mockResolvedValue({ error: new Error("insert denied") });
    expect(await saveExpenseWithReceipt(expense, file)).not.toBeNull();
    expect(mocks.remove).toHaveBeenCalledWith([mocks.upload.mock.calls[0][0]]);
  });
  it("also cleans up when insertion throws", async () => {
    mocks.insert.mockRejectedValue(new Error("network failure"));
    expect(await saveExpenseWithReceipt(expense, file)).not.toBeNull();
    expect(mocks.remove).toHaveBeenCalledTimes(1);
  });
});