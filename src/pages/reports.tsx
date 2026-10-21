import { useMemo, useState } from "react";
import { IconFileSpreadsheet, IconPrinter } from "@tabler/icons-react";
import { toast } from "sonner";
import { useData } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { categoryLabel, directionLabel } from "@/lib/labels";
import { formatDate, formatMoney } from "@/lib/format";

export default function ReportsPage() {
  const { projects, expenses, loading } = useData();
  const [projectId, setProjectId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rows = useMemo(
    () =>
      expenses.filter((e) => {
        if (projectId !== "all" && e.project_id !== projectId) return false;
        if (from && e.spent_at < from) return false;
        if (to && e.spent_at > to) return false;
        return true;
      }),
    [expenses, projectId, from, to],
  );

  const totalOut = rows.filter((e) => e.direction === "expense").reduce((s, e) => s + Number(e.amount), 0);
  const totalIn = rows.filter((e) => e.direction === "payment_received").reduce((s, e) => s + Number(e.amount), 0);

  const byCategory = Object.entries(
    rows
      .filter((e) => e.direction === "expense")
      .reduce<Record<string, number>>((acc, e) => {
        acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount);
        return acc;
      }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "—";
  const reportTitle = projectId === "all" ? "كل المشروعات" : projectName(projectId);

  const exportCsv = () => {
    if (rows.length === 0) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }
    const header = ["التاريخ", "المشروع", "الاتجاه", "التصنيف", "المورد/العامل", "ملاحظات", "المبلغ"];
    const lines = rows.map((e) =>
      [
        e.spent_at,
        projectName(e.project_id),
        directionLabel(e.direction),
        categoryLabel(e.category),
        e.vendor ?? "",
        (e.notes ?? "").replaceAll("\n", " "),
        String(e.amount),
      ]
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(","),
    );
    // BOM so Excel opens Arabic correctly
    const csv = "\uFEFF" + [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `تقرير-${reportTitle}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between" data-no-print>
        <h1 className="text-2xl font-bold">التقارير</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <IconFileSpreadsheet className="size-4" />
            Excel / CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <IconPrinter className="size-4" />
            طباعة / PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3" data-no-print>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger>
            <SelectValue />
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
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">من تاريخ</Label>
          <Input type="date" dir="ltr" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">إلى تاريخ</Label>
          <Input type="date" dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <h2 className="text-lg font-semibold">تقرير: {reportTitle}</h2>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي المصروفات</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold tabular-nums">{formatMoney(totalOut)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">دفعات مستلمة</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold tabular-nums">{formatMoney(totalIn)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">عدد العمليات</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold tabular-nums">{rows.length}</CardContent>
        </Card>
      </div>

      {byCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">المصروفات حسب التصنيف</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {byCategory.map(([key, total]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span>{categoryLabel(key)}</span>
                <span className="font-medium tabular-nums">{formatMoney(total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ</TableHead>
                <TableHead>المشروع</TableHead>
                <TableHead>التصنيف</TableHead>
                <TableHead>المورد/العامل</TableHead>
                <TableHead className="text-left">المبلغ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(e.spent_at)}</TableCell>
                  <TableCell>{projectName(e.project_id)}</TableCell>
                  <TableCell>{categoryLabel(e.category)}</TableCell>
                  <TableCell>{e.vendor ?? "—"}</TableCell>
                  <TableCell
                    className={
                      e.direction === "expense"
                        ? "text-left font-medium tabular-nums text-destructive"
                        : "text-left font-medium tabular-nums text-green-600"
                    }
                  >
                    {e.direction === "expense" ? "−" : "+"}
                    {formatMoney(Number(e.amount))}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    لا توجد عمليات في هذا النطاق
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
