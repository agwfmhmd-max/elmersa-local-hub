import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdCard, type Ad } from "@/components/AdCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, SlidersHorizontal } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "المرصة - إعلانات موريتانيا (بيع، كراء، خدمات)" },
      { name: "description", content: "تصفح آلاف الإعلانات في موريتانيا. سيارات، عقارات، هواتف، خدمات وأكثر." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cityId, setCityId] = useState<string>("all");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  useEffect(() => {
    supabase.from("cities").select("id,name").order("name").then(({ data }) => setCities(data || []));
    supabase.from("categories").select("id,name").order("name").then(({ data }) => setCategories(data || []));
  }, []);

  useEffect(() => {
    const fetchAds = async () => {
      setLoading(true);
      let q = supabase
        .from("ads")
        .select("id,title,description,price,whatsapp,images,is_featured,created_at,city:cities(name),category:categories(name),city_id,category_id")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(60);
      if (cityId !== "all") q = q.eq("city_id", cityId);
      if (categoryId !== "all") q = q.eq("category_id", categoryId);
      if (minPrice) q = q.gte("price", Number(minPrice));
      if (maxPrice) q = q.lte("price", Number(maxPrice));
      const { data } = await q;
      setAds((data as any) || []);
      setLoading(false);
    };
    fetchAds();
  }, [cityId, categoryId, minPrice, maxPrice]);

  const filtered = useMemo(() => {
    if (!search.trim()) return ads;
    const s = search.trim().toLowerCase();
    return ads.filter((a) => a.title.toLowerCase().includes(s) || a.description.toLowerCase().includes(s));
  }, [ads, search]);

  return (
    <div className="container mx-auto px-4 py-6">
      <section className="mb-6 overflow-hidden rounded-2xl bg-[var(--gradient-primary)] p-6 text-primary-foreground shadow-[var(--shadow-elevated)] sm:p-10">
        <h1 className="text-2xl font-extrabold sm:text-4xl">منصة المرصة</h1>
        <p className="mt-2 max-w-2xl text-sm opacity-90 sm:text-base">
          أكبر منصة إعلانات في موريتانيا: بيع، كراء، خدمات. انشر إعلانك مجانًا الآن.
        </p>
      </section>

      <div className="mb-4 grid gap-2 rounded-xl border bg-card p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative lg:col-span-2">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="ابحث عن إعلان..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
        </div>
        <Select value={cityId} onValueChange={setCityId}>
          <SelectTrigger><SelectValue placeholder="المدينة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المدن</SelectItem>
            {cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger><SelectValue placeholder="الفئة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الفئات</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="number" placeholder="السعر من" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
        <Input type="number" placeholder="إلى" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
          <SlidersHorizontal className="mx-auto mb-3 size-8" />
          لا توجد إعلانات مطابقة.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((ad) => <AdCard key={ad.id} ad={ad} />)}
        </div>
      )}
    </div>
  );
}
