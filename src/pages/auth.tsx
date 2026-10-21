import { useState } from "react";
import { Navigate } from "react-router-dom";
import { IconBrandGoogle, IconReceipt2 } from "@tabler/icons-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AuthPage() {
  const { user, loading, signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const run = async (fn: () => Promise<string | null>, success?: string) => {
    setBusy(true);
    const err = await fn();
    setBusy(false);
    if (err) toast.error(err);
    else if (success) toast.success(success);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <span className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <IconReceipt2 className="size-7" />
          </span>
          <CardTitle className="text-2xl">UberFix</CardTitle>
          <CardDescription>سجّل مصروفات مشروعاتك من أي موقع</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">تسجيل الدخول</TabsTrigger>
              <TabsTrigger value="signup">حساب جديد</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input id="email" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input id="password" type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button disabled={busy || !email || !password} onClick={() => void run(() => signIn(email, password))}>
                دخول
              </Button>
              <button
                className="text-sm text-primary hover:underline"
                onClick={() => {
                  if (!email) {
                    toast.error("أدخل بريدك الإلكتروني أولًا");
                    return;
                  }
                  void run(() => resetPassword(email), "أرسلنا لك رابط استعادة كلمة المرور");
                }}
              >
                نسيت كلمة المرور؟
              </button>
            </TabsContent>

            <TabsContent value="signup" className="mt-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">الاسم</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email2">البريد الإلكتروني</Label>
                <Input id="email2" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password2">كلمة المرور</Label>
                <Input id="password2" type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button
                disabled={busy || !email || password.length < 6}
                onClick={() =>
                  void run(
                    () => signUp(email, password, fullName),
                    "تم إنشاء الحساب — تحقق من بريدك لتأكيد الحساب",
                  )
                }
              >
                إنشاء الحساب
              </Button>
            </TabsContent>
          </Tabs>

          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            أو
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => void run(() => signInWithGoogle())}
          >
            <IconBrandGoogle className="size-4" />
            الدخول عبر جوجل
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
