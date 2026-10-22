import { useEffect, useRef, useState } from "react";
import { IconCamera, IconCheck, IconFileInvoice, IconPhoto, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Project } from "@/hooks/use-data";
import { CATEGORY_LABELS } from "@/lib/labels";
import { todayIso } from "@/lib/format";
import { validateExpense } from "@/lib/expense-validation";
import { RECEIPT_ACCEPT, validateReceiptFile } from "@/lib/receipt-files";
import { saveExpenseWithReceipt } from "@/lib/save-expense";

interface CaptureItem {
  id: string;
  file: File;
  preview: string;
  amount: string;
  projectId: string;
  category: string;
  vendor: string;
  date: string;
  notes: string;
  saved: boolean;
}

export function ReceiptCapture({ projects, userId, onSaved }: { projects: Project[]; userId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CaptureItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  const urls = useRef(new Set<string>());
  const activeProjects = projects.filter((project) => project.status === "active");
  const current = items.find((item) => item.id === selectedId);
  const savedCount = items.filter((item) => item.saved).length;

  useEffect(() => {
    const previews = urls.current;
    return () => { previews.forEach((url) => URL.revokeObjectURL(url)); };
  }, []);

  const addFiles = (files: FileList | null) => {
    const additions: CaptureItem[] = [];
    for (const file of Array.from(files ?? [])) {
      const error = validateReceiptFile(file);
      if (error) { toast.error(`${file.name}: ${error}`); continue; }
      const preview = URL.createObjectURL(file);
      urls.current.add(preview);
      additions.push({ id: crypto.randomUUID(), file, preview, amount: "", projectId: current?.projectId || (activeProjects.length === 1 ? activeProjects[0].id : ""), category: "other", vendor: "", date: todayIso(), notes: "", saved: false });
    }
    if (!additions.length) return;
    setItems((previous) => [...previous, ...additions]);
    setSelectedId(additions[0].id);
    setConfirmed(false);
  };

  const update = (patch: Partial<CaptureItem>) => {
    setItems((previous) => previous.map((item) => item.id === selectedId ? { ...item, ...patch } : item));
    setConfirmed(false);
  };

  const discard = () => {
    if (!current || busy || current.saved) return;
    URL.revokeObjectURL(current.preview);
    urls.current.delete(current.preview);
    const remaining = items.filter((item) => item.id !== current.id);
    setItems(remaining);
    setSelectedId(remaining.find((item) => !item.saved)?.id ?? remaining[0]?.id ?? "");
    setConfirmed(false);
  };

  const save = async () => {
    if (!current || current.saved || busy || !confirmed) return;
    const error = validateExpense({ amount: current.amount, projectId: current.projectId, direction: "expense" });
    if (error) { toast.error(error); return; }
    if (!activeProjects.some((project) => project.id === current.projectId)) { toast.error("اختر مشروعًا نشطًا"); return; }
    if (!current.date) { toast.error("حدد تاريخ المصروف"); return; }
    setBusy(true);
    const failure = await saveExpenseWithReceipt({ user_id: userId, project_id: current.projectId, amount: Number(current.amount), direction: "expense", category: current.category, vendor: current.vendor.trim() || null, notes: current.notes.trim() || null, spent_at: current.date }, current.file);
    setBusy(false);
    if (failure) { toast.error(failure); return; }
    setItems((previous) => previous.map((item) => item.id === current.id ? { ...item, saved: true } : item));
    toast.success("تم حفظ المصروف والإيصال");
    onSaved();
    const next = items.find((item) => !item.saved && item.id !== current.id);
    if (next) setSelectedId(next.id);
    setConfirmed(false);
  };

  const changeOpen = (next: boolean) => {
    if (busy) return;
    if (!next && items.some((item) => !item.saved) && !window.confirm("توجد إيصالات لم تُحفظ. هل تريد إغلاقها وفقد البيانات غير المحفوظة؟")) return;
    if (!next) {
      urls.current.forEach((url) => URL.revokeObjectURL(url));
      urls.current.clear();
      setItems([]); setSelectedId(""); setConfirmed(false);
    }
    setOpen(next);
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild><Button size="sm" disabled={activeProjects.length === 0}><IconCamera />التقاط إيصالات</Button></DialogTrigger>
      <DialogContent dir="rtl" className="max-h-[94dvh] w-[calc(100%-1rem)] max-w-4xl gap-4 overflow-y-auto p-4 sm:p-6" onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }} onPointerDownOutside={(event) => event.preventDefault()}>
        <DialogHeader className="text-right sm:text-right">
          <DialogTitle className="pe-8">إيصالات الموقع</DialogTitle>
          <DialogDescription>مصروفات مدفوعة · {savedCount} محفوظ / {items.length} إيصال</DialogDescription>
        </DialogHeader>
        <input ref={cameraRef} aria-label="تصوير إيصال" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} />
        <input ref={filesRef} aria-label="رفع إيصالات" type="file" accept={RECEIPT_ACCEPT} multiple className="hidden" onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy} onClick={() => cameraRef.current?.click()}><IconCamera />تصوير إيصال</Button>
          <Button variant="outline" disabled={busy} onClick={() => filesRef.current?.click()}><IconPhoto />رفع صور أو PDF</Button>
        </div>
        {!current ? <div className="flex min-h-48 items-center justify-center border border-dashed rounded-md text-muted-foreground"><IconFileInvoice className="size-12" aria-hidden="true" /></div> : <>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {items.map((item, index) => <Button key={item.id} variant={item.id === selectedId ? "secondary" : "outline"} size="sm" disabled={busy} className="shrink-0" onClick={() => { setSelectedId(item.id); setConfirmed(false); }}>{item.saved ? <IconCheck /> : <IconFileInvoice />}إيصال {index + 1}</Button>)}
          </div>
          <div className="grid min-w-0 gap-5 md:grid-cols-2">
            <div className="min-w-0">
              <div className="flex h-56 items-center justify-center overflow-hidden rounded-md border bg-muted md:h-96">
                {current.file.type === "application/pdf" ? <a href={current.preview} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 text-primary"><IconFileInvoice className="size-14" />فتح ملف PDF</a> : <img src={current.preview} alt="الإيصال قيد المراجعة" className="h-full w-full object-contain" />}
              </div>
              <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
                <span className="truncate text-xs text-muted-foreground">{current.file.name}</span>
                {!current.saved && <Button variant="ghost" size="icon" aria-label="حذف الإيصال غير المحفوظ" title="حذف الإيصال غير المحفوظ" disabled={busy} onClick={discard}><IconTrash /></Button>}
              </div>
            </div>
            {current.saved ? <div className="flex items-center justify-center gap-2 text-primary"><IconCheck />تم حفظ المصروف والإيصال</div> : <form className="flex min-w-0 flex-col gap-3" onSubmit={(event) => { event.preventDefault(); void save(); }}>
              <fieldset disabled={busy} className="flex min-w-0 flex-col gap-3">
                <div className="flex flex-col gap-1.5"><Label htmlFor="capture-project">المشروع *</Label><Select value={current.projectId} onValueChange={(projectId) => update({ projectId })}><SelectTrigger id="capture-project"><SelectValue placeholder="اختر المشروع" /></SelectTrigger><SelectContent>{activeProjects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5"><Label htmlFor="capture-amount">المبلغ المدفوع (ج.م) *</Label><Input id="capture-amount" required type="number" min="0.01" step="0.01" inputMode="decimal" dir="ltr" value={current.amount} onChange={(event) => update({ amount: event.target.value })} placeholder="0.00" /></div>
                  <div className="flex flex-col gap-1.5"><Label htmlFor="capture-date">التاريخ *</Label><Input id="capture-date" required type="date" dir="ltr" value={current.date} onChange={(event) => update({ date: event.target.value })} /></div>
                </div>
                <div className="flex flex-col gap-1.5"><Label htmlFor="capture-category">التصنيف</Label><Select value={current.category} onValueChange={(category) => update({ category })}><SelectTrigger id="capture-category"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(CATEGORY_LABELS).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div>
                <div className="flex flex-col gap-1.5"><Label htmlFor="capture-vendor">المورد / العامل</Label><Input id="capture-vendor" value={current.vendor} onChange={(event) => update({ vendor: event.target.value })} /></div>
                <div className="flex flex-col gap-1.5"><Label htmlFor="capture-notes">ملاحظات</Label><Textarea id="capture-notes" rows={2} value={current.notes} onChange={(event) => update({ notes: event.target.value })} /></div>
                <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 size-4 accent-primary" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />راجعت الإيصال والمشروع والمبلغ المدفوع</label>
              </fieldset>
              <Button type="submit" disabled={busy || !confirmed}><IconCheck />{busy ? "جارٍ الرفع والحفظ…" : "حفظ المصروف والإيصال"}</Button>
            </form>}
          </div>
        </>}
      </DialogContent>
    </Dialog>
  );
}