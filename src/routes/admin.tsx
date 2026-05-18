import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Star, StarOff, Trash2, CheckCircle2, XCircle, Eye, EyeOff, ZoomIn, ExternalLink, Download } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "لوحة المشرف - المرصة" }] }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [ads, setAds] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  // Extracts the storage object path from a stored URL (signed or public) so we can refresh it.
  const extractProofPath = (url: string): string | null => {
    if (!url) return null;
    if (!url.startsWith("http")) return url; // already a path
    const m = url.match(/\/payment-proofs\/([^?]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  };

  const openProof = async (url: string) => {
    const path = extractProofPath(url);
    if (!path) { setProofPreview(url); return; }
    const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 60 * 60);
    if (error || !data) { toast.error("تعذّر فتح صورة الإثبات"); return; }
    setProofPreview(data.signedUrl);
  };

  const reload = async () => {
    const [{ data: a }, { data: p }, { data: s }] = await Promise.all([
      supabase.from("ads").select("*, city:cities(name), category:categories(name)").order("created_at", { ascending: false }).limit(200),
      supabase.from("payments").select("*, ad:ads(title)").order("created_at", { ascending: false }).limit(200),
      supabase.from("settings").select("*").eq("id", 1).single(),
    ]);
    setAds(a || []); setPayments(p || []); setSettings(s);
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAuthorized(false); navigate({ to: "/" }); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (!roles?.some((r) => r.role === "admin")) { setAuthorized(false); navigate({ to: "/" }); return; }
      setAuthorized(true);
      await reload();
      setLoading(false);
    })();
  }, [navigate]);

  const toggleAdActive = async (id: string, is_active: boolean) => {
    await supabase.from("ads").update({ is_active: !is_active }).eq("id", id);
    toast.success(is_active ? "تم تعطيل الإعلان" : "تم تفعيل الإعلان");
    reload();
  };
  const toggleFeatured = async (id: string, is_featured: boolean) => {
    await supabase.from("ads").update({ is_featured: !is_featured }).eq("id", id);
    toast.success(is_featured ? "تم إزالة التمييز" : "تم تمييز الإعلان");
    reload();
  };
  const deleteAd = async (id: string) => {
    if (!confirm("حذف هذا الإعلان نهائيًا؟")) return;
    await supabase.from("ads").delete().eq("id", id);
    toast.success("تم الحذف");
    reload();
  };

  const approvePayment = async (p: any) => {
    await supabase.from("payments").update({ status: "approved" }).eq("id", p.id);
    await supabase.from("ads").update({ is_featured: true }).eq("id", p.ad_id);
    toast.success("تمت الموافقة والإعلان أصبح مميزًا");
    reload();
  };
  const rejectPayment = async (p: any) => {
    await supabase.from("payments").update({ status: "rejected" }).eq("id", p.id);
    toast.success("تم رفض الطلب");
    reload();
  };

  const saveSettings = async () => {
    const { error } = await supabase.from("settings").update({
      pro_price: Number(settings.pro_price),
      free_post_enabled: settings.free_post_enabled,
      payment_phone: settings.payment_phone,
    }).eq("id", 1);
    if (error) toast.error("فشل الحفظ"); else toast.success("تم حفظ الإعدادات");
  };

  if (authorized === null || loading) return <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-primary" /></div>;
  if (!authorized) return null;

  const pendingCount = payments.filter((p) => p.status === "pending").length;

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="mb-4 text-2xl font-extrabold">لوحة المشرف</h1>
      <Tabs defaultValue="ads">
        <TabsList>
          <TabsTrigger value="ads">الإعلانات ({ads.length})</TabsTrigger>
          <TabsTrigger value="payments">المدفوعات {pendingCount > 0 && <span className="ms-1 rounded-full bg-warning px-2 text-xs text-warning-foreground">{pendingCount}</span>}</TabsTrigger>
          <TabsTrigger value="settings">الإعدادات</TabsTrigger>
        </TabsList>

        <TabsContent value="ads" className="mt-4 space-y-2">
          {ads.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
              <div className="size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                {a.images?.[0] && <img src={a.images[0]} alt="" className="size-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{a.title}</span>
                  {a.is_featured && <Star className="size-4 fill-warning text-warning" />}
                  {!a.is_active && <span className="rounded-full bg-destructive/10 px-2 text-xs text-destructive">معطل</span>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {Number(a.price).toLocaleString("ar-MR")} MRU · {a.city?.name} · {a.category?.name}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => toggleFeatured(a.id, a.is_featured)}>
                  {a.is_featured ? <><StarOff className="size-4" /> إزالة تمييز</> : <><Star className="size-4" /> تمييز</>}
                </Button>
                <Button size="sm" variant="outline" onClick={() => toggleAdActive(a.id, a.is_active)}>
                  {a.is_active ? <><EyeOff className="size-4" /> تعطيل</> : <><Eye className="size-4" /> تفعيل</>}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => deleteAd(a.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="payments" className="mt-4 space-y-2">
          {payments.length === 0 && <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">لا توجد مدفوعات</div>}
          {payments.map((p) => (
            <div key={p.id} className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm sm:flex-row sm:items-start">
              <button
                type="button"
                onClick={() => openProof(p.proof_url)}
                className="group relative h-40 w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:h-32 sm:w-44"
                aria-label="عرض إثبات الدفع"
              >
                <img src={p.proof_url} alt="إثبات الدفع" className="size-full object-contain" loading="lazy" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/40">
                  <ZoomIn className="size-6 text-white opacity-0 transition group-hover:opacity-100" />
                </div>
              </button>
              <div className="flex-1 min-w-0">
                <div className="truncate font-semibold">{p.ad?.title || p.ad_id}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {Number(p.amount).toLocaleString("ar-MR")} MRU · {p.method} ·{" "}
                  <span className={
                    p.status === "approved" ? "text-success" : p.status === "rejected" ? "text-destructive" : "text-warning"
                  }>
                    {p.status === "approved" ? "مقبول" : p.status === "rejected" ? "مرفوض" : "قيد المراجعة"}
                  </span>
                </div>
                {p.notes && <div className="mt-1 text-xs text-muted-foreground">ملاحظة: {p.notes}</div>}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openProof(p.proof_url)}>
                    <ZoomIn className="size-4" /> تكبير الصورة
                  </Button>
                  {p.status === "pending" && (
                    <>
                      <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" onClick={() => approvePayment(p)}>
                        <CheckCircle2 className="size-4" /> موافقة
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => rejectPayment(p)}>
                        <XCircle className="size-4" /> رفض
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <div className="max-w-md space-y-4 rounded-xl border bg-card p-5 shadow-sm">
            <div className="space-y-1.5">
              <Label>سعر PRO (MRU)</Label>
              <Input
                type="number"
                value={settings?.pro_price ?? ""}
                onChange={(e) => setSettings({ ...settings, pro_price: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>رقم الدفع</Label>
              <Input
                value={settings?.payment_phone ?? ""}
                onChange={(e) => setSettings({ ...settings, payment_phone: e.target.value })}
                dir="ltr"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-secondary p-3">
              <div>
                <div className="font-medium">تفعيل النشر المجاني</div>
                <div className="text-xs text-muted-foreground">عند الإيقاف لا يستطيع المستخدمون نشر إعلانات مجانية</div>
              </div>
              <Switch
                checked={!!settings?.free_post_enabled}
                onCheckedChange={(v) => setSettings({ ...settings, free_post_enabled: v })}
              />
            </div>
            <Button onClick={saveSettings} className="w-full">حفظ الإعدادات</Button>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!proofPreview} onOpenChange={(o) => !o && setProofPreview(null)}>
        <DialogContent className="max-w-4xl p-2 sm:p-4">
          <DialogTitle className="sr-only">إثبات الدفع</DialogTitle>
          {proofPreview && (
            <div className="space-y-3">
              <div className="max-h-[80vh] overflow-auto rounded-md bg-muted">
                <img src={proofPreview} alt="إثبات الدفع بحجم كامل" className="mx-auto block max-w-full" />
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <a href={proofPreview} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm"><ExternalLink className="size-4" /> فتح في تبويب جديد</Button>
                </a>
                <a href={proofPreview} download>
                  <Button variant="outline" size="sm"><Download className="size-4" /> تحميل</Button>
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
