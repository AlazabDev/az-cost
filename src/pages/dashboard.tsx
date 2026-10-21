import { Link } from "react-router-dom";
import { IconPlus, IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useData } from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { categoryLabel, projectStatusLabel } from "@/lib/labels";
import { formatDate, formatMoney } from "@/lib/format";

const PIE_COLORS = ["#0e9494", "#f59e0b", "#6366f1", "#ec4899", "#22c55e", "#f97316", "#94a3b8"];

export default function DashboardPage() {
  const { projects, expenses, loading } = useData();

  const totalOut = expenses.filter((e) => e.direction === "expense").reduce((s, e) => s + Number(e.amount), 0);
  const totalIn = expenses.filter((e) => e.direction === "payment_received").reduce((s, e) => s + Number(e.amount), 0);
  const activeProjects = projects.filter((p) => p.status === "active");

  const byCategory = Object.entries(
    expenses
      .filter((e) => e.direction === "expense")
      .reduce<Record<string, number>>((acc, e) => {
        acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount);
        return acc;
      }, {}),
  ).map(([key, value]) => ({ name: categoryLabel(key), value }));

  const byProject = projects
    .map((p) => ({
      project: p,
      total: expenses
        .filter((e) => e.project_id === p.id && e.direction === "expense")
        .reduce((s, e) => s + Number(e.amount), 0),
    }))
    .sort((a, b) => b.total - a.total);
  const maxProject = Math.max(1, ...byProject.map((x) => x.total));

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">لوحة المتابعة</h1>
        <Button asChild size="sm">
          <Link to="/expenses">
            <IconPlus className="size-4" />
            تسجيل مصروف
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <IconTrendingDown className="size-4" />
              إجمالي المصروفات
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold tabular-nums">{formatMoney(totalOut)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <IconTrendingUp className="size-4" />
              دفعات مستلمة
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold tabular-nums">{formatMoney(totalIn)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">مشروعات نشطة</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold tabular-nums">{activeProjects.length}</CardContent>
        </Card>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-muted-foreground">ابدأ بإنشاء أول مشروع لك، ثم سجّل مصروفاته من أي موقع.</p>
            <Button asChild>
              <Link to="/projects">
                <IconPlus className="size-4" />
                إنشاء مشروع
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">المصروفات حسب المشروع</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {byProject.map(({ project, total }) => (
                <div key={project.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {project.name}
                      <span className="ms-2 text-xs text-muted-foreground">
                        {projectStatusLabel(project.status)}
                      </span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">{formatMoney(total)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(total / maxProject) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">توزيع التصنيفات</CardTitle>
            </CardHeader>
            <CardContent>
              {byCategory.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">لا توجد مصروفات بعد</p>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85}>
                        {byCategory.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatMoney(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {byCategory.map((c, i) => (
                  <span key={c.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    {c.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">أحدث العمليات</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y">
          {expenses.slice(0, 8).map((e) => {
            const project = projects.find((p) => p.id === e.project_id);
            return (
              <div key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {categoryLabel(e.category)}
                    {e.vendor ? ` — ${e.vendor}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {project?.name ?? "—"} · {formatDate(e.spent_at)}
                  </p>
                </div>
                <span
                  className={
                    e.direction === "expense"
                      ? "shrink-0 text-sm font-semibold tabular-nums text-destructive"
                      : "shrink-0 text-sm font-semibold tabular-nums text-green-600"
                  }
                >
                  {e.direction === "expense" ? "−" : "+"}
                  {formatMoney(Number(e.amount))}
                </span>
              </div>
            );
          })}
          {expenses.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">لا توجد عمليات مسجلة بعد</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
