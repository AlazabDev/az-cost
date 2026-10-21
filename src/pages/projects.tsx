import { useState } from "react";
import { IconMapPin, IconPlus, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useData, type Project } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PROJECT_TYPE_LABELS, projectStatusLabel, projectTypeLabel } from "@/lib/labels";
import { formatMoney } from "@/lib/format";

export default function ProjectsPage() {
  const { user } = useAuth();
  const { projects, expenses, loading, refetch } = useData();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("construction");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);

  const totalFor = (p: Project) =>
    expenses
      .filter((e) => e.project_id === p.id && e.direction === "expense")
      .reduce((s, e) => s + Number(e.amount), 0);

  const createProject = async () => {
    if (!user || !name.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("projects").insert({
      user_id: user.id,
      name: name.trim(),
      type,
      location: location.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error("تعذر إنشاء المشروع");
      return;
    }
    toast.success("تم إنشاء المشروع");
    setOpen(false);
    setName("");
    setLocation("");
    void refetch();
  };

  const toggleStatus = async (p: Project) => {
    const next = p.status === "active" ? "completed" : "active";
    const { error } = await supabase.from("projects").update({ status: next }).eq("id", p.id);
    if (error) toast.error("تعذر تحديث الحالة");
    else void refetch();
  };

  const remove = async (p: Project) => {
    const { error } = await supabase.from("projects").delete().eq("id", p.id);
    if (error) toast.error("تعذر حذف المشروع");
    else {
      toast.success("تم حذف المشروع ومصروفاته");
      void refetch();
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">المشروعات</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <IconPlus className="size-4" />
              مشروع جديد
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>مشروع جديد</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>اسم المشروع *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: فيلا التجمع" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>نوع المشروع</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROJECT_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>الموقع (اختياري)</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="مثال: القاهرة الجديدة" />
              </div>
              <Button disabled={busy || !name.trim()} onClick={() => void createProject()}>
                إنشاء
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            لا توجد مشروعات بعد — أنشئ أول مشروع لتبدأ تسجيل المصروفات.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{p.name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      {projectTypeLabel(p.type)}
                      {p.location && (
                        <>
                          · <IconMapPin className="size-3" /> {p.location}
                        </>
                      )}
                    </p>
                  </div>
                  <Badge variant={p.status === "active" ? "default" : "secondary"}>
                    {projectStatusLabel(p.status)}
                  </Badge>
                </div>
                <p className="text-xl font-bold tabular-nums">{formatMoney(totalFor(p))}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => void toggleStatus(p)}>
                    {p.status === "active" ? "إنهاء المشروع" : "إعادة التنشيط"}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <IconTrash className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>حذف المشروع؟</AlertDialogTitle>
                        <AlertDialogDescription>
                          سيُحذف «{p.name}» وكل مصروفاته نهائيًا. لا يمكن التراجع.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void remove(p)}>حذف</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
