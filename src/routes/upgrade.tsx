import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Crown, Loader2, Upload, X, Copy } from "lucide-react";

export const Route = createFileRoute("/upgrade")({
  head: () => ({
    meta: [{ title: "ترقية إلى PRO - المرصة" }],
  }),
  component: UpgradePage,
});

const PAYMENT_METHODS = ["بنكيلي", "السداد مصرفي", "كليك", "رصيدي", "أمانتي"];

function UpgradePage() {
  const [settings, setSettings] = useState<{ pro_price: number; payment_phone: string } | null>(null);
  const [ads, setAds] = useState<{ id: string; title: string }[]>([]);
  const [adId, setAdId] = useState("");
  const [method, setMethod] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.from("settings").select("pro_price,payment_phone").eq("id", 1).single().then(({ data }) => setSettings(data));
    supabase.from("ads").select("id,title").eq("is_active", true).eq("is_featured", false).order("created_at", { ascending: false }).limit(100).then(({ data }) => setAds(data || []));
  }, []);

  const copyPhone = () => {
    if (!settings) return;
    navigator.clipboard.writeText(settings.payment_phone);
    toast.success("تم نسخ الرقم");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adId) { toast.error("اختر الإعلان المراد ترقيته"); return; }
    if (!method) { toast.error("اختر طريقة الدفع"); return; }
    if (!file) { toast.error("ارفع صورة إثبات الدفع"); return; }
    if (!settings) return;

    setSubmitting(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, file);
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 60 * 60 * 24 * 365);
      const proofUrl = signed?.signedUrl || path;

      const { error } = await supabase.from("payments").insert({
        ad_id: adId,
        amount: settings.pro_price,
        method,
        proof_url: proofUrl,
        notes: notes || null,
      });
      if (error) throw error;

      toast.success("تم إرسال طلب الترقية. سيتم مراجعته من المشرف.");
      setAdId(""); setMethod(""); setFile(null); setNotes("");
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 overflow-hidden rounded-2xl bg-[var(--gradient-primary)] p-6 text-primary-foreground shadow-[var(--shadow-elevated)]">
        <div className="flex items-center gap-3">
          <Crown className="size-8" />
          <div>
            <h1 className="text-2xl font-extrabold">ترقية إلى PRO</h1>
            <p className="text-sm opacity-90">إعلانك يظهر في الأعلى ويتلقى مشاهدات أكثر</p>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-white/15 p-4 text-center backdrop-blur">
          <div className="text-xs opacity-90">سعر الترقية</div>
          <div className="text-4xl font-extrabold">
            {settings ? settings.pro_price.toLocaleString("ar-MR") : "..."} <span className="text-lg">MRU</span>
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-xl border bg-card p-5">
        <h2 className="mb-3 font-bold">طرق الدفع المتاحة</h2>
        <div className="mb-3 flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((m) => (
            <span key={m} className="rounded-full bg-accent px-3 py-1 text-sm text-accent-foreground">{m}</span>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-lg bg-secondary p-3">
          <div>
            <div className="text-xs text-muted-foreground">أرسل المبلغ إلى الرقم</div>
            <div className="text-xl font-extrabold" dir="ltr">{settings?.payment_phone || "..."}</div>
          </div>
          <Button variant="outline" size="sm" onClick={copyPhone}><Copy className="size-4" /> نسخ</Button>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-bold">إرسال إثبات الدفع</h2>
        <div className="space-y-1.5">
          <Label>الإعلان المراد ترقيته *</Label>
          <Select value={adId} onValueChange={setAdId}>
            <SelectTrigger><SelectValue placeholder="اختر إعلانك" /></SelectTrigger>
            <SelectContent>
              {ads.map((a) => <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>طريقة الدفع *</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger><SelectValue placeholder="اختر طريقة الدفع" /></SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>صورة إثبات الدفع *</Label>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-muted/30 p-6 text-sm text-muted-foreground hover:bg-muted/50">
            <Upload className="size-6" />
            اضغط لاختيار صورة الإثبات
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
          </label>
          {file && (
            <div className="relative mt-2 inline-block">
              <img src={URL.createObjectURL(file)} alt="" className="h-32 rounded-md border" />
              <button type="button" onClick={() => setFile(null)} className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground">
                <X className="size-3" />
              </button>
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>ملاحظات (اختياري)</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="رقم العملية، ملاحظة..." />
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />} إرسال طلب الترقية
        </Button>
      </form>
    </div>
  );
}
