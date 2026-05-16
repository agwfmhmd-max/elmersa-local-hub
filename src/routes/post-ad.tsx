import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Upload, X, Crown } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/post-ad")({
  head: () => ({
    meta: [{ title: "نشر إعلان جديد - المرصة" }, { name: "description", content: "انشر إعلانك مجانًا في منصة المرصة." }],
  }),
  component: PostAdPage,
});

const schema = z.object({
  title: z.string().trim().min(3, "العنوان قصير").max(120),
  description: z.string().trim().min(10, "الوصف قصير").max(2000),
  price: z.number().min(0, "السعر غير صالح"),
  whatsapp: z.string().trim().min(6, "رقم غير صالح").max(20),
});

function PostAdPage() {
  const navigate = useNavigate();
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [settings, setSettings] = useState<{ pro_price: number; free_post_enabled: boolean } | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [cityId, setCityId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [newCity, setNewCity] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [addingCity, setAddingCity] = useState(false);
  const [addingCat, setAddingCat] = useState(false);

  useEffect(() => {
    supabase.from("cities").select("id,name").order("name").then(({ data }) => setCities(data || []));
    supabase.from("categories").select("id,name").order("name").then(({ data }) => setCategories(data || []));
    supabase.from("settings").select("pro_price,free_post_enabled").eq("id", 1).single().then(({ data }) => setSettings(data));
  }, []);

  const addCity = async () => {
    const name = newCity.trim();
    if (!name) return;
    const { data, error } = await supabase.from("cities").insert({ name }).select("id,name").single();
    if (error) { toast.error("تعذر إضافة المدينة"); return; }
    setCities((p) => [...p, data].sort((a, b) => a.name.localeCompare(b.name)));
    setCityId(data.id);
    setNewCity("");
    setAddingCity(false);
    toast.success("تمت إضافة المدينة");
  };

  const addCat = async () => {
    const name = newCategory.trim();
    if (!name) return;
    const { data, error } = await supabase.from("categories").insert({ name }).select("id,name").single();
    if (error) { toast.error("تعذر إضافة الفئة"); return; }
    setCategories((p) => [...p, data].sort((a, b) => a.name.localeCompare(b.name)));
    setCategoryId(data.id);
    setNewCategory("");
    setAddingCat(false);
    toast.success("تمت إضافة الفئة");
  };

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...newFiles].slice(0, 8));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ title, description, price: Number(price), whatsapp });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if (!cityId) { toast.error("اختر المدينة"); return; }
    if (!categoryId) { toast.error("اختر الفئة"); return; }
    if (files.length === 0) { toast.error("أضف صورة واحدة على الأقل"); return; }
    if (settings && !settings.free_post_enabled) {
      toast.error("النشر المجاني معطل حاليًا. يرجى الترقية إلى PRO.");
      return;
    }

    setSubmitting(true);
    try {
      // Upload images
      const urls: string[] = [];
      for (const f of files) {
        const ext = f.name.split(".").pop() || "jpg";
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("ads-images").upload(path, f, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("ads-images").getPublicUrl(path);
        urls.push(pub.publicUrl);
      }

      const { data: ad, error } = await supabase.from("ads").insert({
        title: parsed.data.title,
        description: parsed.data.description,
        price: parsed.data.price,
        whatsapp: parsed.data.whatsapp,
        city_id: cityId,
        category_id: categoryId,
        images: urls,
      }).select("id").single();
      if (error) throw error;
      toast.success("تم نشر إعلانك بنجاح");
      navigate({ to: "/ad/$adId", params: { adId: ad.id } });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "حدث خطأ أثناء النشر");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-extrabold">نشر إعلان جديد</h1>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-warning/40 bg-warning/10 p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Crown className="size-5 text-warning" />
          لجعل إعلانك يظهر في الأعلى، انتقل إلى خطة PRO
        </div>
        <Link
          to="/upgrade"
          className="inline-flex items-center gap-1 rounded-md bg-warning px-3 py-2 text-sm font-bold text-warning-foreground shadow hover:opacity-90"
        >
          <Crown className="size-4" /> ترقية إلى PRO
        </Link>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="space-y-1.5">
          <Label>عنوان الإعلان *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: سيارة تويوتا 2018" />
        </div>
        <div className="space-y-1.5">
          <Label>الوصف *</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="تفاصيل الإعلان..." />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>السعر (MRU) *</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label>رقم واتساب *</Label>
            <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="22200000000" dir="ltr" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>المدينة *</Label>
            {addingCity ? (
              <div className="flex gap-2">
                <Input value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="اسم المدينة" />
                <Button type="button" onClick={addCity}>إضافة</Button>
                <Button type="button" variant="ghost" onClick={() => setAddingCity(false)}>إلغاء</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={cityId} onValueChange={setCityId}>
                  <SelectTrigger><SelectValue placeholder="اختر مدينة" /></SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setAddingCity(true)} aria-label="إضافة مدينة">
                  <Plus className="size-4" />
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>الفئة *</Label>
            {addingCat ? (
              <div className="flex gap-2">
                <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="اسم الفئة" />
                <Button type="button" onClick={addCat}>إضافة</Button>
                <Button type="button" variant="ghost" onClick={() => setAddingCat(false)}>إلغاء</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="اختر فئة" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setAddingCat(true)} aria-label="إضافة فئة">
                  <Plus className="size-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>الصور * (حد أقصى 8)</Label>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-muted/30 p-6 text-sm text-muted-foreground hover:bg-muted/50">
            <Upload className="size-6" />
            اضغط لاختيار الصور
            <input type="file" multiple accept="image/*" onChange={onFiles} className="hidden" />
          </label>
          {files.length > 0 && (
            <div className="mt-2 grid grid-cols-4 gap-2">
              {files.map((f, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-md border">
                  <img src={URL.createObjectURL(f)} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))}
                    className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={submitting} size="lg">
          {submitting && <Loader2 className="size-4 animate-spin" />} نشر الإعلان
        </Button>
      </form>
    </div>
  );
}
