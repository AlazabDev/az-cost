import { useRef, useState } from "react";
import { IconCamera, IconPlus, IconReceipt, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useData, type Expense } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORY_LABELS, DIRECTION_LABELS, categoryLabel, directionLabel } from "@/lib/labels";
import { formatDate, formatMoney, todayIso } from "@/lib/format";
import { validateExpense } from "@/lib/expense-validation";

export default function ExpensesPage() {
  const { user } = useAuth();
  const { projects, expenses, loading, refetch } = useData();

  // Filters
  const [filterProject, setFilterProject] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [search, setSearch] = useState("");

  // New expense form
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [projectId, setProjectId] = useState("");
  const [direction, setDirection] = useState("expense");
  const [category, setCategory] = useState("other");
  const [vendor, setVendor] = useState("");
  const [notes, setNotes] = useState("");
  const [spentAt, setSpentAt] = useState(todayIso());
  const [receipt, setReceipt] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = expenses.filter((e) => {
    if (filterProject !== "all" && e.project_id !== filterProject) return false;
    if (filterCategory !== "all" && e.category !== filterCategory) return false;
    if (search) {
      const hay = `${e.vendor ?? ""} ${e.notes ?? ""}`.toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const resetForm = () => {
    setAmount("");
    setCategory("other");
    setVendor("");
    setNotes("");
    setSpentAt(todayIso());
    setReceipt(null);
    setDirection("expense");
  };

  const save = async () => {
    if (!user) return;
    const err = validateExpense({ amount, projectId, direction });
    if (err) {
      toast.error(err);
      return;
    }
    setBusy(true);

    let receiptPath: string | null = null;
    if (receipt) {
      const ext = receipt.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("receipts").upload(path, receipt);
      if (upErr) {
        setBusy(false);
        toast.error("تعذر رفع صورة الإيصال");
        return;
      }
      receiptPath = path;
    }

    const { error } = await supabase.from("expenses").insert({
      user_id: user.id,
      project_id: projectId,
      amount: Number(amount),
      direction,
      category,
      vendor: vendor.trim() || null,
      notes: notes.trim() || null,
      receipt_path: receiptPath,
      spent_at: spentAt,
    });
    setBusy(false);
    if (error) {
      toast.error("تعذر حفظ العملية");
      return;
    }
    toast.success("تم تسجيل العملية");
    setOpen(false);
    resetForm();
    void refetch();
  };

  const remove = async (e: Expense) => {
    const { error } = await supabase.from("expenses").delete().eq("id", e.id);
    if (error) {
      toast.error("تعذر الحذف");
      return;
    }
    if (e.receipt_path) {
      await supabase.storage.from("receipts").remove([e.receipt_path]);
    }
    toast.success("تم حذف العملية");
    void refetch();
  };

  const viewReceipt = async (e: Expense) => {
    if (!e.receipt_path) return;
    const { data, error } = await supabase.storage.from("receipts").createSignedUrl(e.receipt_path, 3600);
    if (error || !data?.signedUrl) {
      toast.error("تعذر فتح الإيصال");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const activeProjects = projects.filter((p) => p.status === "active");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">المصروفات</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={projects.length === 0}>
              <IconPlus className="size-4" />
              تسجيل عملية
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>تسجيل عملية جديدة</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>المبلغ (ج.م) *</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    dir="ltr"
                    className="text-left tabular-nums"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>الاتجاه *</Label>
                  <Select value={direction} onValueChange={setDirection}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DIRECTION_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>المشروع *</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المشروع" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>التصنيف</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>التاريخ</Label>
                  <Input type="date" dir="ltr" value={spentAt} onChange={(e) => setSpentAt(e.target.value)} />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>المورد / العامل</Label>
                <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="اختياري" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>ملاحظات</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="اختياري" rows={2} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>صورة الإيصال</Label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
                />
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                  <IconCamera className="size-4" />
                  {receipt ? receipt.name : "التقط أو اختر صورة"}
                </Button>
              </div>

              <Button disabled={busy} onClick={() => void save()}>
                {busy ? "جارٍ الحفظ…" : "حفظ"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger>
            <SelectValue placeholder="كل المشروعات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المشروعات</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger>
            <SelectValue placeholder="كل التصنيفات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل التصنيفات</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className="col-span-2"
          placeholder="بحث في المورد أو الملاحظات…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {expenses.length === 0 ? "لا توجد عمليات بعد — سجّل أول مصروف." : "لا نتائج مطابقة للفلاتر."}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((e) => {
            const project = projects.find((p) => p.id === e.project_id);
            return (
              <Card key={e.id}>
                <CardContent className="flex items-center gap-3 p-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <span className="truncate">
                        {categoryLabel(e.category)}
                        {e.vendor ? ` — ${e.vendor}` : ""}
                      </span>
                      {e.receipt_path && (
                        <button
                          onClick={() => void viewReceipt(e)}
                          className="shrink-0 text-primary"
                          title="عرض الإيصال"
                        >
                          <IconReceipt className="size-4" />
                        </button>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {project?.name ?? "—"} · {directionLabel(e.direction)} · {formatDate(e.spent_at)}
                    </p>
                    {e.notes && <p className="mt-0.5 truncate text-xs text-muted-foreground">{e.notes}</p>}
                  </div>
                  <span
                    className={
                      e.direction === "expense"
                        ? "shrink-0 font-semibold tabular-nums text-destructive"
                        : "shrink-0 font-semibold tabular-nums text-green-600"
                    }
                  >
                    {e.direction === "expense" ? "−" : "+"}
                    {formatMoney(Number(e.amount))}
                  </span>
                  <button onClick={() => void remove(e)} className="shrink-0 text-muted-foreground hover:text-destructive">
                    <IconTrash className="size-4" />
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
