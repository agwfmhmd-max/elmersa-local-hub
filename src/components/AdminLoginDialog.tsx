import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

export function AdminLoginDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Try sign in
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // If user does not exist, try signing them up (will get admin role via trigger if email matches)
      if (error.message.toLowerCase().includes("invalid")) {
        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpErr) {
          toast.error("بيانات غير صحيحة");
          setLoading(false);
          return;
        }
        // try sign-in again after sign up
        const { error: e2 } = await supabase.auth.signInWithPassword({ email, password });
        if (e2) {
          toast.error("بيانات غير صحيحة");
          setLoading(false);
          return;
        }
      } else {
        toast.error("بيانات غير صحيحة");
        setLoading(false);
        return;
      }
    }
    // verify admin role
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (!roles?.some((r) => r.role === "admin")) {
        await supabase.auth.signOut();
        toast.error("هذا الحساب لا يملك صلاحيات المشرف");
        setLoading(false);
        return;
      }
    }
    toast.success("مرحبًا بك في لوحة المشرف");
    onOpenChange(false);
    setLoading(false);
    window.location.href = "/admin";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" /> دخول المشرف
          </DialogTitle>
          <DialogDescription>قم بإدخال بيانات المشرف للوصول إلى لوحة التحكم.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">كلمة المرور</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />} دخول
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
